import { z } from 'zod'
import { eq, and } from 'drizzle-orm'
import { useDb } from '~~/server/database'
import { familyMembers } from '~~/server/database/schema'
import { requireAuth } from '~~/server/utils/auth'

const updateMemberSchema = z.object({
  name: z.string().min(1).optional(),
  dob: z.string().nullable().optional(),
  bloodGroup: z.string().nullable().optional(),
  allergies: z.array(z.string()).optional(),
  emergencyContact: z.string().nullable().optional(),
  dietPreference: z.string().nullable().optional(),
  photoUrl: z.string().nullable().optional(),
})

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const id = getRouterParam(event, 'id')!
  const body = await readValidatedBody(event, updateMemberSchema.parse)
  const db = useDb()

  const [updated] = await db
    .update(familyMembers)
    .set(body)
    .where(
      and(eq(familyMembers.id, id), eq(familyMembers.userId, user.id)),
    )
    .returning()

  if (!updated) {
    throw createError({ statusCode: 404, statusMessage: 'Member not found' })
  }

  return updated
})
