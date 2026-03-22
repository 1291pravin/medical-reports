import { eq, and } from 'drizzle-orm'
import { useDb } from '~~/server/database'
import { appointments, familyMembers } from '~~/server/database/schema'
import { requireAuth } from '~~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const id = getRouterParam(event, 'id')!
  const db = useDb()

  // Verify ownership
  const [existing] = await db
    .select({ id: appointments.id })
    .from(appointments)
    .innerJoin(familyMembers, eq(appointments.familyMemberId, familyMembers.id))
    .where(and(eq(appointments.id, id), eq(familyMembers.userId, user.id)))
    .limit(1)

  if (!existing) {
    throw createError({ statusCode: 404, statusMessage: 'Appointment not found' })
  }

  await db.delete(appointments).where(eq(appointments.id, id))

  return { success: true }
})
