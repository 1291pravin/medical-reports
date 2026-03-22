import { z } from 'zod'
import { eq, and } from 'drizzle-orm'
import { useDb } from '~~/server/database'
import { appointments, familyMembers, followUps } from '~~/server/database/schema'
import { requireAuth } from '~~/server/utils/auth'

const updateSchema = z.object({
  appointmentType: z.enum(['consultation', 'lab_test', 'imaging', 'vaccination', 'dental', 'eye_exam', 'therapy', 'other']).optional(),
  dateTime: z.string().optional(),
  endDateTime: z.string().nullable().optional(),
  location: z.string().max(500).nullable().optional(),
  doctorName: z.string().max(500).nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
  status: z.enum(['scheduled', 'completed', 'cancelled', 'rescheduled', 'no_show']).optional(),
})

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const id = getRouterParam(event, 'id')!
  const body = await readValidatedBody(event, updateSchema.parse)
  const db = useDb()

  // Verify ownership
  const [existing] = await db
    .select({ id: appointments.id, followUpId: appointments.followUpId, status: appointments.status })
    .from(appointments)
    .innerJoin(familyMembers, eq(appointments.familyMemberId, familyMembers.id))
    .where(and(eq(appointments.id, id), eq(familyMembers.userId, user.id)))
    .limit(1)

  if (!existing) {
    throw createError({ statusCode: 404, statusMessage: 'Appointment not found' })
  }

  const updateData: any = { ...body }
  if (body.dateTime) updateData.dateTime = new Date(body.dateTime)
  if (body.endDateTime) updateData.endDateTime = new Date(body.endDateTime)

  const [updated] = await db
    .update(appointments)
    .set(updateData)
    .where(eq(appointments.id, id))
    .returning()

  // Auto-complete linked follow-up when appointment is completed
  if (body.status === 'completed' && existing.status !== 'completed' && existing.followUpId) {
    await db
      .update(followUps)
      .set({ status: 'completed', completedAt: new Date() })
      .where(eq(followUps.id, existing.followUpId))
  }

  return updated
})
