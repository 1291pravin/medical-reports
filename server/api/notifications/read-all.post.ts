import { useDb } from '~~/server/database'
import { notificationReads } from '~~/server/database/schema'
import { requireAuth } from '~~/server/utils/auth'
import { computeNotifications } from '~~/server/utils/notifications'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const notifications = await computeNotifications(user.id)
  const db = useDb()

  const unread = notifications.filter((n) => !n.isRead)
  if (unread.length > 0) {
    await db
      .insert(notificationReads)
      .values(unread.map((n) => ({ userId: user.id, notificationKey: n.key })))
      .onConflictDoNothing()
  }

  return { success: true }
})
