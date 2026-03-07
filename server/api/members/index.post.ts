import { z } from 'zod'
import { useDb } from '~~/server/database'
import { familyMembers } from '~~/server/database/schema'
import { requireAuth } from '~~/server/utils/auth'

const createMemberSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  dob: z.string().optional(),
  bloodGroup: z.string().optional(),
  allergies: z.array(z.string()).optional(),
  emergencyContact: z.string().optional(),
  dietPreference: z.string().optional(),
  photoUrl: z.string().optional(),
})

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const body = await readValidatedBody(event, createMemberSchema.parse)
  const db = useDb()

  const [member] = await db
    .insert(familyMembers)
    .values({
      userId: user.id,
      name: body.name,
      dob: body.dob || null,
      bloodGroup: body.bloodGroup || null,
      allergies: body.allergies || [],
      emergencyContact: body.emergencyContact || null,
      dietPreference: body.dietPreference || null,
      photoUrl: body.photoUrl || null,
    })
    .returning()

  return member
})
