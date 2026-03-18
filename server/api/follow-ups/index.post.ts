import { z } from 'zod'
import { eq, and } from 'drizzle-orm'
import { useDb } from '~~/server/database'
import { followUps, familyMembers } from '~~/server/database/schema'
import { requireAuth } from '~~/server/utils/auth'

const createSchema = z.object({
  familyMemberId: z.string().uuid(),
  title: z.string().min(1).max(500),
  dueDate: z.string().nullable().optional(),
  instructions: z.string().max(2000).nullable().optional(),
  doctorName: z.string().max(500).nullable().optional(),
  hospitalName: z.string().max(500).nullable().optional(),
})

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const body = await readValidatedBody(event, createSchema.parse)
  const db = useDb()

  // Verify member belongs to user
  const [member] = await db
    .select({ id: familyMembers.id })
    .from(familyMembers)
    .where(and(eq(familyMembers.id, body.familyMemberId), eq(familyMembers.userId, user.id)))
    .limit(1)

  if (!member) {
    throw createError({ statusCode: 404, statusMessage: 'Member not found' })
  }

  const [created] = await db
    .insert(followUps)
    .values({
      familyMemberId: body.familyMemberId,
      title: body.title,
      dueDate: body.dueDate || null,
      instructions: body.instructions || null,
      doctorName: body.doctorName || null,
      hospitalName: body.hospitalName || null,
      status: 'pending',
      sourceType: 'manual',
    })
    .returning()

  return created
})
