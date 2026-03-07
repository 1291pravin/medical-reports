import { eq, and, desc } from 'drizzle-orm'
import { useDb } from '~~/server/database'
import { medications, familyMembers, documents } from '~~/server/database/schema'
import { requireAuth } from '~~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const db = useDb()
  const query = getQuery(event)
  const memberId = query.memberId as string | undefined
  const activeOnly = query.active !== 'false'

  const conditions: any[] = [eq(familyMembers.userId, user.id)]

  if (memberId) {
    conditions.push(eq(medications.familyMemberId, memberId))
  }
  if (activeOnly) {
    conditions.push(eq(medications.isActive, true))
  }

  const meds = await db
    .select({
      id: medications.id,
      familyMemberId: medications.familyMemberId,
      memberName: familyMembers.name,
      documentId: medications.documentId,
      documentTitle: documents.title,
      name: medications.name,
      dosage: medications.dosage,
      frequency: medications.frequency,
      startDate: medications.startDate,
      endDate: medications.endDate,
      purpose: medications.purpose,
      isActive: medications.isActive,
      createdAt: medications.createdAt,
    })
    .from(medications)
    .innerJoin(familyMembers, eq(medications.familyMemberId, familyMembers.id))
    .leftJoin(documents, eq(medications.documentId, documents.id))
    .where(and(...conditions))
    .orderBy(desc(medications.createdAt))

  return meds
})
