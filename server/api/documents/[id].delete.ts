import { eq, and } from 'drizzle-orm'
import { useDb } from '~~/server/database'
import { documents, familyMembers } from '~~/server/database/schema'
import { requireAuth } from '~~/server/utils/auth'
import { deleteFile, extractStorageKey } from '~~/server/utils/storage'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const id = getRouterParam(event, 'id')!
  const db = useDb()

  const [doc] = await db
    .select({
      id: documents.id,
      fileUrl: documents.fileUrl,
    })
    .from(documents)
    .innerJoin(familyMembers, eq(documents.familyMemberId, familyMembers.id))
    .where(and(eq(documents.id, id), eq(familyMembers.userId, user.id)))
    .limit(1)

  if (!doc) {
    throw createError({ statusCode: 404, statusMessage: 'Document not found' })
  }

  // Delete from storage
  try {
    await deleteFile(extractStorageKey(doc.fileUrl))
  } catch {
    // Continue even if storage delete fails
  }

  await db.delete(documents).where(eq(documents.id, id))

  return { success: true }
})
