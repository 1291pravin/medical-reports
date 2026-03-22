import { eq, and, asc, sql } from 'drizzle-orm'
import { useDb } from '~~/server/database'
import { familyMembers, labResults } from '~~/server/database/schema'
import { requireAuth } from '~~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const db = useDb()
  const memberId = getRouterParam(event, 'memberId')!
  const query = getQuery(event)
  const testName = query.test as string | undefined

  // Verify member belongs to user
  const [member] = await db
    .select({ id: familyMembers.id })
    .from(familyMembers)
    .where(and(eq(familyMembers.id, memberId), eq(familyMembers.userId, user.id)))
    .limit(1)

  if (!member) {
    throw createError({ statusCode: 404, statusMessage: 'Member not found' })
  }

  // If a specific test is requested, return trend data for it
  if (testName) {
    const results = await db
      .select({
        id: labResults.id,
        testName: labResults.testName,
        testValue: labResults.testValue,
        numericValue: labResults.numericValue,
        unit: labResults.unit,
        referenceMin: labResults.referenceMin,
        referenceMax: labResults.referenceMax,
        isAbnormal: labResults.isAbnormal,
        reportDate: labResults.reportDate,
      })
      .from(labResults)
      .where(
        and(
          eq(labResults.familyMemberId, memberId),
          eq(labResults.testName, testName),
        ),
      )
      .orderBy(asc(labResults.reportDate))

    return results.map((r) => ({
      ...r,
      numericValue: r.numericValue ? Number(r.numericValue) : null,
      referenceMin: r.referenceMin ? Number(r.referenceMin) : null,
      referenceMax: r.referenceMax ? Number(r.referenceMax) : null,
    }))
  }

  // Otherwise, return list of distinct test names with latest values
  const tests = await db
    .select({
      testName: labResults.testName,
      count: sql<number>`count(*)::int`,
      latestValue: sql<string>`(
        SELECT test_value FROM lab_results lr2
        WHERE lr2.family_member_id = ${memberId}
        AND lr2.test_name = lab_results.test_name
        ORDER BY lr2.report_date DESC NULLS LAST
        LIMIT 1
      )`,
      latestDate: sql<string>`max(lab_results.report_date)`,
      unit: sql<string>`(
        SELECT unit FROM lab_results lr2
        WHERE lr2.family_member_id = ${memberId}
        AND lr2.test_name = lab_results.test_name
        AND lr2.unit IS NOT NULL
        LIMIT 1
      )`,
    })
    .from(labResults)
    .where(eq(labResults.familyMemberId, memberId))
    .groupBy(labResults.testName)
    .orderBy(labResults.testName)

  return tests
})
