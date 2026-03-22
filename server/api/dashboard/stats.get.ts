import { eq, and, sql } from 'drizzle-orm'
import { useDb } from '~~/server/database'
import { familyMembers, documents, medications, followUps } from '~~/server/database/schema'
import { requireAuth } from '~~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const db = useDb()

  const memberIds = db
    .select({ id: familyMembers.id })
    .from(familyMembers)
    .where(and(eq(familyMembers.userId, user.id), eq(familyMembers.isActive, true)))

  const [stats] = await db
    .select({
      totalMembers: sql<number>`(
        SELECT count(*) FROM family_members
        WHERE family_members.user_id = ${user.id} AND family_members.is_active = true
      )::int`,
      totalDocuments: sql<number>`(
        SELECT count(*) FROM documents
        WHERE documents.family_member_id IN (
          SELECT id FROM family_members WHERE user_id = ${user.id} AND is_active = true
        )
      )::int`,
      activeMedications: sql<number>`(
        SELECT count(*) FROM medications
        WHERE medications.is_active = true AND medications.family_member_id IN (
          SELECT id FROM family_members WHERE user_id = ${user.id} AND is_active = true
        )
      )::int`,
      pendingFollowUps: sql<number>`(
        SELECT count(*) FROM follow_ups
        WHERE follow_ups.status = 'pending' AND follow_ups.family_member_id IN (
          SELECT id FROM family_members WHERE user_id = ${user.id} AND is_active = true
        )
      )::int`,
    })
    .from(sql`(SELECT 1) as dummy`)

  return stats
})
