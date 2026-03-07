import { eq, and, desc } from 'drizzle-orm'
import { useDb } from '~~/server/database'
import {
  timelineEvents,
  familyMembers,
  documents,
  aiSummaries,
} from '~~/server/database/schema'
import { requireAuth } from '~~/server/utils/auth'
import { useAIProvider } from '~~/server/utils/ai-provider'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const memberId = getRouterParam(event, 'memberId')!
  const db = useDb()

  // Verify member belongs to user
  const [member] = await db
    .select({ id: familyMembers.id, name: familyMembers.name })
    .from(familyMembers)
    .where(
      and(eq(familyMembers.id, memberId), eq(familyMembers.userId, user.id)),
    )
    .limit(1)

  if (!member) {
    throw createError({ statusCode: 404, statusMessage: 'Member not found' })
  }

  // Gather all processed document summaries
  const docs = await db
    .select({
      docId: documents.id,
      title: documents.title,
      reportDate: documents.reportDate,
      category: documents.category,
      summary: aiSummaries.summary,
      diagnosis: aiSummaries.diagnosis,
      keyFindings: aiSummaries.keyFindings,
      doctorName: aiSummaries.doctorName,
      hospitalName: aiSummaries.hospitalName,
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

  if (!docs.length) {
    throw createError({
      statusCode: 400,
      statusMessage: 'No processed documents to generate timeline from',
    })
  }

  const today = new Date().toISOString().split('T')[0]
  const prompt = `Today's date is ${today}. You are a medical timeline extraction agent. Analyze the following medical document summaries for patient "${member.name}" and extract ALL significant medical events as a timeline.

For each event, provide:
- title: Short descriptive title (e.g., "Left Eye Cataract Surgery", "Diagnosed with Type 2 Diabetes", "Started Metformin 500mg")
- eventDate: YYYY-MM-DD format (use the document's report date if no specific event date)
- category: one of "surgery", "diagnosis", "medication", "lab", "vaccination", "hospitalization", "consultation", "other"
- description: Brief description with relevant details
- documentIndex: The index (0-based) of the source document from the list below

Extract events like: surgeries, procedures, diagnoses, hospital admissions/discharges, medication starts/stops, significant lab findings, vaccinations, consultations.

Return JSON: { "events": [...] }
IMPORTANT: Return ONLY valid JSON, no markdown fences, no extra text.`

  const docSummaries = docs.map((d, i) => ({
    index: i,
    title: d.title,
    date: d.reportDate,
    category: d.category,
    summary: d.summary,
    diagnosis: d.diagnosis,
    keyFindings: d.keyFindings,
    doctor: d.doctorName,
    hospital: d.hospitalName,
  }))

  const provider = useAIProvider()
  const result = await provider.generateJSON(prompt, JSON.stringify(docSummaries))

  const events = result.events || []

  // Delete old AI-extracted timeline events for this member
  await db
    .delete(timelineEvents)
    .where(
      and(
        eq(timelineEvents.familyMemberId, memberId),
        eq(timelineEvents.sourceType, 'ai_extracted'),
      ),
    )

  // Insert new events
  const validCategories = ['surgery', 'diagnosis', 'medication', 'lab', 'vaccination', 'hospitalization', 'consultation', 'other'] as const
  let insertedCount = 0
  for (const evt of events) {
    const docIndex = typeof evt.documentIndex === 'number' ? evt.documentIndex : null
    const sourceDoc = docIndex !== null && docIndex >= 0 && docIndex < docs.length
      ? docs[docIndex]
      : null
    const cat = validCategories.includes(evt.category as any) ? evt.category : 'other'

    await db.insert(timelineEvents).values({
      familyMemberId: memberId,
      documentId: sourceDoc?.docId || null,
      title: evt.title,
      eventDate: evt.eventDate || null,
      category: cat,
      description: evt.description || null,
      sourceType: 'ai_extracted',
    })
    insertedCount++
  }

  return { generated: insertedCount }
})
