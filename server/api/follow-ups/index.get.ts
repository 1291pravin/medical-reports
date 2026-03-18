import { eq, and, desc, asc, isNull } from 'drizzle-orm'
import { useDb } from '~~/server/database'
import { followUps, familyMembers, documents } from '~~/server/database/schema'
import { requireAuth } from '~~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const db = useDb()
  const query = getQuery(event)
  const memberId = query.memberId as string | undefined
  const status = query.status as string | undefined

  const conditions: any[] = [eq(familyMembers.userId, user.id)]

  if (memberId) {
    conditions.push(eq(followUps.familyMemberId, memberId))
  }
  if (status && status !== 'all') {
    conditions.push(eq(followUps.status, status as any))
  } else if (!status) {
    conditions.push(eq(followUps.status, 'pending'))
  }

  const results = await db
    .select({
      id: followUps.id,
      familyMemberId: followUps.familyMemberId,
      memberName: familyMembers.name,
      documentId: followUps.documentId,
      documentTitle: documents.title,
      title: followUps.title,
      dueDate: followUps.dueDate,
      instructions: followUps.instructions,
      doctorName: followUps.doctorName,
      hospitalName: followUps.hospitalName,
      status: followUps.status,
      sourceType: followUps.sourceType,
      completedAt: followUps.completedAt,
      createdAt: followUps.createdAt,
    })
    .from(followUps)
    .innerJoin(familyMembers, eq(followUps.familyMemberId, familyMembers.id))
    .leftJoin(documents, eq(followUps.documentId, documents.id))
    .where(and(...conditions))
    .orderBy(asc(followUps.dueDate))

  return results
})
