import { eq, and, desc, inArray } from 'drizzle-orm'
import { useDb } from '~~/server/database'
import {
  familyMembers,
  medications,
  conditions,
  aiSummaries,
  documents,
  memberHealthSummaries,
  timelineEvents,
} from '~~/server/database/schema'

export interface HealthContext {
  member: {
    name: string
    age: number | null
    dob: string | null
    bloodGroup: string | null
    allergies: string[]
    dietPreference: string | null
  }
  conditions: { name: string; status: string; since: string | null }[]
  medications: {
    name: string
    dosage: string | null
    frequency: string | null
    purpose: string | null
    endDate: string | null
  }[]
  labValues: { testValues: any; reportDate: string | null; category: string | null }[]
  timeline: { title: string; eventDate: string | null; category: string }[]
  latestSummary: { summaryText: string | null; alerts: any; recommendations: any } | null
}

function calculateAge(dob: string | null): number | null {
  if (!dob) return null
  const birth = new Date(dob)
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const m = today.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
  return age
}

export async function gatherHealthContext(memberId: string): Promise<HealthContext> {
  const db = useDb()

  const [member] = await db
    .select({
      name: familyMembers.name,
      dob: familyMembers.dob,
      bloodGroup: familyMembers.bloodGroup,
      allergies: familyMembers.allergies,
      dietPreference: familyMembers.dietPreference,
    })
    .from(familyMembers)
    .where(eq(familyMembers.id, memberId))
    .limit(1)

  const memberConditions = await db
    .select()
    .from(conditions)
    .where(eq(conditions.familyMemberId, memberId))

  const memberMeds = await db
    .select()
    .from(medications)
    .where(
      and(
        eq(medications.familyMemberId, memberId),
        eq(medications.isActive, true),
      ),
    )

  // Get approved lab values from aiSummaries
  const approvedDocs = await db
    .select({
      testValues: aiSummaries.testValues,
      reportDate: documents.reportDate,
      category: documents.category,
    })
    .from(aiSummaries)
    .innerJoin(documents, eq(aiSummaries.documentId, documents.id))
    .where(
      and(
        eq(documents.familyMemberId, memberId),
        eq(documents.isProcessed, true),
      ),
    )
    .orderBy(desc(documents.reportDate))
    .limit(20)

  // Get timeline events
  const memberTimeline = await db
    .select({
      title: timelineEvents.title,
      eventDate: timelineEvents.eventDate,
      category: timelineEvents.category,
    })
    .from(timelineEvents)
    .where(eq(timelineEvents.familyMemberId, memberId))
    .orderBy(desc(timelineEvents.eventDate))
    .limit(50)

  const [latestSummary] = await db
    .select({
      summaryText: memberHealthSummaries.summaryText,
      alerts: memberHealthSummaries.alerts,
      recommendations: memberHealthSummaries.recommendations,
    })
    .from(memberHealthSummaries)
    .where(eq(memberHealthSummaries.familyMemberId, memberId))
    .orderBy(desc(memberHealthSummaries.version))
    .limit(1)

  return {
    member: {
      name: member?.name || 'Unknown',
      age: calculateAge(member?.dob || null),
      dob: member?.dob || null,
      bloodGroup: member?.bloodGroup || null,
      allergies: member?.allergies || [],
      dietPreference: member?.dietPreference || null,
    },
    conditions: memberConditions.map((c) => ({
      name: c.name,
      status: c.status,
      since: c.firstDetected,
    })),
    medications: memberMeds.map((m) => ({
      name: m.name,
      dosage: m.dosage,
      frequency: m.frequency,
      purpose: m.purpose,
      endDate: m.endDate,
    })),
    labValues: approvedDocs
      .filter((d) => d.testValues && (Array.isArray(d.testValues) ? d.testValues.length > 0 : true))
      .map((d) => ({
        testValues: d.testValues,
        reportDate: d.reportDate,
        category: d.category,
      })),
    timeline: memberTimeline.map((t) => ({
      title: t.title,
      eventDate: t.eventDate,
      category: t.category,
    })),
    latestSummary: latestSummary || null,
  }
}

// Lightweight context for chat — only metadata, no full report content
export interface LightHealthContext {
  member: HealthContext['member']
  conditions: { name: string; status: string }[]
  medications: { name: string; dosage: string | null; frequency: string | null }[]
  documents: { id: string; title: string; category: string | null; reportDate: string | null }[]
  latestSummaryExcerpt: string | null
}

export async function gatherLightHealthContext(memberId: string): Promise<LightHealthContext> {
  const db = useDb()

  const [member] = await db
    .select({
      name: familyMembers.name,
      dob: familyMembers.dob,
      bloodGroup: familyMembers.bloodGroup,
      allergies: familyMembers.allergies,
      dietPreference: familyMembers.dietPreference,
    })
    .from(familyMembers)
    .where(eq(familyMembers.id, memberId))
    .limit(1)

  const memberConditions = await db
    .select({ name: conditions.name, status: conditions.status })
    .from(conditions)
    .where(eq(conditions.familyMemberId, memberId))

  const memberMeds = await db
    .select({ name: medications.name, dosage: medications.dosage, frequency: medications.frequency })
    .from(medications)
    .where(and(eq(medications.familyMemberId, memberId), eq(medications.isActive, true)))

  const memberDocs = await db
    .select({
      id: documents.id,
      title: documents.title,
      category: documents.category,
      reportDate: documents.reportDate,
    })
    .from(documents)
    .where(and(eq(documents.familyMemberId, memberId), eq(documents.isProcessed, true)))
    .orderBy(desc(documents.reportDate))
    .limit(50)

  const [latestSummary] = await db
    .select({ summaryText: memberHealthSummaries.summaryText })
    .from(memberHealthSummaries)
    .where(eq(memberHealthSummaries.familyMemberId, memberId))
    .orderBy(desc(memberHealthSummaries.version))
    .limit(1)

  // Extract just the executive summary if available
  let excerpt: string | null = null
  if (latestSummary?.summaryText) {
    try {
      const parsed = typeof latestSummary.summaryText === 'string'
        ? JSON.parse(latestSummary.summaryText)
        : latestSummary.summaryText
      excerpt = parsed.executiveSummary || null
    } catch {
      excerpt = typeof latestSummary.summaryText === 'string'
        ? latestSummary.summaryText.slice(0, 300)
        : null
    }
  }

  return {
    member: {
      name: member?.name || 'Unknown',
      age: calculateAge(member?.dob || null),
      dob: member?.dob || null,
      bloodGroup: member?.bloodGroup || null,
      allergies: member?.allergies || [],
      dietPreference: member?.dietPreference || null,
    },
    conditions: memberConditions,
    medications: memberMeds,
    documents: memberDocs,
    latestSummaryExcerpt: excerpt,
  }
}

// Fetch full details for specific documents (by IDs)
export async function fetchDocumentDetails(documentIds: string[]) {
  if (!documentIds.length) return []
  const db = useDb()

  return db
    .select({
      id: documents.id,
      title: documents.title,
      category: documents.category,
      reportDate: documents.reportDate,
      summary: aiSummaries.summary,
      diagnosis: aiSummaries.diagnosis,
      keyFindings: aiSummaries.keyFindings,
      testValues: aiSummaries.testValues,
      doctorName: aiSummaries.doctorName,
      hospitalName: aiSummaries.hospitalName,
    })
    .from(documents)
    .innerJoin(aiSummaries, eq(aiSummaries.documentId, documents.id))
    .where(inArray(documents.id, documentIds))
}
