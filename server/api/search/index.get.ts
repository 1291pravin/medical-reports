import { eq, and, or, ilike, desc } from 'drizzle-orm'
import { useDb } from '~~/server/database'
import {
  documents,
  familyMembers,
  aiSummaries,
  medications,
  conditions,
} from '~~/server/database/schema'
import { requireAuth } from '~~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const db = useDb()
  const query = getQuery(event)

  const q = (query.q as string || '').trim()
  const memberId = query.memberId as string | undefined

  if (!q) {
    return { documents: [], medications: [], conditions: [] }
  }

  const searchPattern = `%${q}%`

  // Search documents
  const docFilters: any[] = [eq(familyMembers.userId, user.id)]
  if (memberId) docFilters.push(eq(documents.familyMemberId, memberId))

  const matchedDocs = await db
    .select({
      id: documents.id,
      familyMemberId: documents.familyMemberId,
      memberName: familyMembers.name,
      title: documents.title,
      category: documents.category,
      reportDate: documents.reportDate,
      summary: aiSummaries.summary,
    })
    .from(documents)
    .innerJoin(familyMembers, eq(documents.familyMemberId, familyMembers.id))
    .leftJoin(aiSummaries, eq(documents.id, aiSummaries.documentId))
    .where(
      and(
        ...docFilters,
        or(
          ilike(documents.title, searchPattern),
          ilike(aiSummaries.summary, searchPattern),
          ilike(aiSummaries.doctorName, searchPattern),
          ilike(aiSummaries.hospitalName, searchPattern),
        ),
      ),
    )
    .orderBy(desc(documents.createdAt))
    .limit(20)

  // Search medications
  const medFilters: any[] = [eq(familyMembers.userId, user.id)]
  if (memberId) medFilters.push(eq(medications.familyMemberId, memberId))

  const matchedMeds = await db
    .select({
      id: medications.id,
      memberName: familyMembers.name,
      name: medications.name,
      dosage: medications.dosage,
      frequency: medications.frequency,
      purpose: medications.purpose,
      isActive: medications.isActive,
    })
    .from(medications)
    .innerJoin(familyMembers, eq(medications.familyMemberId, familyMembers.id))
    .where(
      and(
        ...medFilters,
        or(
          ilike(medications.name, searchPattern),
          ilike(medications.purpose, searchPattern),
        ),
      ),
    )
    .limit(20)

  // Search conditions
  const condFilters: any[] = [eq(familyMembers.userId, user.id)]
  if (memberId) condFilters.push(eq(conditions.familyMemberId, memberId))

  const matchedConditions = await db
    .select({
      id: conditions.id,
      memberName: familyMembers.name,
      name: conditions.name,
      status: conditions.status,
      firstDetected: conditions.firstDetected,
    })
    .from(conditions)
    .innerJoin(familyMembers, eq(conditions.familyMemberId, familyMembers.id))
    .where(
      and(
        ...condFilters,
        ilike(conditions.name, searchPattern),
      ),
    )
    .limit(20)

  return {
    documents: matchedDocs,
    medications: matchedMeds,
    conditions: matchedConditions,
  }
})
