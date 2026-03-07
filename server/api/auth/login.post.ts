import { z } from 'zod'
import { compare } from 'bcrypt'
import { eq } from 'drizzle-orm'
import { useDb } from '~~/server/database'
import { users } from '~~/server/database/schema'

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
})

export default defineEventHandler(async (event) => {
  const body = await readValidatedBody(event, loginSchema.parse)
  const db = useDb()

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, body.email.toLowerCase()))
    .limit(1)

  if (!user) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Invalid email or password',
    })
  }

  const validPassword = await compare(body.password, user.passwordHash)
  if (!validPassword) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Invalid email or password',
    })
  }

  await setUserSession(event, {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
    },
  })

  return {
    user: { id: user.id, email: user.email, name: user.name },
  }
})
