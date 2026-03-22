import { eq, and, asc, gte, lt } from 'drizzle-orm'
import { useDb } from '~~/server/database'
import { appointments, familyMembers, followUps } from '~~/server/database/schema'
import { requireAuth } from '~~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const db = useDb()
  const query = getQuery(event)
  const memberId = query.memberId as string | undefined
  const status = query.status as string | undefined
  const from = query.from as string | undefined
  const to = query.to as string | undefined

  const conditions: any[] = [eq(familyMembers.userId, user.id)]

  if (memberId) {
    conditions.push(eq(appointments.familyMemberId, memberId))
  }
  if (status && status !== 'all') {
    conditions.push(eq(appointments.status, status as any))
  } else if (!status) {
    conditions.push(eq(appointments.status, 'scheduled'))
  }
  if (from) {
    conditions.push(gte(appointments.dateTime, new Date(from)))
  }
  if (to) {
    conditions.push(lt(appointments.dateTime, new Date(to)))
  }

  const results = await db
    .select({
      id: appointments.id,
      familyMemberId: appointments.familyMemberId,
      memberName: familyMembers.name,
      followUpId: appointments.followUpId,
      followUpTitle: followUps.title,
      appointmentType: appointments.appointmentType,
      dateTime: appointments.dateTime,
      endDateTime: appointments.endDateTime,
      location: appointments.location,
      doctorName: appointments.doctorName,
      notes: appointments.notes,
      status: appointments.status,
      createdAt: appointments.createdAt,
    })
    .from(appointments)
    .innerJoin(familyMembers, eq(appointments.familyMemberId, familyMembers.id))
    .leftJoin(followUps, eq(appointments.followUpId, followUps.id))
    .where(and(...conditions))
    .orderBy(asc(appointments.dateTime))

  return results
})
