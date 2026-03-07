import { eq, and, sql } from 'drizzle-orm'
import { useDb } from '~~/server/database'
import { conditions, familyMembers, documentConditions } from '~~/server/database/schema'
import { requireAuth } from '~~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const db = useDb()
  const query = getQuery(event)
  const memberId = query.memberId as string | undefined

  const filters: any[] = [eq(familyMembers.userId, user.id)]

  if (memberId) {
    filters.push(eq(conditions.familyMemberId, memberId))
  }

  const result = await db
    .select({
      id: conditions.id,
      familyMemberId: conditions.familyMemberId,
      memberName: familyMembers.name,
      name: conditions.name,
      firstDetected: conditions.firstDetected,
      status: conditions.status,
      notes: conditions.notes,
      documentCount: sql<number>`(SELECT count(*) FROM document_conditions WHERE document_conditions.condition_id = ${conditions.id})::int`,
    })
    .from(conditions)
    .innerJoin(familyMembers, eq(conditions.familyMemberId, familyMembers.id))
    .where(and(...filters))
    .orderBy(conditions.name)

  return result
})
