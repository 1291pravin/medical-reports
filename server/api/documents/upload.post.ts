import { useDb } from '~~/server/database'
import { documents, familyMembers } from '~~/server/database/schema'
import { requireAuth } from '~~/server/utils/auth'
import { uploadFile } from '~~/server/utils/storage'
import { eq, and } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const db = useDb()

  const formData = await readMultipartFormData(event)
  if (!formData) {
    throw createError({ statusCode: 400, statusMessage: 'No form data provided' })
  }

  const fileField = formData.find((f) => f.name === 'file')
  const memberId = formData.find((f) => f.name === 'familyMemberId')?.data.toString()
  const title = formData.find((f) => f.name === 'title')?.data.toString()
  const reportDate = formData.find((f) => f.name === 'reportDate')?.data.toString()

  if (!fileField?.data || !memberId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'File and familyMemberId are required',
    })
  }

  // Verify member belongs to user
  const [member] = await db
    .select({ id: familyMembers.id })
    .from(familyMembers)
    .where(and(eq(familyMembers.id, memberId), eq(familyMembers.userId, user.id)))
    .limit(1)

  if (!member) {
    throw createError({ statusCode: 404, statusMessage: 'Member not found' })
  }

  const fileType = fileField.type || 'application/octet-stream'
  const allowedTypes = [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
  ]

  if (!allowedTypes.includes(fileType)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Only PDF, JPG, PNG, and WebP files are supported',
    })
  }

  const ext = fileType.split('/')[1] === 'jpeg' ? 'jpg' : fileType.split('/')[1]
  const key = `documents/${memberId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

  const fileUrl = await uploadFile(key, fileField.data, fileType)

  // Use provided title or derive from filename
  const docTitle = title || fileField.filename?.replace(/\.[^.]+$/, '') || 'Untitled Report'

  const [doc] = await db
    .insert(documents)
    .values({
      familyMemberId: memberId,
      title: docTitle,
      fileUrl,
      fileType,
      fileSize: fileField.data.length,
      reportDate: reportDate || null,
    })
    .returning()

  return doc
})
