import { z } from 'zod'
import { eq, and } from 'drizzle-orm'
import { useDb } from '~~/server/database'
import { appointments, familyMembers, followUps } from '~~/server/database/schema'
import { requireAuth } from '~~/server/utils/auth'

const createSchema = z.object({
  familyMemberId: z.string().uuid(),
  followUpId: z.string().uuid().nullable().optional(),
  appointmentType: z.enum(['consultation', 'lab_test', 'imaging', 'vaccination', 'dental', 'eye_exam', 'therapy', 'other']).default('consultation'),
  dateTime: z.string(),
  endDateTime: z.string().nullable().optional(),
  location: z.string().max(500).nullable().optional(),
  doctorName: z.string().max(500).nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
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

  // Verify follow-up belongs to user if provided
  if (body.followUpId) {
    const [fu] = await db
      .select({ id: followUps.id })
      .from(followUps)
      .innerJoin(familyMembers, eq(followUps.familyMemberId, familyMembers.id))
      .where(and(eq(followUps.id, body.followUpId), eq(familyMembers.userId, user.id)))
      .limit(1)

    if (!fu) {
      throw createError({ statusCode: 404, statusMessage: 'Follow-up not found' })
    }
  }

  const [created] = await db
    .insert(appointments)
    .values({
      familyMemberId: body.familyMemberId,
      followUpId: body.followUpId || null,
      appointmentType: body.appointmentType,
      dateTime: new Date(body.dateTime),
      endDateTime: body.endDateTime ? new Date(body.endDateTime) : null,
      location: body.location || null,
      doctorName: body.doctorName || null,
      notes: body.notes || null,
    })
    .returning()

  return created
})
