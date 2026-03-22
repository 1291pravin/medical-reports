import { eq, and, desc, sql } from 'drizzle-orm'
import { useDb } from '~~/server/database'
import { familyMembers, documents } from '~~/server/database/schema'
import { requireAuth } from '~~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const db = useDb()

  const recentDocs = await db
    .select({
      id: documents.id,
      title: documents.title,
      category: documents.category,
      reportDate: documents.reportDate,
      isProcessed: documents.isProcessed,
      createdAt: documents.createdAt,
      memberName: familyMembers.name,
      memberId: familyMembers.id,
    })
    .from(documents)
    .innerJoin(familyMembers, eq(documents.familyMemberId, familyMembers.id))
    .where(
      and(
        eq(familyMembers.userId, user.id),
        eq(familyMembers.isActive, true),
      ),
    )
    .orderBy(desc(documents.createdAt))
    .limit(5)

  return recentDocs
})
