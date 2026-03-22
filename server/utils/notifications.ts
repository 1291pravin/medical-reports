import { eq, and, lt, gte, lte, sql } from 'drizzle-orm'
import { useDb } from '~~/server/database'
import {
  followUps,
  appointments,
  medications,
  labResults,
  familyMembers,
  notificationReads,
} from '~~/server/database/schema'

export type NotificationPriority = 'critical' | 'high' | 'medium' | 'low'

export interface ComputedNotification {
  key: string
  type: string
  priority: NotificationPriority
  title: string
  description: string
  memberName: string
  memberId: string
  linkTo: string
  isRead: boolean
  relatedDate: string | null
}

const priorityOrder: Record<NotificationPriority, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
}

export async function computeNotifications(userId: string): Promise<ComputedNotification[]> {
  const db = useDb()

  const now = new Date()
  const todayStr = now.toISOString().slice(0, 10)
  const todayStart = new Date(`${todayStr}T00:00:00`)
  const todayEnd = new Date(`${todayStr}T23:59:59`)
  const tomorrowStart = new Date(todayStart)
  tomorrowStart.setDate(tomorrowStart.getDate() + 1)
  const tomorrowEnd = new Date(todayEnd)
  tomorrowEnd.setDate(tomorrowEnd.getDate() + 1)
  const threeDaysFromNow = new Date(todayStart)
  threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3)
  const sevenDaysFromNow = new Date(todayStart)
  sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7)
  const thirtyDaysAgo = new Date(now)
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  // Run all queries in parallel
  const [
    overdueFollowUps,
    dueSoonFollowUps,
    todayAppointments,
    tomorrowAppointments,
    expiringMeds,
    abnormalLabs,
    readKeys,
  ] = await Promise.all([
    // 1. Follow-ups overdue
    db
      .select({
        id: followUps.id,
        title: followUps.title,
        dueDate: followUps.dueDate,
        memberName: familyMembers.name,
        memberId: familyMembers.id,
      })
      .from(followUps)
      .innerJoin(familyMembers, eq(followUps.familyMemberId, familyMembers.id))
      .where(
        and(
          eq(familyMembers.userId, userId),
          eq(followUps.status, 'pending'),
          lt(followUps.dueDate, todayStr),
        ),
      ),

    // 2. Follow-ups due soon (today through +3 days)
    db
      .select({
        id: followUps.id,
        title: followUps.title,
        dueDate: followUps.dueDate,
        memberName: familyMembers.name,
        memberId: familyMembers.id,
      })
      .from(followUps)
      .innerJoin(familyMembers, eq(followUps.familyMemberId, familyMembers.id))
      .where(
        and(
          eq(familyMembers.userId, userId),
          eq(followUps.status, 'pending'),
          gte(followUps.dueDate, todayStr),
          lte(followUps.dueDate, threeDaysFromNow.toISOString().slice(0, 10)),
        ),
      ),

    // 3. Appointments today
    db
      .select({
        id: appointments.id,
        appointmentType: appointments.appointmentType,
        dateTime: appointments.dateTime,
        doctorName: appointments.doctorName,
        location: appointments.location,
        memberName: familyMembers.name,
        memberId: familyMembers.id,
      })
      .from(appointments)
      .innerJoin(familyMembers, eq(appointments.familyMemberId, familyMembers.id))
      .where(
        and(
          eq(familyMembers.userId, userId),
          eq(appointments.status, 'scheduled'),
          gte(appointments.dateTime, todayStart),
          lte(appointments.dateTime, todayEnd),
        ),
      ),

    // 4. Appointments tomorrow
    db
      .select({
        id: appointments.id,
        appointmentType: appointments.appointmentType,
        dateTime: appointments.dateTime,
        doctorName: appointments.doctorName,
        location: appointments.location,
        memberName: familyMembers.name,
        memberId: familyMembers.id,
      })
      .from(appointments)
      .innerJoin(familyMembers, eq(appointments.familyMemberId, familyMembers.id))
      .where(
        and(
          eq(familyMembers.userId, userId),
          eq(appointments.status, 'scheduled'),
          gte(appointments.dateTime, tomorrowStart),
          lte(appointments.dateTime, tomorrowEnd),
        ),
      ),

    // 5. Medications expiring within 7 days
    db
      .select({
        id: medications.id,
        name: medications.name,
        endDate: medications.endDate,
        memberName: familyMembers.name,
        memberId: familyMembers.id,
      })
      .from(medications)
      .innerJoin(familyMembers, eq(medications.familyMemberId, familyMembers.id))
      .where(
        and(
          eq(familyMembers.userId, userId),
          eq(medications.isActive, true),
          gte(medications.endDate, todayStr),
          lte(medications.endDate, sevenDaysFromNow.toISOString().slice(0, 10)),
        ),
      ),

    // 6. Abnormal lab results from last 30 days
    db
      .select({
        id: labResults.id,
        testName: labResults.testName,
        testValue: labResults.testValue,
        unit: labResults.unit,
        memberName: familyMembers.name,
        memberId: familyMembers.id,
        createdAt: labResults.createdAt,
      })
      .from(labResults)
      .innerJoin(familyMembers, eq(labResults.familyMemberId, familyMembers.id))
      .where(
        and(
          eq(familyMembers.userId, userId),
          eq(labResults.isAbnormal, true),
          gte(labResults.createdAt, thirtyDaysAgo),
        ),
      ),

    // Read keys for this user
    db
      .select({ notificationKey: notificationReads.notificationKey })
      .from(notificationReads)
      .where(eq(notificationReads.userId, userId)),
  ])

  const readSet = new Set(readKeys.map((r) => r.notificationKey))
  const notifications: ComputedNotification[] = []

  // Assemble follow-up overdue notifications
  for (const fu of overdueFollowUps) {
    const key = `followup-overdue-${fu.id}`
    const daysOverdue = Math.ceil(
      (now.getTime() - new Date(fu.dueDate + 'T00:00:00').getTime()) / (1000 * 60 * 60 * 24),
    )
    notifications.push({
      key,
      type: 'followup-overdue',
      priority: 'critical',
      title: `Follow-up overdue`,
      description: `"${fu.title}" is overdue by ${daysOverdue} day${daysOverdue !== 1 ? 's' : ''}`,
      memberName: fu.memberName,
      memberId: fu.memberId,
      linkTo: `/members/${fu.memberId}`,
      isRead: readSet.has(key),
      relatedDate: fu.dueDate,
    })
  }

  // Follow-up due soon (exclude those already in overdue)
  const overdueIds = new Set(overdueFollowUps.map((f) => f.id))
  for (const fu of dueSoonFollowUps) {
    if (overdueIds.has(fu.id)) continue
    const key = `followup-due-soon-${fu.id}`
    const daysUntil = Math.ceil(
      (new Date(fu.dueDate + 'T00:00:00').getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
    )
    const label = daysUntil === 0 ? 'today' : daysUntil === 1 ? 'tomorrow' : `in ${daysUntil} days`
    notifications.push({
      key,
      type: 'followup-due-soon',
      priority: 'high',
      title: `Follow-up due ${label}`,
      description: fu.title,
      memberName: fu.memberName,
      memberId: fu.memberId,
      linkTo: `/members/${fu.memberId}`,
      isRead: readSet.has(key),
      relatedDate: fu.dueDate,
    })
  }

  // Appointments today
  for (const apt of todayAppointments) {
    const key = `appointment-today-${apt.id}`
    const time = new Date(apt.dateTime).toLocaleTimeString('en-IN', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
    notifications.push({
      key,
      type: 'appointment-today',
      priority: 'critical',
      title: `Appointment today at ${time}`,
      description: [apt.doctorName, apt.location].filter(Boolean).join(' — ') || apt.appointmentType,
      memberName: apt.memberName,
      memberId: apt.memberId,
      linkTo: '/calendar',
      isRead: readSet.has(key),
      relatedDate: new Date(apt.dateTime).toISOString().slice(0, 10),
    })
  }

  // Appointments tomorrow
  for (const apt of tomorrowAppointments) {
    const key = `appointment-tomorrow-${apt.id}`
    const time = new Date(apt.dateTime).toLocaleTimeString('en-IN', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
    notifications.push({
      key,
      type: 'appointment-tomorrow',
      priority: 'high',
      title: `Appointment tomorrow at ${time}`,
      description: [apt.doctorName, apt.location].filter(Boolean).join(' — ') || apt.appointmentType,
      memberName: apt.memberName,
      memberId: apt.memberId,
      linkTo: '/calendar',
      isRead: readSet.has(key),
      relatedDate: new Date(apt.dateTime).toISOString().slice(0, 10),
    })
  }

  // Medications expiring
  for (const med of expiringMeds) {
    const key = `medication-expiring-${med.id}`
    const daysLeft = Math.ceil(
      (new Date(med.endDate + 'T00:00:00').getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
    )
    const label = daysLeft === 0 ? 'today' : daysLeft === 1 ? 'tomorrow' : `in ${daysLeft} days`
    notifications.push({
      key,
      type: 'medication-expiring',
      priority: 'medium',
      title: `Medication ending ${label}`,
      description: med.name,
      memberName: med.memberName,
      memberId: med.memberId,
      linkTo: '/medications',
      isRead: readSet.has(key),
      relatedDate: med.endDate,
    })
  }

  // Abnormal lab results
  for (const lab of abnormalLabs) {
    const key = `lab-abnormal-${lab.id}`
    notifications.push({
      key,
      type: 'lab-abnormal',
      priority: 'high',
      title: `Abnormal result: ${lab.testName}`,
      description: `${lab.testValue}${lab.unit ? ' ' + lab.unit : ''}`,
      memberName: lab.memberName,
      memberId: lab.memberId,
      linkTo: `/members/${lab.memberId}`,
      isRead: readSet.has(key),
      relatedDate: lab.createdAt ? new Date(lab.createdAt).toISOString().slice(0, 10) : null,
    })
  }

  // Sort: unread first, then by priority, then by date (most recent first)
  notifications.sort((a, b) => {
    if (a.isRead !== b.isRead) return a.isRead ? 1 : -1
    const pa = priorityOrder[a.priority]
    const pb = priorityOrder[b.priority]
    if (pa !== pb) return pa - pb
    return (b.relatedDate || '').localeCompare(a.relatedDate || '')
  })

  return notifications
}
