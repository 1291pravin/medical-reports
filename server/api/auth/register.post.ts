import { z } from 'zod'
import { hash } from 'bcrypt'
import { eq } from 'drizzle-orm'
import { useDb } from '~~/server/database'
import { users } from '~~/server/database/schema'

const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

export default defineEventHandler(async (event) => {
  const body = await readValidatedBody(event, registerSchema.parse)
  const db = useDb()

  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, body.email.toLowerCase()))
    .limit(1)

  if (existing.length > 0) {
    throw createError({
      statusCode: 409,
      statusMessage: 'An account with this email already exists',
    })
  }

  const passwordHash = await hash(body.password, 12)

  const result = await db
    .insert(users)
    .values({
      name: body.name,
      email: body.email.toLowerCase(),
      passwordHash,
    })
    .returning()

  const user = result[0]!

  await setUserSession(event, {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
    },
  })

  return { user: { id: user.id, email: user.email, name: user.name } }
})
