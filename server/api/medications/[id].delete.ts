import { eq, and } from 'drizzle-orm'
import { useDb } from '~~/server/database'
import { medications, familyMembers } from '~~/server/database/schema'
import { requireAuth } from '~~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const id = getRouterParam(event, 'id')!
  const db = useDb()

  // Verify ownership
  const [existing] = await db
    .select({ id: medications.id })
    .from(medications)
    .innerJoin(familyMembers, eq(medications.familyMemberId, familyMembers.id))
    .where(and(eq(medications.id, id), eq(familyMembers.userId, user.id)))
    .limit(1)

  if (!existing) {
    throw createError({ statusCode: 404, statusMessage: 'Medication not found' })
  }

  await db.delete(medications).where(eq(medications.id, id))

  return { success: true }
})
