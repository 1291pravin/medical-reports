import { eq, and, desc } from 'drizzle-orm'
import { useDb } from '~~/server/database'
import { memberHealthSummaries, familyMembers } from '~~/server/database/schema'
import { requireAuth } from '~~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const id = getRouterParam(event, 'id')!
  const db = useDb()

  // Verify member belongs to user
  const [member] = await db
    .select({ id: familyMembers.id })
    .from(familyMembers)
    .where(and(eq(familyMembers.id, id), eq(familyMembers.userId, user.id)))
    .limit(1)

  if (!member) {
    throw createError({ statusCode: 404, statusMessage: 'Member not found' })
  }

  const [summary] = await db
    .select()
    .from(memberHealthSummaries)
    .where(eq(memberHealthSummaries.familyMemberId, id))
    .orderBy(desc(memberHealthSummaries.version), desc(memberHealthSummaries.createdAt))
    .limit(1)

  if (!summary) return null

  // Parse summaryText from JSON string to object, handle old plain-text format
  let parsedSummaryText: any = summary.summaryText
  if (typeof summary.summaryText === 'string') {
    try {
      parsedSummaryText = JSON.parse(summary.summaryText)
    } catch {
      // Old plain-text format - wrap in structured object
      parsedSummaryText = { executiveSummary: summary.summaryText }
    }
  }

  return {
    ...summary,
    summaryText: parsedSummaryText,
  }
})
