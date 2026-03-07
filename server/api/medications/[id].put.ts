import { z } from 'zod'
import { eq, and } from 'drizzle-orm'
import { useDb } from '~~/server/database'
import { medications, familyMembers } from '~~/server/database/schema'
import { requireAuth } from '~~/server/utils/auth'

const updateSchema = z.object({
  name: z.string().optional(),
  dosage: z.string().nullable().optional(),
  frequency: z.string().nullable().optional(),
  startDate: z.string().nullable().optional(),
  endDate: z.string().nullable().optional(),
  purpose: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
})

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const id = getRouterParam(event, 'id')!
  const body = await readValidatedBody(event, updateSchema.parse)
  const db = useDb()

  // Verify ownership
  const [existing] = await db
    .select({ id: medications.id })
    .from(medications)
    .innerJoin(familyMembers, eq(medications.familyMemberId, familyMembers.id))
    .where(and(eq(medications.id, id), eq(familyMembers.userId, user.id)))
    .limit(1)

  if (!existing) {
    throw createError({ statusCode: 404, statusMessage: 'Medication not found' })
  }

  const [updated] = await db
    .update(medications)
    .set(body)
    .where(eq(medications.id, id))
    .returning()

  return updated
})
