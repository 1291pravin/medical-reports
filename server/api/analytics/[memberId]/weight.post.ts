import { eq, and } from 'drizzle-orm'
import { z } from 'zod'
import { useDb } from '~~/server/database'
import { familyMembers, weightLogs } from '~~/server/database/schema'
import { requireAuth } from '~~/server/utils/auth'

const schema = z.object({
  weightKg: z.number().positive().max(500),
  recordedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
})

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const db = useDb()
  const memberId = getRouterParam(event, 'memberId')!
  const body = await readValidatedBody(event, schema.parse)

  // Verify member belongs to user
  const [member] = await db
    .select({ id: familyMembers.id })
    .from(familyMembers)
    .where(and(eq(familyMembers.id, memberId), eq(familyMembers.userId, user.id)))
    .limit(1)

  if (!member) {
    throw createError({ statusCode: 404, statusMessage: 'Member not found' })
  }

  const [log] = await db
    .insert(weightLogs)
    .values({
      familyMemberId: memberId,
      weightKg: String(body.weightKg),
      recordedAt: body.recordedAt,
      source: 'manual',
    })
    .returning()

  // Also update the member's current weight
  await db
    .update(familyMembers)
    .set({ weightKg: String(body.weightKg) })
    .where(eq(familyMembers.id, memberId))

  return log
})
