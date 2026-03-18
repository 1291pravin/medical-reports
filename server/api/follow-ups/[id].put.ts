import { z } from 'zod'
import { eq, and } from 'drizzle-orm'
import { useDb } from '~~/server/database'
import { followUps, familyMembers } from '~~/server/database/schema'
import { requireAuth } from '~~/server/utils/auth'

const updateSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  dueDate: z.string().nullable().optional(),
  instructions: z.string().max(2000).nullable().optional(),
  doctorName: z.string().max(500).nullable().optional(),
  hospitalName: z.string().max(500).nullable().optional(),
  status: z.enum(['pending', 'completed', 'dismissed']).optional(),
})

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const id = getRouterParam(event, 'id')!
  const body = await readValidatedBody(event, updateSchema.parse)
  const db = useDb()

  // Verify ownership
  const [existing] = await db
    .select({ id: followUps.id, status: followUps.status })
    .from(followUps)
    .innerJoin(familyMembers, eq(followUps.familyMemberId, familyMembers.id))
    .where(and(eq(followUps.id, id), eq(familyMembers.userId, user.id)))
    .limit(1)

  if (!existing) {
    throw createError({ statusCode: 404, statusMessage: 'Follow-up not found' })
  }

  const updateData: any = { ...body }

  // Set completedAt when status changes to completed
  if (body.status === 'completed' && existing.status !== 'completed') {
    updateData.completedAt = new Date()
  } else if (body.status && body.status !== 'completed') {
    updateData.completedAt = null
  }

  const [updated] = await db
    .update(followUps)
    .set(updateData)
    .where(eq(followUps.id, id))
    .returning()

  return updated
})
