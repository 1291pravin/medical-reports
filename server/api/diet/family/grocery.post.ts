import { and, eq, inArray } from 'drizzle-orm'
import { z } from 'zod'
import { useDb } from '~~/server/database'
import { familyMembers } from '~~/server/database/schema'
import { requireAuth } from '~~/server/utils/auth'
import { familyDietPlanSchema, generateFamilyGroceryList } from '~~/server/utils/family-diet'

const bodySchema = z.object({
  days: z.union([z.literal(1), z.literal(7), z.literal(30)]),
  memberIds: z.array(z.string().uuid()).min(1),
  plan: familyDietPlanSchema,
})

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const { days, memberIds, plan } = await readValidatedBody(event, bodySchema.parse)

  const db = useDb()
  const members = await db
    .select({ id: familyMembers.id, name: familyMembers.name })
    .from(familyMembers)
    .where(
      and(
        eq(familyMembers.userId, user.id),
        eq(familyMembers.isActive, true),
        inArray(familyMembers.id, memberIds),
      ),
    )
    .orderBy(familyMembers.name)

  if (members.length !== memberIds.length) {
    throw createError({ statusCode: 400, statusMessage: 'Some selected members are invalid' })
  }

  return generateFamilyGroceryList({
    days,
    memberNames: members.map(member => member.name),
    plan,
  })
})
