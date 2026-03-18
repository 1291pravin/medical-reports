import { and, eq, inArray } from 'drizzle-orm'
import { z } from 'zod'
import { useDb } from '~~/server/database'
import { familyMembers } from '~~/server/database/schema'
import { requireAuth } from '~~/server/utils/auth'
import { uploadFile } from '~~/server/utils/storage'
import {
  buildFamilyDietPdf,
  familyDietPlanSchema,
  familyGroceryListSchema,
  generateFamilyGroceryList,
} from '~~/server/utils/family-diet'

const bodySchema = z.object({
  days: z.union([z.literal(1), z.literal(7), z.literal(30)]),
  memberIds: z.array(z.string().uuid()).min(1),
  plan: familyDietPlanSchema,
  groceryList: familyGroceryListSchema.optional(),
})

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const { days, memberIds, plan, groceryList: providedGroceryList } = await readValidatedBody(event, bodySchema.parse)

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

  const memberNames = members.map(member => member.name)
  const groceryList = providedGroceryList ?? await generateFamilyGroceryList({
    days,
    memberNames,
    plan,
  })

  const pdfBytes = await buildFamilyDietPdf({
    days,
    memberNames,
    plan,
    groceryList,
  })

  const createdDate = new Date().toISOString().slice(0, 10)
  const memberSlug = slugify(memberNames.join('-').slice(0, 80)) || 'family'
  const fileName = `family-diet-${days}days-${createdDate}.pdf`
  const key = `generated/diets/${user.id}/${Date.now()}-${memberSlug}-${fileName}`
  const fileUrl = await uploadFile(key, pdfBytes, 'application/pdf')

  return {
    fileName,
    fileUrl,
    groceryList,
  }
})
