import { z } from 'zod'
import { useDb } from '~~/server/database'
import { notificationReads } from '~~/server/database/schema'
import { requireAuth } from '~~/server/utils/auth'

const schema = z.object({ key: z.string().min(1) })

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const { key } = await readValidatedBody(event, schema.parse)
  const db = useDb()

  await db
    .insert(notificationReads)
    .values({ userId: user.id, notificationKey: key })
    .onConflictDoNothing()

  return { success: true }
})
