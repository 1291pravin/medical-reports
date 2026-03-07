import { eq, and } from 'drizzle-orm'
import { useDb } from '~~/server/database'
import { familyMembers } from '~~/server/database/schema'
import { requireAuth } from '~~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const id = getRouterParam(event, 'id')!
  const db = useDb()

  const [archived] = await db
    .update(familyMembers)
    .set({ isActive: false })
    .where(
      and(eq(familyMembers.id, id), eq(familyMembers.userId, user.id)),
    )
    .returning()

  if (!archived) {
    throw createError({ statusCode: 404, statusMessage: 'Member not found' })
  }

  return { success: true }
})
