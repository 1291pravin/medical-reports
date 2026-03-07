import { z } from 'zod'
import { eq, and, desc } from 'drizzle-orm'
import { useDb } from '~~/server/database'
import { chatMessages, familyMembers } from '~~/server/database/schema'
import { requireAuth } from '~~/server/utils/auth'
import { useAIProvider } from '~~/server/utils/ai-provider'
import { gatherLightHealthContext, fetchDocumentDetails } from '~~/server/utils/health-context'

const sendSchema = z.object({
  memberId: z.string().uuid(),
  message: z.string().min(1).max(2000),
})

// Match user message against document titles to find relevant docs
function findRelevantDocIds(
  message: string,
  docs: { id: string; title: string; category: string | null; reportDate: string | null }[],
): string[] {
  const msgLower = message.toLowerCase()
  const matched: string[] = []

  for (const doc of docs) {
    const titleWords = doc.title.toLowerCase().split(/\s+/).filter((w) => w.length > 3)
    const categoryMatch = doc.category && msgLower.includes(doc.category.replace('_', ' '))
    const dateMatch = doc.reportDate && msgLower.includes(doc.reportDate)
    const titleMatch = titleWords.some((word) => msgLower.includes(word))

    if (categoryMatch || dateMatch || titleMatch) {
      matched.push(doc.id)
    }
  }

  // Also fetch details if user asks generic questions about reports/results/tests
  if (!matched.length) {
    const genericTerms = ['report', 'result', 'test', 'lab', 'blood', 'scan', 'prescription', 'latest', 'recent', 'last']
    const asksAboutReports = genericTerms.some((term) => msgLower.includes(term))
    if (asksAboutReports && docs.length > 0) {
      // Include the most recent 3 documents
      return docs.slice(0, 3).map((d) => d.id)
    }
  }

  return matched.slice(0, 5) // Cap at 5 to manage context size
}

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const body = await readValidatedBody(event, sendSchema.parse)
  const db = useDb()

  // Verify member belongs to user
  const [member] = await db
    .select({ id: familyMembers.id, name: familyMembers.name })
    .from(familyMembers)
    .where(
      and(eq(familyMembers.id, body.memberId), eq(familyMembers.userId, user.id)),
    )
    .limit(1)

  if (!member) {
    throw createError({ statusCode: 404, statusMessage: 'Member not found' })
  }

  // Save user message
  await db
    .insert(chatMessages)
    .values({
      familyMemberId: body.memberId,
      userId: user.id,
      role: 'user',
      content: body.message,
    })

  // Gather lightweight context (no full report content)
  const ctx = await gatherLightHealthContext(body.memberId)

  // Fetch full details only for documents relevant to the user's message
  const relevantIds = findRelevantDocIds(body.message, ctx.documents)
  const relevantDetails = await fetchDocumentDetails(relevantIds)

  // Fetch last 20 messages for conversation continuity
  const history = await db
    .select({ role: chatMessages.role, content: chatMessages.content })
    .from(chatMessages)
    .where(
      and(
        eq(chatMessages.familyMemberId, body.memberId),
        eq(chatMessages.userId, user.id),
      ),
    )
    .orderBy(desc(chatMessages.createdAt))
    .limit(20)

  const conversationHistory = history.reverse()

  // Build compact document list for context
  const docList = ctx.documents.map((d) =>
    `- "${d.title}" (${d.category || 'unknown'}, ${d.reportDate || 'no date'})`,
  ).join('\n')

  // Build detailed section only for relevant documents
  let detailedSection = ''
  if (relevantDetails.length) {
    detailedSection = `\n\nDetailed data for relevant reports:\n${JSON.stringify(relevantDetails, null, 2)}`
  }

  const systemPrompt = `You are a knowledgeable health assistant for ${ctx.member.name}. Today's date is ${new Date().toISOString().split('T')[0]}.

Patient profile:
- Age: ${ctx.member.age || 'unknown'}, Blood group: ${ctx.member.bloodGroup || 'unknown'}
- Allergies: ${ctx.member.allergies?.length ? ctx.member.allergies.join(', ') : 'none known'}
- Diet: ${ctx.member.dietPreference || 'not specified'}

Conditions: ${ctx.conditions.length ? ctx.conditions.map((c) => `${c.name} (${c.status})`).join(', ') : 'none'}

Active medications: ${ctx.medications.length ? ctx.medications.map((m) => `${m.name}${m.dosage ? ` ${m.dosage}` : ''}${m.frequency ? ` ${m.frequency}` : ''}`).join(', ') : 'none'}

${ctx.latestSummaryExcerpt ? `Health summary: ${ctx.latestSummaryExcerpt}` : ''}

Available reports (${ctx.documents.length} total):
${docList || 'No reports uploaded yet.'}${detailedSection}

Guidelines:
- Answer health questions based on the patient's actual data
- Be helpful, clear, and conversational
- If asked about something not in the data, say so honestly
- Never diagnose - suggest consulting a doctor for medical decisions
- Reference specific conditions, medications, or lab values when relevant
- Keep responses concise but thorough`

  const provider = useAIProvider()
  const assistantContent = await provider.chat(
    systemPrompt,
    conversationHistory.map((msg) => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
    })),
  )

  // Save assistant response
  const [assistantMsg] = await db
    .insert(chatMessages)
    .values({
      familyMemberId: body.memberId,
      userId: user.id,
      role: 'assistant',
      content: assistantContent,
    })
    .returning()

  return assistantMsg
})
