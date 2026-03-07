import { z } from 'zod'
import { requireAuth } from '~~/server/utils/auth'
import { gatherDietContext } from '~~/server/utils/health-context'
import { useAIProvider } from '~~/server/utils/ai-provider'
import { useDb } from '~~/server/database'
import { familyMembers } from '~~/server/database/schema'
import { eq, and } from 'drizzle-orm'

const bodySchema = z.object({
  days: z.union([z.literal(1), z.literal(7), z.literal(30)]),
})

function getDietPlanPrompt(days: number): string {
  const today = new Date().toISOString().split('T')[0]
  return `Today's date is ${today}. You are a certified nutritionist AI. Generate a personalized diet plan based on the patient's health profile.

IMPORTANT RULES:
- Respect the patient's diet preference strictly (vegetarian, vegan, non-vegetarian, eggetarian)
- Account for allergies — NEVER include allergens
- Consider medical conditions and medications (e.g., low sodium for hypertension, low sugar for diabetes, avoid grapefruit with statins)
- Be specific with portion sizes and meal timings
- Include hydration recommendations
- Make meals practical and culturally diverse

Generate a ${days}-day diet plan.

Return JSON with this exact structure:
{
  "overview": "Brief 2-3 sentence summary of the diet approach and goals",
  "dailyCalorieTarget": "estimated daily calorie range",
  "keyGuidelines": ["list of 3-5 important dietary guidelines based on their conditions"],
  "days": [
    {
      "day": 1,
      "meals": {
        "earlyMorning": { "time": "6:30 AM", "items": ["warm lemon water", "5 soaked almonds"], "notes": "optional note" },
        "breakfast": { "time": "8:00 AM", "items": ["..."], "notes": "optional" },
        "midMorningSnack": { "time": "10:30 AM", "items": ["..."], "notes": "optional" },
        "lunch": { "time": "12:30 PM", "items": ["..."], "notes": "optional" },
        "eveningSnack": { "time": "4:00 PM", "items": ["..."], "notes": "optional" },
        "dinner": { "time": "7:30 PM", "items": ["..."], "notes": "optional" }
      },
      "hydration": "Water/fluid intake recommendation for the day",
      "supplements": ["any supplements recommended based on conditions"]
    }
  ],
  "foodsToAvoid": ["list of foods to avoid given conditions, medications, and allergies"],
  "foodsToFavor": ["list of foods especially beneficial for their conditions"]
}

${days === 1 ? 'Provide 1 detailed day.' : days === 7 ? 'Provide 7 days with variety. Do not repeat the same meals across days.' : 'Provide a 30-day plan. Group into 4 weeks. Ensure good weekly variety. You can reuse some meals across weeks but vary them.'}

IMPORTANT: Return ONLY valid JSON, no markdown fences, no extra text.`
}

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const id = getRouterParam(event, 'id')!
  const { days } = await readValidatedBody(event, bodySchema.parse)

  // Verify member belongs to user
  const db = useDb()
  const [member] = await db
    .select({ id: familyMembers.id })
    .from(familyMembers)
    .where(and(eq(familyMembers.id, id), eq(familyMembers.userId, user.id)))
    .limit(1)

  if (!member) {
    throw createError({ statusCode: 404, statusMessage: 'Member not found' })
  }

  const ctx = await gatherDietContext(id)
  const ai = useAIProvider()

  const contextStr = `Patient Profile:
- Name: ${ctx.member.name}
- Age: ${ctx.member.age ?? 'Unknown'}
- Weight: ${ctx.member.weightKg ? `${ctx.member.weightKg} kg` : 'Unknown'}
- Height: ${ctx.member.heightCm ? `${ctx.member.heightCm} cm` : 'Unknown'}
- BMI: ${ctx.member.bmi ?? 'Unknown'} (${ctx.member.bmiCategory ?? 'Unknown'})
- Blood Group: ${ctx.member.bloodGroup ?? 'Unknown'}
- Diet Preference: ${ctx.member.dietPreference ?? 'No preference specified'}
- Allergies: ${ctx.member.allergies.length ? ctx.member.allergies.join(', ') : 'None known'}

Active Conditions: ${ctx.conditions.length ? ctx.conditions.map(c => `${c.name} (${c.status})`).join(', ') : 'None'}

Active Medications: ${ctx.medications.length ? ctx.medications.map(m => `${m.name}${m.dosage ? ` ${m.dosage}` : ''}${m.purpose ? ` — ${m.purpose}` : ''}`).join('; ') : 'None'}

Health Summary: ${ctx.latestSummaryExcerpt ?? 'No summary available'}`

  const result = await ai.generateJSON(getDietPlanPrompt(days), contextStr)
  return result
})
