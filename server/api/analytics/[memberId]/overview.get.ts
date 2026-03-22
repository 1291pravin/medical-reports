import { eq, and, sql } from 'drizzle-orm'
import { useDb } from '~~/server/database'
import { familyMembers, documents, medications, conditions, labResults, weightLogs } from '~~/server/database/schema'
import { requireAuth } from '~~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const db = useDb()
  const memberId = getRouterParam(event, 'memberId')!

  // Verify member belongs to user
  const [member] = await db
    .select({
      id: familyMembers.id,
      name: familyMembers.name,
      weightKg: familyMembers.weightKg,
      heightCm: familyMembers.heightCm,
      dob: familyMembers.dob,
      bloodGroup: familyMembers.bloodGroup,
    })
    .from(familyMembers)
    .where(and(eq(familyMembers.id, memberId), eq(familyMembers.userId, user.id)))
    .limit(1)

  if (!member) {
    throw createError({ statusCode: 404, statusMessage: 'Member not found' })
  }

  const [counts] = await db
    .select({
      documentCount: sql<number>`(SELECT count(*) FROM documents WHERE family_member_id = ${memberId})::int`,
      activeMedCount: sql<number>`(SELECT count(*) FROM medications WHERE family_member_id = ${memberId} AND is_active = true)::int`,
      activeConditions: sql<number>`(SELECT count(*) FROM conditions WHERE family_member_id = ${memberId} AND status = 'active')::int`,
      resolvedConditions: sql<number>`(SELECT count(*) FROM conditions WHERE family_member_id = ${memberId} AND status = 'resolved')::int`,
      monitoringConditions: sql<number>`(SELECT count(*) FROM conditions WHERE family_member_id = ${memberId} AND status = 'monitoring')::int`,
      labTestCount: sql<number>`(SELECT count(DISTINCT test_name) FROM lab_results WHERE family_member_id = ${memberId})::int`,
      weightLogCount: sql<number>`(SELECT count(*) FROM weight_logs WHERE family_member_id = ${memberId})::int`,
      lastDocumentDate: sql<string>`(SELECT max(created_at)::text FROM documents WHERE family_member_id = ${memberId})`,
    })
    .from(sql`(SELECT 1) as dummy`)

  const weight = member.weightKg ? Number(member.weightKg) : null
  const height = member.heightCm ? Number(member.heightCm) : null
  const bmi = weight && height ? +(weight / ((height / 100) ** 2)).toFixed(1) : null

  return {
    member: {
      ...member,
      weightKg: weight,
      heightCm: height,
      bmi,
    },
    counts,
  }
})
