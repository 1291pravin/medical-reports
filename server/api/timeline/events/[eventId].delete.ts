import { eq, and } from 'drizzle-orm'
import { useDb } from '~~/server/database'
import { timelineEvents, familyMembers } from '~~/server/database/schema'
import { requireAuth } from '~~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const eventId = getRouterParam(event, 'eventId')!
  const db = useDb()

  // Verify event belongs to user's member
  const [evt] = await db
    .select({
      id: timelineEvents.id,
      familyMemberId: timelineEvents.familyMemberId,
    })
    .from(timelineEvents)
    .innerJoin(familyMembers, eq(timelineEvents.familyMemberId, familyMembers.id))
    .where(
      and(eq(timelineEvents.id, eventId), eq(familyMembers.userId, user.id)),
    )
    .limit(1)

  if (!evt) {
    throw createError({ statusCode: 404, statusMessage: 'Event not found' })
  }

  await db.delete(timelineEvents).where(eq(timelineEvents.id, eventId))

  return { success: true }
})
