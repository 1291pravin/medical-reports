import { eq, and, sql } from 'drizzle-orm'
import { useDb } from '~~/server/database'
import { familyMembers, documents, medications } from '~~/server/database/schema'
import { requireAuth } from '~~/server/utils/auth'
import { serializeFamilyMember } from '~~/server/utils/family-member'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const id = getRouterParam(event, 'id')!
  const db = useDb()

  const [member] = await db
    .select({
      id: familyMembers.id,
      name: familyMembers.name,
      dob: familyMembers.dob,
      weightKg: familyMembers.weightKg,
      heightCm: familyMembers.heightCm,
      bloodGroup: familyMembers.bloodGroup,
      allergies: familyMembers.allergies,
      emergencyContact: familyMembers.emergencyContact,
      dietPreference: familyMembers.dietPreference,
      photoUrl: familyMembers.photoUrl,
      isActive: familyMembers.isActive,
      createdAt: familyMembers.createdAt,
      documentCount: sql<number>`(SELECT count(*) FROM documents WHERE documents.family_member_id = "family_members"."id")::int`,
      activeMedCount: sql<number>`(SELECT count(*) FROM medications WHERE medications.family_member_id = "family_members"."id" AND medications.is_active = true)::int`,
    })
    .from(familyMembers)
    .where(
      and(eq(familyMembers.id, id), eq(familyMembers.userId, user.id)),
    )
    .limit(1)

  if (!member) {
    throw createError({ statusCode: 404, statusMessage: 'Member not found' })
  }

  return serializeFamilyMember(member)
})
