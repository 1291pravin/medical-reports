import { eq, and } from 'drizzle-orm'
import { useDb } from '~~/server/database'
import { chatMessages, familyMembers } from '~~/server/database/schema'
import { requireAuth } from '~~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const memberId = getRouterParam(event, 'memberId')!
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

  await db
    .delete(chatMessages)
    .where(
      and(
        eq(chatMessages.familyMemberId, memberId),
        eq(chatMessages.userId, user.id),
      ),
    )

  return { success: true }
})
