import { eq, and } from 'drizzle-orm'
import { useDb } from '~~/server/database'
import { followUps, familyMembers } from '~~/server/database/schema'
import { requireAuth } from '~~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const id = getRouterParam(event, 'id')!
  const db = useDb()

  // Verify ownership
  const [existing] = await db
    .select({ id: followUps.id })
    .from(followUps)
    .innerJoin(familyMembers, eq(followUps.familyMemberId, familyMembers.id))
    .where(and(eq(followUps.id, id), eq(familyMembers.userId, user.id)))
    .limit(1)

  if (!existing) {
    throw createError({ statusCode: 404, statusMessage: 'Follow-up not found' })
  }

  await db.delete(followUps).where(eq(followUps.id, id))

  return { success: true }
})
