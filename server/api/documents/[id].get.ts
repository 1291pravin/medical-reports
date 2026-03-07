import { eq, and } from 'drizzle-orm'
import { useDb } from '~~/server/database'
import {
  documents,
  familyMembers,
  aiSummaries,
  medications,
  documentConditions,
  conditions,
} from '~~/server/database/schema'
import { requireAuth } from '~~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const id = getRouterParam(event, 'id')!
  const db = useDb()

  const [doc] = await db
    .select({
      id: documents.id,
      familyMemberId: documents.familyMemberId,
      memberName: familyMembers.name,
      title: documents.title,
      fileUrl: documents.fileUrl,
      fileType: documents.fileType,
      fileSize: documents.fileSize,
      category: documents.category,
      reportDate: documents.reportDate,
      isProcessed: documents.isProcessed,
      isApproved: documents.isApproved,
      createdAt: documents.createdAt,
    })
    .from(documents)
    .innerJoin(familyMembers, eq(documents.familyMemberId, familyMembers.id))
    .where(and(eq(documents.id, id), eq(familyMembers.userId, user.id)))
    .limit(1)

  if (!doc) {
    throw createError({ statusCode: 404, statusMessage: 'Document not found' })
  }

  // Fetch AI summary
  const [summary] = await db
    .select()
    .from(aiSummaries)
    .where(eq(aiSummaries.documentId, id))
    .limit(1)

  // Fetch linked medications
  const meds = await db
    .select()
    .from(medications)
    .where(eq(medications.documentId, id))

  // Fetch linked conditions
  const linkedConditions = await db
    .select({
      id: conditions.id,
      name: conditions.name,
      status: conditions.status,
      firstDetected: conditions.firstDetected,
    })
    .from(documentConditions)
    .innerJoin(conditions, eq(documentConditions.conditionId, conditions.id))
    .where(eq(documentConditions.documentId, id))

  return {
    ...doc,
    aiSummary: summary || null,
    medications: meds,
    conditions: linkedConditions,
  }
})
