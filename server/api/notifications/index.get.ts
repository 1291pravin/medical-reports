import { requireAuth } from '~~/server/utils/auth'
import { computeNotifications } from '~~/server/utils/notifications'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  return await computeNotifications(user.id)
})
