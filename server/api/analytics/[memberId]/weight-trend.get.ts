import { eq, and, asc } from 'drizzle-orm'
import { useDb } from '~~/server/database'
import { familyMembers, weightLogs } from '~~/server/database/schema'
import { requireAuth } from '~~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const db = useDb()
  const memberId = getRouterParam(event, 'memberId')!

  // Verify member belongs to user
  const [member] = await db
    .select({ id: familyMembers.id, weightKg: familyMembers.weightKg, heightCm: familyMembers.heightCm })
    .from(familyMembers)
    .where(and(eq(familyMembers.id, memberId), eq(familyMembers.userId, user.id)))
    .limit(1)

  if (!member) {
    throw createError({ statusCode: 404, statusMessage: 'Member not found' })
  }

  const logs = await db
    .select({
      id: weightLogs.id,
      weightKg: weightLogs.weightKg,
      recordedAt: weightLogs.recordedAt,
      source: weightLogs.source,
    })
    .from(weightLogs)
    .where(eq(weightLogs.familyMemberId, memberId))
    .orderBy(asc(weightLogs.recordedAt))

  const heightCm = member.heightCm ? Number(member.heightCm) : null

  return logs.map((log) => {
    const weight = Number(log.weightKg)
    const bmi = heightCm ? +(weight / ((heightCm / 100) ** 2)).toFixed(1) : null
    return {
      ...log,
      weightKg: weight,
      bmi,
    }
  })
})
