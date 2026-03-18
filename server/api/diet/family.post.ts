import { z } from 'zod'
import { eq, and } from 'drizzle-orm'
import { requireAuth } from '~~/server/utils/auth'
import { gatherDietContext, type DietContext } from '~~/server/utils/health-context'
import { useAIProvider } from '~~/server/utils/ai-provider'
import { useDb } from '~~/server/database'
import { familyMembers } from '~~/server/database/schema'
import { familyDietPlanSchema } from '~~/server/utils/family-diet'

const bodySchema = z.object({
  days: z.union([z.literal(1), z.literal(7), z.literal(30)]),
  memberIds: z.array(z.string().uuid()).optional(),
  instructions: z.string().trim().max(2000).optional(),
})

function getFamilyDietPrompt(days: number, instructions?: string): string {
  const today = new Date().toISOString().split('T')[0]
  return `Today's date is ${today}. You are a certified family nutritionist AI. Generate a unified family diet plan that accommodates ALL family members' health needs.

IMPORTANT RULES:
- Find a common diet base that works for ALL members. If one member is vegetarian, the shared meals should be vegetarian (individual members can add non-veg sides if their preference allows)
- Account for ALL allergies across all members — shared meals must be safe for everyone
- Consider all medical conditions and medications across members
- Note per-person portion adjustments based on age, weight, and calorie needs
- Mark any meal modifications needed for specific members (e.g., "reduce salt for Mom", "extra protein for Dad")
- Make meals practical for family cooking — one base meal with individual modifications

Generate a ${days}-day family diet plan.

${instructions?.trim()
    ? `Additional user instructions:
${instructions.trim()}

Follow these instructions if they do not conflict with any family member's medical needs, allergies, medications, or the required JSON schema.

`
    : ''}Return JSON with this exact structure:
{
  "overview": "Brief summary of the family diet approach",
  "familyConstraints": {
    "commonDietBase": "vegetarian/vegan/mixed based on strictest member preference",
    "combinedAllergies": ["all allergens to avoid across all members"],
    "specialConsiderations": ["per-member notes like 'low sodium for X', 'high fiber for Y'"]
  },
  "days": [
    {
      "day": 1,
      "meals": {
        "breakfast": {
          "time": "8:00 AM",
          "sharedItems": ["items everyone eats"],
          "memberModifications": [{ "member": "name", "modification": "what to add/remove/adjust" }],
          "notes": "optional cooking tip"
        },
        "lunch": {
          "time": "12:30 PM",
          "sharedItems": ["..."],
          "memberModifications": [{ "member": "name", "modification": "..." }],
          "notes": "optional"
        },
        "snack": {
          "time": "4:00 PM",
          "sharedItems": ["..."],
          "memberModifications": [{ "member": "name", "modification": "..." }],
          "notes": "optional"
        },
        "dinner": {
          "time": "7:30 PM",
          "sharedItems": ["..."],
          "memberModifications": [{ "member": "name", "modification": "..." }],
          "notes": "optional"
        }
      }
    }
  ],
  "shoppingTips": ["practical tips for family meal prep"],
  "perMemberNotes": [{ "member": "name", "dailyCalories": "range", "keyFocus": "what to prioritize" }]
}

${days === 1 ? 'Provide 1 detailed day.' : days === 7 ? 'Provide 7 days with variety.' : 'Provide a 30-day plan grouped into 4 weeks.'}

IMPORTANT: Return ONLY valid JSON, no markdown fences, no extra text.`
}

function formatMemberContext(ctx: DietContext): string {
  return `- ${ctx.member.name}: Age ${ctx.member.age ?? '?'}, ${ctx.member.weightKg ? `${ctx.member.weightKg}kg` : 'weight unknown'}, BMI ${ctx.member.bmi ?? '?'} (${ctx.member.bmiCategory ?? '?'}), Diet: ${ctx.member.dietPreference ?? 'unspecified'}, Allergies: ${ctx.member.allergies.length ? ctx.member.allergies.join(', ') : 'none'}, Conditions: ${ctx.conditions.length ? ctx.conditions.map(c => c.name).join(', ') : 'none'}, Medications: ${ctx.medications.length ? ctx.medications.map(m => m.name).join(', ') : 'none'}${ctx.latestSummaryExcerpt ? `, Summary: ${ctx.latestSummaryExcerpt}` : ''}`
}

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const { days, memberIds, instructions } = await readValidatedBody(event, bodySchema.parse)

  const db = useDb()
  let allMembers = await db
    .select({ id: familyMembers.id, name: familyMembers.name })
    .from(familyMembers)
    .where(and(eq(familyMembers.userId, user.id), eq(familyMembers.isActive, true)))
    .orderBy(familyMembers.name)

  // Filter to selected members if provided
  if (memberIds?.length) {
    allMembers = allMembers.filter(m => memberIds.includes(m.id))
  }

  const members = allMembers

  if (!members.length) {
    throw createError({ statusCode: 400, statusMessage: 'No family members found' })
  }

  // Gather diet contexts for all members in parallel
  const contexts = await Promise.all(members.map(m => gatherDietContext(m.id)))

  const contextStr = `Family Members (${contexts.length}):\n${contexts.map(formatMemberContext).join('\n')}`

  const ai = useAIProvider()
  const result = await ai.generateJSON(getFamilyDietPrompt(days, instructions), contextStr)
  return familyDietPlanSchema.parse(result)
})
