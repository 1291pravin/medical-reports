import { eq, and, desc } from 'drizzle-orm'
import { useDb } from '~~/server/database'
import {
  documents,
  familyMembers,
  aiSummaries,
  medications,
  conditions,
  documentConditions,
  memberHealthSummaries,
  timelineEvents,
  followUps,
} from '~~/server/database/schema'
import { requireAuth } from '~~/server/utils/auth'
import { useAIProvider, getHealthSummaryPrompt } from '~~/server/utils/ai-provider'
import { gatherHealthContext } from '~~/server/utils/health-context'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const memberId = getRouterParam(event, 'id')!
  const db = useDb()

  // Verify member belongs to user
  const [member] = await db
    .select({ id: familyMembers.id, name: familyMembers.name })
    .from(familyMembers)
    .where(and(eq(familyMembers.id, memberId), eq(familyMembers.userId, user.id)))
    .limit(1)

  if (!member) {
    throw createError({ statusCode: 404, statusMessage: 'Member not found' })
  }

  // Step 1: Clear all derived data (keep documents + ai_summaries)
  await db.delete(documentConditions).where(
    eq(documentConditions.documentId, documents.id),
  ).catch(() => {
    // Fallback: delete via condition IDs
  })

  // Delete in correct order to avoid FK issues
  await db.delete(memberHealthSummaries).where(eq(memberHealthSummaries.familyMemberId, memberId))
  await db.delete(timelineEvents).where(eq(timelineEvents.familyMemberId, memberId))

  // Delete document_conditions by getting all condition IDs for this member
  const memberConditions = await db
    .select({ id: conditions.id })
    .from(conditions)
    .where(eq(conditions.familyMemberId, memberId))

  for (const cond of memberConditions) {
    await db.delete(documentConditions).where(eq(documentConditions.conditionId, cond.id))
  }

  await db.delete(conditions).where(eq(conditions.familyMemberId, memberId))
  await db.delete(medications).where(eq(medications.familyMemberId, memberId))
  await db.delete(followUps).where(
    and(eq(followUps.familyMemberId, memberId), eq(followUps.sourceType, 'ai_extracted'))
  )

  // Step 2: Get all processed documents with their AI summaries
  const processedDocs = await db
    .select({
      docId: documents.id,
      reportDate: documents.reportDate,
      category: documents.category,
      diagnosis: aiSummaries.diagnosis,
      keyFindings: aiSummaries.keyFindings,
      rawExtraction: aiSummaries.rawExtraction,
    })
    .from(documents)
    .innerJoin(aiSummaries, eq(documents.id, aiSummaries.documentId))
    .where(
      and(
        eq(documents.familyMemberId, memberId),
        eq(documents.isProcessed, true),
      ),
    )
    .orderBy(desc(documents.reportDate))

  if (!processedDocs.length) {
    return { success: true, message: 'No processed documents to regenerate from' }
  }

  // Step 3: Re-extract conditions, medications, timeline from each document's existing AI data
  const validCategories = ['surgery', 'diagnosis', 'medication', 'lab', 'vaccination', 'hospitalization', 'consultation', 'other'] as const

  for (const doc of processedDocs) {
    const extraction = doc.rawExtraction as any
    if (!extraction) continue

    // Re-create medications
    if (extraction.medications?.length) {
      for (const med of extraction.medications) {
        await db.insert(medications).values({
          familyMemberId: memberId,
          documentId: doc.docId,
          name: med.name,
          dosage: med.dosage || null,
          frequency: med.frequency || null,
          startDate: extraction.reportDate || doc.reportDate || null,
          endDate: null,
          purpose: med.purpose || null,
          isActive: true,
        })
      }
    }

    // Re-create conditions
    if (extraction.diagnosis?.length) {
      for (const diagnosisName of extraction.diagnosis) {
        const [existing] = await db
          .select()
          .from(conditions)
          .where(
            and(
              eq(conditions.familyMemberId, memberId),
              eq(conditions.name, diagnosisName),
            ),
          )
          .limit(1)

        let conditionId: string
        if (existing) {
          conditionId = existing.id
        } else {
          const insertResult = await db
            .insert(conditions)
            .values({
              familyMemberId: memberId,
              name: diagnosisName,
              firstDetected: extraction.reportDate || doc.reportDate || null,
              status: 'active',
            })
            .returning()
          conditionId = insertResult[0]!.id
        }

        await db
          .insert(documentConditions)
          .values({ documentId: doc.docId, conditionId })
          .onConflictDoNothing()
      }
    }

    // Re-create follow-ups
    if (extraction.followUps?.length) {
      for (const fu of extraction.followUps) {
        await db.insert(followUps).values({
          familyMemberId: memberId,
          documentId: doc.docId,
          title: fu.title,
          dueDate: fu.dueDate || null,
          instructions: fu.instructions || null,
          doctorName: extraction.doctorName || null,
          hospitalName: extraction.hospitalName || null,
          status: 'pending',
          sourceType: 'ai_extracted',
        })
      }
    }

    // Re-create timeline events
    if (extraction.timelineEvents?.length) {
      for (const evt of extraction.timelineEvents) {
        const cat = validCategories.includes(evt.category as any) ? evt.category : 'other'
        await db.insert(timelineEvents).values({
          familyMemberId: memberId,
          documentId: doc.docId,
          title: evt.title,
          eventDate: evt.eventDate || extraction.reportDate || doc.reportDate || null,
          category: cat,
          description: evt.description || null,
          sourceType: 'ai_extracted',
        })
      }
    }
  }

  // Step 4: Regenerate health summary
  const latestDocId = processedDocs[0]!.docId
  try {
    const provider = useAIProvider()
    const ctx = await gatherHealthContext(memberId)

    const summaryData = {
      patient: {
        age: ctx.member.age,
        weightKg: ctx.member.weightKg,
        heightCm: ctx.member.heightCm,
        bmi: ctx.member.bmi,
        bmiCategory: ctx.member.bmiCategory,
        bloodGroup: ctx.member.bloodGroup,
        allergies: ctx.member.allergies,
        dietPreference: ctx.member.dietPreference,
      },
      conditions: ctx.conditions,
      activeMedications: ctx.medications,
      labValues: ctx.labValues,
    }

    const parsed = await provider.generateJSON(
      getHealthSummaryPrompt(),
      JSON.stringify(summaryData),
    )

    await db.insert(memberHealthSummaries).values({
      familyMemberId: memberId,
      summaryText: typeof parsed.summaryText === 'object'
        ? JSON.stringify(parsed.summaryText)
        : parsed.summaryText,
      conditions: ctx.conditions,
      alerts: parsed.alerts,
      recommendations: parsed.recommendations || {},
      lastUpdatedFromDocId: latestDocId,
      version: 1,
    })
  } catch (err) {
    console.error('[Regenerate] Health summary generation failed:', err)
  }

  return { success: true, documentsProcessed: processedDocs.length }
})
