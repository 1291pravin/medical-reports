import { eq } from 'drizzle-orm'
import { z } from 'zod'
import bcrypt from 'bcrypt'
import { useDb } from '~~/server/database'
import { users } from '~~/server/database/schema'
import { requireAuth } from '~~/server/utils/auth'

const schema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
})

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const db = useDb()
  const body = await readValidatedBody(event, schema.parse)

  // Get current password hash
  const [dbUser] = await db
    .select({ passwordHash: users.passwordHash })
    .from(users)
    .where(eq(users.id, user.id))

  if (!dbUser) {
    throw createError({ statusCode: 404, statusMessage: 'User not found' })
  }

  // Verify current password
  const valid = await bcrypt.compare(body.currentPassword, dbUser.passwordHash)
  if (!valid) {
    throw createError({ statusCode: 400, statusMessage: 'Current password is incorrect' })
  }

  // Hash and update new password
  const newHash = await bcrypt.hash(body.newPassword, 10)
  await db
    .update(users)
    .set({ passwordHash: newHash })
    .where(eq(users.id, user.id))

  return { success: true }
})
