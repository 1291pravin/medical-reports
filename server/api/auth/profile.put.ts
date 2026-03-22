import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { useDb } from '~~/server/database'
import { users } from '~~/server/database/schema'
import { requireAuth } from '~~/server/utils/auth'

const schema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
})

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const db = useDb()
  const body = await readValidatedBody(event, schema.parse)

  // Check if email is taken by another user
  if (body.email !== user.email) {
    const existing = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, body.email))
      .limit(1)

    if (existing.length > 0 && existing[0]!.id !== user.id) {
      throw createError({ statusCode: 400, statusMessage: 'Email already in use' })
    }
  }

  await db
    .update(users)
    .set({ name: body.name, email: body.email })
    .where(eq(users.id, user.id))

  // Update session
  const session = await getUserSession(event)
  await replaceUserSession(event, {
    ...session,
    user: { id: user.id, name: body.name, email: body.email },
  })

  return { success: true }
})
