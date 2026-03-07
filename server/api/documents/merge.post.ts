import { z } from 'zod'
import { eq, and, inArray } from 'drizzle-orm'
import { useDb } from '~~/server/database'
import { documents, familyMembers } from '~~/server/database/schema'
import { requireAuth } from '~~/server/utils/auth'
import { getFileObject, extractStorageKey } from '~~/server/utils/storage'
import { mergePDFs } from '~~/server/utils/pdf'

const mergeSchema = z.object({
  documentIds: z.array(z.string().uuid()).min(2, 'At least 2 documents required'),
})

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const body = await readValidatedBody(event, mergeSchema.parse)
  const db = useDb()

  // Fetch documents and verify ownership
  const docs = await db
    .select({
      id: documents.id,
      fileUrl: documents.fileUrl,
      fileType: documents.fileType,
      title: documents.title,
    })
    .from(documents)
    .innerJoin(familyMembers, eq(documents.familyMemberId, familyMembers.id))
    .where(
      and(
        inArray(documents.id, body.documentIds),
        eq(familyMembers.userId, user.id),
      ),
    )

  if (docs.length !== body.documentIds.length) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Some documents were not found',
    })
  }

  const pdfDocs = docs.filter((d) => d.fileType === 'application/pdf')
  if (pdfDocs.length < 2) {
    throw createError({
      statusCode: 400,
      statusMessage: 'At least 2 PDF documents are required for merging',
    })
  }

  // Fetch all PDFs from storage
  const pdfBuffers: Uint8Array[] = []
  for (const doc of pdfDocs) {
    const buffer = await getFileObject(extractStorageKey(doc.fileUrl))
    pdfBuffers.push(buffer)
  }

  // Merge PDFs
  const merged = await mergePDFs(pdfBuffers)

  // Return as downloadable PDF
  setResponseHeaders(event, {
    'Content-Type': 'application/pdf',
    'Content-Disposition': `attachment; filename="merged-reports-${Date.now()}.pdf"`,
    'Content-Length': String(merged.length),
  })

  return merged
})
