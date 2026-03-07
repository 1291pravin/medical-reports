import { eq, and, desc, sql, gte, lte } from 'drizzle-orm'
import { useDb } from '~~/server/database'
import { documents, familyMembers, aiSummaries } from '~~/server/database/schema'
import { requireAuth } from '~~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const db = useDb()
  const query = getQuery(event)

  const memberId = query.memberId as string | undefined
  const category = query.category as string | undefined
  const fromDate = query.from as string | undefined
  const toDate = query.to as string | undefined

  const conditions: any[] = [eq(familyMembers.userId, user.id)]

  if (memberId) {
    conditions.push(eq(documents.familyMemberId, memberId))
  }
  if (category) {
    conditions.push(eq(documents.category, category as any))
  }
  if (fromDate) {
    conditions.push(gte(documents.reportDate, fromDate))
  }
  if (toDate) {
    conditions.push(lte(documents.reportDate, toDate))
  }

  const docs = await db
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
      summary: aiSummaries.summary,
      diagnosis: aiSummaries.diagnosis,
    })
    .from(documents)
    .innerJoin(familyMembers, eq(documents.familyMemberId, familyMembers.id))
    .leftJoin(aiSummaries, eq(documents.id, aiSummaries.documentId))
    .where(and(...conditions))
    .orderBy(desc(documents.createdAt))

  return docs
})
