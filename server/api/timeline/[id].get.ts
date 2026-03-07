import { eq, and, desc } from 'drizzle-orm'
import { useDb } from '~~/server/database'
import { timelineEvents, familyMembers, documents } from '~~/server/database/schema'
import { requireAuth } from '~~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const memberId = getRouterParam(event, 'id')!
  const db = useDb()

  // Verify member belongs to user
  const [member] = await db
    .select({ id: familyMembers.id })
    .from(familyMembers)
    .where(
      and(eq(familyMembers.id, memberId), eq(familyMembers.userId, user.id)),
    )
    .limit(1)

  if (!member) {
    throw createError({ statusCode: 404, statusMessage: 'Member not found' })
  }

  const events = await db
    .select({
      id: timelineEvents.id,
      title: timelineEvents.title,
      eventDate: timelineEvents.eventDate,
      category: timelineEvents.category,
      description: timelineEvents.description,
      sourceType: timelineEvents.sourceType,
      documentId: timelineEvents.documentId,
      documentTitle: documents.title,
      createdAt: timelineEvents.createdAt,
    })
    .from(timelineEvents)
    .leftJoin(documents, eq(timelineEvents.documentId, documents.id))
    .where(eq(timelineEvents.familyMemberId, memberId))
    .orderBy(desc(timelineEvents.eventDate))

  return events
})
