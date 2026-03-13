import { z } from 'zod'
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
} from '~~/server/database/schema'
import { requireAuth } from '~~/server/utils/auth'
import { useAIProvider, getHealthSummaryPrompt } from '~~/server/utils/ai-provider'
import { getFileObject, extractStorageKey, deleteFile } from '~~/server/utils/storage'
import { gatherHealthContext } from '~~/server/utils/health-context'

const processSchema = z.object({
  documentId: z.string().uuid(),
  customInstructions: z.string().trim().max(2000).optional(),
})

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const body = await readValidatedBody(event, processSchema.parse)
  const db = useDb()

  // Verify document belongs to user
  const [doc] = await db
    .select({
      id: documents.id,
      fileUrl: documents.fileUrl,
      fileType: documents.fileType,
      familyMemberId: documents.familyMemberId,
      reportDate: documents.reportDate,
    })
    .from(documents)
    .innerJoin(familyMembers, eq(documents.familyMemberId, familyMembers.id))
    .where(
      and(eq(documents.id, body.documentId), eq(familyMembers.userId, user.id)),
    )
    .limit(1)

  if (!doc) {
    throw createError({ statusCode: 404, statusMessage: 'Document not found' })
  }

  // Step 1: Extract data from document using AI provider
  const provider = useAIProvider()
  const storageKey = extractStorageKey(doc.fileUrl)
  const fileBytes = await getFileObject(storageKey)

  const extraction = await provider.extractDocument(fileBytes, doc.fileType, body.customInstructions)

  // Reject non-medical documents
  if (extraction.isMedicalDocument === false) {
    // Delete the uploaded document and stored file since it's not medical
    await deleteFile(storageKey).catch(() => {})
    await db.delete(documents).where(eq(documents.id, doc.id))
    throw createError({
      statusCode: 422,
      statusMessage: 'This document does not appear to be a medical or health-related document. Please upload medical reports, prescriptions, lab results, or other health documents.',
    })
  }

  // Step 2: Save AI summary
  await db
    .insert(aiSummaries)
    .values({
      documentId: doc.id,
      summary: extraction.summary || null,
      diagnosis: extraction.diagnosis || [],
      keyFindings: extraction.keyFindings || [],
      testValues: extraction.testValues || [],
      doctorName: extraction.doctorName || null,
      hospitalName: extraction.hospitalName || null,
      confidence: '0.85',
      isReviewed: true,
      rawExtraction: extraction,
    })
    .onConflictDoUpdate({
      target: aiSummaries.documentId,
      set: {
        summary: extraction.summary || null,
        diagnosis: extraction.diagnosis || [],
        keyFindings: extraction.keyFindings || [],
        testValues: extraction.testValues || [],
        doctorName: extraction.doctorName || null,
        hospitalName: extraction.hospitalName || null,
        rawExtraction: extraction,
        isReviewed: true,
      },
    })

  // Step 3: Update document metadata (title, category, date, mark as processed + approved)
  await db
    .update(documents)
    .set({
      isProcessed: true,
      isApproved: true,
      ...(extraction.title ? { title: extraction.title } : {}),
      category: extraction.category || 'other',
      reportDate: extraction.reportDate || null,
    })
    .where(eq(documents.id, doc.id))

  // Step 4: Create medication entries
  if (extraction.medications?.length) {
    for (const med of extraction.medications) {
      await db.insert(medications).values({
        familyMemberId: doc.familyMemberId,
        documentId: doc.id,
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

  // Step 5: Create/link conditions from diagnosis
  if (extraction.diagnosis?.length) {
    for (const diagnosisName of extraction.diagnosis) {
      const [existing] = await db
        .select()
        .from(conditions)
        .where(
          and(
            eq(conditions.familyMemberId, doc.familyMemberId),
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
            familyMemberId: doc.familyMemberId,
            name: diagnosisName,
            firstDetected: extraction.reportDate || doc.reportDate || null,
            status: 'active',
          })
          .returning()
        conditionId = insertResult[0]!.id
      }

      await db
        .insert(documentConditions)
        .values({ documentId: doc.id, conditionId })
        .onConflictDoNothing()
    }
  }

  // Step 6: Create timeline events
  const validCategories = ['surgery', 'diagnosis', 'medication', 'lab', 'vaccination', 'hospitalization', 'consultation', 'other'] as const
  if (extraction.timelineEvents?.length) {
    for (const evt of extraction.timelineEvents) {
      const cat = validCategories.includes(evt.category as any) ? evt.category : 'other'
      await db.insert(timelineEvents).values({
        familyMemberId: doc.familyMemberId,
        documentId: doc.id,
        title: evt.title,
        eventDate: evt.eventDate || extraction.reportDate || doc.reportDate || null,
        category: cat,
        description: evt.description || null,
        sourceType: 'ai_extracted',
      })
    }
  }

  // Step 7: Generate health summary (non-blocking — errors don't fail the request)
  try {
    await updateHealthSummary(provider, doc.familyMemberId, doc.id)
  } catch (err) {
    console.error('[AI] Health summary generation failed:', err)
  }

  return { extraction }
})

async function updateHealthSummary(provider: ReturnType<typeof useAIProvider>, memberId: string, documentId: string) {
  const db = useDb()
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

  // Get current highest version
  const [existing] = await db
    .select({ version: memberHealthSummaries.version })
    .from(memberHealthSummaries)
    .where(eq(memberHealthSummaries.familyMemberId, memberId))
    .orderBy(desc(memberHealthSummaries.version))
    .limit(1)

  const version = (existing?.version || 0) + 1

  await db.insert(memberHealthSummaries).values({
    familyMemberId: memberId,
    summaryText: typeof parsed.summaryText === 'object'
      ? JSON.stringify(parsed.summaryText)
      : parsed.summaryText,
    conditions: ctx.conditions,
    alerts: parsed.alerts,
    recommendations: parsed.recommendations || {},
    lastUpdatedFromDocId: documentId,
    version,
  })
}
