<script setup lang="ts">
import { ChevronLeft, Pencil, MessageSquare, Loader, RefreshCw, Upload, AlertTriangle, Activity, FileText, Trash2, Plus, CheckCircle, X, UtensilsCrossed, CheckCircle2, Calendar, Droplets, Pill } from 'lucide-vue-next'
import type { FamilyMember } from '~/composables/useMembers'
import type { Document } from '~/composables/useDocuments'
import type { Medication } from '~/composables/useMedications'
import type { FollowUp } from '~/composables/useFollowUps'

const route = useRoute()
const router = useRouter()
const { deleteMember } = await useMembers()
const { isOverdue, isDueSoon, relativeDueDate } = useFollowUps()

const memberId = route.params.id as string
const activeTab = ref('overview')
const showDeleteDialog = ref(false)

const { data: member, pending, error } = await useFetch<FamilyMember>(
  `/api/members/${memberId}`,
)

// Fetch related data
const { data: memberDocs } = await useFetch<Document[]>('/api/documents', {
  query: { memberId },
})
const { data: memberMeds, refresh: refreshMeds } = await useFetch<Medication[]>('/api/medications', {
  query: { memberId },
})
const { data: memberConditions } = await useFetch<any[]>('/api/conditions', {
  query: { memberId },
})
const { data: healthSummary } = await useFetch<any>(`/api/members/${memberId}/health-summary`)
const { data: timelineEvents, refresh: refreshTimeline } = await useFetch<any[]>(`/api/timeline/${memberId}`)
const generatingTimeline = ref(false)
const regenerating = ref(false)
const showRegenerateDialog = ref(false)
const showDeleteMedDialog = ref(false)
const deletingMedId = ref<string | null>(null)

// Follow-ups state
const followUpFilter = ref<'pending' | 'completed' | 'dismissed' | 'all'>('pending')
const showAddFollowUpDialog = ref(false)
const newFollowUp = ref({ title: '', dueDate: '', instructions: '', doctorName: '', hospitalName: '' })

const { data: memberFollowUps, refresh: refreshFollowUps } = await useFetch<FollowUp[]>('/api/follow-ups', {
  query: computed(() => ({
    memberId,
    status: followUpFilter.value === 'all' ? 'all' : followUpFilter.value,
  })),
  watch: [followUpFilter],
})

const { data: pendingFollowUpsData } = await useFetch<FollowUp[]>('/api/follow-ups', {
  query: { memberId, status: 'pending' },
  key: `follow-ups-pending-count-${memberId}`,
})
const pendingFollowUpsCount = computed(() => pendingFollowUpsData.value?.length || 0)

function followUpDueDateColor(dueDate: string | null): string {
  if (!dueDate) return 'text-muted-foreground'
  if (isOverdue(dueDate)) return 'text-red-600 dark:text-red-400'
  if (isDueSoon(dueDate)) return 'text-amber-600 dark:text-amber-400'
  return 'text-green-600 dark:text-green-400'
}

async function completeFollowUp(id: string) {
  await $fetch(`/api/follow-ups/${id}`, { method: 'PUT', body: { status: 'completed' } })
  await refreshFollowUps()
}

async function dismissFollowUp(id: string) {
  await $fetch(`/api/follow-ups/${id}`, { method: 'PUT', body: { status: 'dismissed' } })
  await refreshFollowUps()
}

async function deleteFollowUp(id: string) {
  await $fetch(`/api/follow-ups/${id}`, { method: 'DELETE' })
  await refreshFollowUps()
}

async function handleAddFollowUp() {
  await $fetch('/api/follow-ups', {
    method: 'POST',
    body: {
      familyMemberId: memberId,
      title: newFollowUp.value.title,
      dueDate: newFollowUp.value.dueDate || null,
      instructions: newFollowUp.value.instructions || null,
      doctorName: newFollowUp.value.doctorName || null,
      hospitalName: newFollowUp.value.hospitalName || null,
    },
  })
  showAddFollowUpDialog.value = false
  newFollowUp.value = { title: '', dueDate: '', instructions: '', doctorName: '', hospitalName: '' }
  await refreshFollowUps()
}

// Diet plan state
const dietPlan = ref<any>(null)
const dietLoading = ref(false)
const dietDays = ref<1 | 7 | 30>(7)
const dietError = ref<string | null>(null)
const dietInstructions = ref('')

async function generateDiet() {
  dietLoading.value = true
  dietError.value = null
  dietPlan.value = null
  try {
    dietPlan.value = await $fetch(`/api/members/${memberId}/diet`, {
      method: 'POST',
      body: {
        days: dietDays.value,
        instructions: dietInstructions.value.trim() || undefined,
      },
    })
  } catch (err: any) {
    dietError.value = err?.data?.message || err?.message || 'Failed to generate diet plan'
  } finally {
    dietLoading.value = false
  }
}

// Deduplicate medications by name (keep most recent)
const uniqueMeds = computed(() => {
  if (!memberMeds.value) return []
  const seen = new Map<string, Medication>()
  for (const med of memberMeds.value) {
    const key = med.name.toLowerCase().trim()
    if (!seen.has(key)) {
      seen.set(key, med)
    }
  }
  return Array.from(seen.values())
})

async function confirmDeleteMed(id: string) {
  deletingMedId.value = id
  showDeleteMedDialog.value = true
}

async function handleDeleteMed() {
  if (!deletingMedId.value) return
  await $fetch(`/api/medications/${deletingMedId.value}`, { method: 'DELETE' })
  showDeleteMedDialog.value = false
  deletingMedId.value = null
  await refreshMeds()
}

async function generateTimeline() {
  generatingTimeline.value = true
  try {
    await $fetch(`/api/timeline/generate/${memberId}`, { method: 'POST' })
    await refreshTimeline()
  } catch (err: any) {
    console.error('Timeline generation failed:', err)
  } finally {
    generatingTimeline.value = false
  }
}

async function deleteTimelineEvent(eventId: string) {
  await $fetch(`/api/timeline/events/${eventId}`, { method: 'DELETE' })
  await refreshTimeline()
}

function formatTimelineDate(dateStr: string | null): string {
  if (!dateStr) return 'Unknown date'
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function categoryIcon(category: string): string {
  const icons: Record<string, string> = {
    surgery: 'M11 2a2 2 0 0 0-2 2v5H4a2 2 0 0 0-2 2v2c0 1.1.9 2 2 2h5v5c0 1.1.9 2 2 2h2a2 2 0 0 0 2-2v-5h5a2 2 0 0 0 2-2v-2a2 2 0 0 0-2-2h-5V4a2 2 0 0 0-2-2h-2z',
    diagnosis: 'M9 5H2v7l6.29 6.29c.94.94 2.48.94 3.42 0l4.58-4.58c.94-.94.94-2.48 0-3.42L9 5ZM6 9.5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3Z',
    medication: 'M10.5 20H4a2 2 0 0 1-2-2V5c0-1.1.9-2 2-2h3.93a2 2 0 0 1 1.66.9l.82 1.2a2 2 0 0 0 1.66.9H20a2 2 0 0 1 2 2v3',
    lab: 'M14 2v6a2 2 0 0 0 2 2h6M6 2a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6H6z',
    vaccination: 'M15 2c-1.35 1.5-2.09 3.45-2 5.5.09 2.05 1 4 2.5 5.5M9 14L4.5 9.5M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z',
    hospitalization: 'M3 7v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-6l-2-2H5a2 2 0 0 0-2 2Z',
    consultation: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z',
  }
  return icons[category] || icons.consultation
}

function categoryColor(category: string): string {
  const colors: Record<string, string> = {
    surgery: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    diagnosis: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    medication: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    lab: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    vaccination: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
    hospitalization: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    consultation: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400',
  }
  return colors[category] || 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400'
}

function getAge(dob: string | null): string {
  if (!dob) return 'Unknown'
  const birth = new Date(dob)
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const m = today.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
  return `${age} years`
}

function priorityColor(priority: string) {
  if (priority === 'high') return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
  if (priority === 'medium') return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300'
  return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
}

function metricStatusColor(status: string) {
  if (status === 'critical') return 'text-red-600 dark:text-red-400'
  if (status === 'warning') return 'text-orange-600 dark:text-orange-400'
  return 'text-green-600 dark:text-green-400'
}

function bmiCategoryColor(category: string | null) {
  if (category === 'Underweight') return 'text-amber-600 dark:text-amber-400'
  if (category === 'Normal') return 'text-emerald-600 dark:text-emerald-400'
  if (category === 'Overweight') return 'text-orange-600 dark:text-orange-400'
  if (category === 'Obese') return 'text-red-600 dark:text-red-400'
  return 'text-foreground'
}

async function handleDelete() {
  await deleteMember(memberId)
  router.push('/members')
}

async function deleteReport(docId: string) {
  await $fetch(`/api/documents/${docId}`, { method: 'DELETE' })
  await refreshNuxtData()
}

async function regenerateAll() {
  regenerating.value = true
  showRegenerateDialog.value = false
  try {
    await $fetch(`/api/members/${memberId}/regenerate`, { method: 'POST' })
    await refreshNuxtData()
  } catch (err: any) {
    console.error('Regeneration failed:', err)
  } finally {
    regenerating.value = false
  }
}
</script>

<template>
  <div v-if="pending" class="space-y-4">
    <div class="h-8 w-48 animate-pulse rounded bg-muted" />
    <div class="h-32 animate-pulse rounded-lg bg-muted" />
  </div>

  <div v-else-if="error" class="text-center py-16">
    <p class="text-destructive">Failed to load member</p>
    <NuxtLink to="/members"><Button variant="outline" class="mt-4">Back to Members</Button></NuxtLink>
  </div>

  <div v-else-if="member">
    <!-- Header -->
    <div class="mb-6">
      <div class="flex items-start justify-between">
        <div class="flex items-center gap-3">
          <Button variant="ghost" size="icon" class="shrink-0" @click="router.back()">
            <ChevronLeft class="h-4 w-4" />
          </Button>
          <div>
            <h1 class="text-xl font-bold tracking-tight">{{ member.name }}</h1>
            <div class="mt-0.5 flex items-center gap-2 text-sm text-muted-foreground">
              <span v-if="member.dob">{{ getAge(member.dob) }}</span>
              <span v-if="member.bloodGroup" class="font-semibold text-red-500 dark:text-red-400">{{ member.bloodGroup }}</span>
            </div>
          </div>
        </div>
        <div class="flex gap-1.5">
          <NuxtLink :to="`/members/${member.id}/edit`">
            <Button size="sm" variant="ghost" class="text-muted-foreground">
              <Pencil class="mr-1 h-3 w-3" />
              Edit
            </Button>
          </NuxtLink>
          <NuxtLink :to="`/members/${member.id}/chat`">
            <Button size="sm" variant="ghost" class="text-muted-foreground">
              <MessageSquare class="mr-1 h-3 w-3" />
              Chat
            </Button>
          </NuxtLink>
          <Button
            v-if="member.documentCount > 0"
            size="sm"
            variant="ghost"
            class="text-muted-foreground"
            :disabled="regenerating"
            @click="showRegenerateDialog = true"
          >
            <Loader v-if="regenerating" class="mr-1 h-3 w-3 animate-spin" />
            <RefreshCw v-else class="mr-1 h-3 w-3" />
            {{ regenerating ? 'Regenerating...' : 'Regenerate' }}
          </Button>
          <NuxtLink :to="`/documents/upload?memberId=${member.id}`">
            <Button size="sm">
              <Upload class="mr-1 h-3 w-3" />
              Upload
            </Button>
          </NuxtLink>
        </div>
      </div>
    </div>

    <!-- Emergency Info Strip -->
    <div class="mb-6 grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-7">
      <div class="rounded-lg border px-3 py-2.5">
        <span class="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Weight</span>
        <p class="text-sm font-medium">{{ member.weightKg ? `${member.weightKg} kg` : 'N/A' }}</p>
      </div>
      <div class="rounded-lg border px-3 py-2.5">
        <span class="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Height</span>
        <p class="text-sm font-medium">{{ member.heightCm ? `${member.heightCm} cm` : 'N/A' }}</p>
      </div>
      <div class="rounded-lg border px-3 py-2.5">
        <span class="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">BMI</span>
        <p class="text-sm font-bold" :class="bmiCategoryColor(member.bmiCategory)">
          {{ member.bmi ? member.bmi : 'N/A' }}
        </p>
        <p v-if="member.bmiCategory" class="text-[10px] text-muted-foreground">{{ member.bmiCategory }}</p>
      </div>
      <div class="rounded-lg border px-3 py-2.5">
        <span class="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Blood</span>
        <p class="text-sm font-bold text-red-500 dark:text-red-400">{{ member.bloodGroup || 'N/A' }}</p>
      </div>
      <div class="rounded-lg border px-3 py-2.5">
        <span class="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Allergies</span>
        <p class="text-sm font-medium truncate">{{ member.allergies?.join(', ') || 'None' }}</p>
      </div>
      <div class="rounded-lg border px-3 py-2.5">
        <span class="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Diet</span>
        <p class="text-sm font-medium capitalize">{{ member.dietPreference || 'N/A' }}</p>
      </div>
      <div class="rounded-lg border px-3 py-2.5">
        <span class="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Emergency</span>
        <p class="text-sm font-medium truncate">{{ member.emergencyContact || 'N/A' }}</p>
      </div>
      <div class="rounded-lg border px-3 py-2.5">
        <span class="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Active Meds</span>
        <p class="text-sm font-medium">{{ member.activeMedCount }}</p>
      </div>
    </div>

    <!-- Tabs -->
    <Tabs v-model="activeTab">
      <TabsList class="w-full justify-start">
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="timeline">Timeline</TabsTrigger>
        <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
        <TabsTrigger value="reports">Reports ({{ member.documentCount }})</TabsTrigger>
        <TabsTrigger value="medications">Medications ({{ member.activeMedCount }})</TabsTrigger>
        <TabsTrigger value="conditions">Conditions</TabsTrigger>
        <TabsTrigger value="follow-ups">
          Follow-Ups
          <Badge v-if="pendingFollowUpsCount > 0" variant="secondary" class="ml-1 h-5 min-w-5 px-1 text-xs">{{ pendingFollowUpsCount }}</Badge>
        </TabsTrigger>
        <TabsTrigger value="diet">Diet Plan</TabsTrigger>
      </TabsList>

      <!-- Overview Tab -->
      <TabsContent value="overview" class="mt-4 space-y-4">
        <template v-if="healthSummary?.summaryText">
          <!-- Executive Summary -->
          <Card>
            <CardHeader>
              <CardTitle class="text-base">Executive Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <p class="text-sm">
                {{ typeof healthSummary.summaryText === 'object' ? healthSummary.summaryText.executiveSummary : healthSummary.summaryText }}
              </p>
            </CardContent>
          </Card>

          <!-- Key Health Metrics -->
          <Card v-if="healthSummary.summaryText?.keyHealthMetrics?.length">
            <CardHeader>
              <CardTitle class="text-base">Key Health Metrics</CardTitle>
            </CardHeader>
            <CardContent>
              <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <div
                  v-for="(metric, i) in healthSummary.summaryText.keyHealthMetrics"
                  :key="i"
                  class="flex items-center justify-between rounded-lg border p-3"
                >
                  <span class="text-sm text-muted-foreground">{{ metric.label }}</span>
                  <span class="text-sm font-semibold" :class="metricStatusColor(metric.status || 'normal')">{{ metric.value }}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <!-- Risk Factors -->
          <Card v-if="healthSummary.summaryText?.riskFactors?.length">
            <CardHeader>
              <CardTitle class="text-base">Risk Factors</CardTitle>
            </CardHeader>
            <CardContent>
              <ul class="space-y-1.5">
                <li v-for="(risk, i) in healthSummary.summaryText.riskFactors" :key="i" class="flex items-start gap-2 text-sm">
                  <AlertTriangle class="mt-0.5 h-4 w-4 shrink-0 text-orange-500" />
                  {{ risk }}
                </li>
              </ul>
            </CardContent>
          </Card>

          <!-- Trends -->
          <Card v-if="healthSummary.summaryText?.trends?.length">
            <CardHeader>
              <CardTitle class="text-base">Trends</CardTitle>
            </CardHeader>
            <CardContent>
              <ul class="space-y-1.5">
                <li v-for="(trend, i) in healthSummary.summaryText.trends" :key="i" class="flex items-start gap-2 text-sm">
                  <Activity class="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
                  {{ trend }}
                </li>
              </ul>
            </CardContent>
          </Card>

          <!-- Alerts -->
          <div v-if="(healthSummary.alerts as any[])?.length" class="space-y-2">
            <h3 class="text-sm font-semibold">Alerts</h3>
            <div
              v-for="(alert, i) in (healthSummary.alerts as any[])"
              :key="i"
              class="flex items-start gap-2 rounded-md p-3 text-sm"
              :class="{
                'bg-red-50 text-red-800 dark:bg-red-950/30 dark:text-red-300': alert.type === 'critical',
                'bg-orange-50 text-orange-800 dark:bg-orange-950/30 dark:text-orange-300': alert.type === 'warning',
                'bg-blue-50 text-blue-800 dark:bg-blue-950/30 dark:text-blue-300': alert.type === 'info',
              }"
            >
              <AlertTriangle class="mt-0.5 h-4 w-4 shrink-0" />
              {{ alert.message }}
            </div>
          </div>
        </template>

        <Card v-else>
          <CardContent class="py-8 text-center">
            <p class="text-sm text-muted-foreground">
              Upload medical reports to generate a health summary for {{ member.name }}.
            </p>
          </CardContent>
        </Card>
      </TabsContent>

      <!-- Timeline Tab -->
      <TabsContent value="timeline" class="mt-4">
        <div class="mb-4 flex items-center justify-between">
          <h3 class="text-sm font-semibold text-muted-foreground">Medical Timeline</h3>
          <Button
            size="sm"
            variant="outline"
            :disabled="generatingTimeline"
            @click="generateTimeline"
          >
            <Loader v-if="generatingTimeline" class="mr-1 h-3 w-3 animate-spin" />
            <RefreshCw v-else class="mr-1 h-3 w-3" />
            {{ generatingTimeline ? 'Generating...' : 'Regenerate Timeline' }}
          </Button>
        </div>

        <div v-if="timelineEvents?.length" class="relative">
          <!-- Timeline line -->
          <div class="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />

          <div class="space-y-4">
            <div
              v-for="evt in timelineEvents"
              :key="evt.id"
              class="relative flex gap-4 pl-10"
            >
              <!-- Timeline dot -->
              <div
                class="absolute left-2.5 top-3 h-3 w-3 rounded-full border-2 border-background"
                :class="categoryColor(evt.category)"
              />

              <Card class="flex-1">
                <CardContent class="p-4">
                  <div class="flex items-start justify-between gap-2">
                    <div class="flex-1">
                      <div class="flex items-center gap-2 mb-1">
                        <Badge
                          variant="secondary"
                          :class="categoryColor(evt.category)"
                          class="text-xs capitalize"
                        >
                          {{ evt.category }}
                        </Badge>
                        <span class="text-xs text-muted-foreground">
                          {{ formatTimelineDate(evt.eventDate) }}
                        </span>
                      </div>
                      <h4 class="font-medium text-sm">{{ evt.title }}</h4>
                      <p v-if="evt.description" class="mt-1 text-xs text-muted-foreground">
                        {{ evt.description }}
                      </p>
                      <NuxtLink
                        v-if="evt.documentId"
                        :to="`/documents/${evt.documentId}`"
                        class="mt-1.5 inline-flex items-center gap-1 text-xs text-primary hover:underline"
                      >
                        <FileText class="h-3 w-3" />
                        {{ evt.documentTitle || 'View Document' }}
                      </NuxtLink>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      class="h-6 w-6 shrink-0 text-muted-foreground hover:text-destructive"
                      @click="deleteTimelineEvent(evt.id)"
                    >
                      <Trash2 class="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        <Card v-else>
          <CardContent class="py-8 text-center">
            <p class="text-sm text-muted-foreground mb-3">
              No timeline events yet. Upload medical reports to auto-extract events, or generate a timeline from existing documents.
            </p>
            <Button
              v-if="member.documentCount > 0"
              size="sm"
              :disabled="generatingTimeline"
              @click="generateTimeline"
            >
              {{ generatingTimeline ? 'Generating...' : 'Generate Timeline' }}
            </Button>
          </CardContent>
        </Card>
      </TabsContent>

      <!-- Recommendations Tab -->
      <TabsContent value="recommendations" class="mt-4 space-y-4">
        <template v-if="healthSummary?.recommendations">
          <!-- Exercise -->
          <Card v-if="healthSummary.recommendations.exercise?.length">
            <CardHeader>
              <CardTitle class="text-base flex items-center gap-2">
                <Activity class="h-4 w-4" />
                Exercise &amp; Walking
              </CardTitle>
            </CardHeader>
            <CardContent class="space-y-3">
              <div
                v-for="(rec, i) in healthSummary.recommendations.exercise"
                :key="i"
                class="rounded-lg border p-3"
              >
                <div class="flex items-center justify-between mb-1">
                  <h4 class="text-sm font-medium">{{ rec.title }}</h4>
                  <Badge :class="priorityColor(rec.priority)" class="text-xs">{{ rec.priority }}</Badge>
                </div>
                <p class="text-sm text-muted-foreground">{{ rec.description }}</p>
                <p v-if="rec.frequency" class="mt-1 text-xs text-muted-foreground">Frequency: {{ rec.frequency }}</p>
              </div>
            </CardContent>
          </Card>

          <!-- Diet -->
          <Card v-if="healthSummary.recommendations.diet?.length">
            <CardHeader>
              <CardTitle class="text-base flex items-center gap-2">
                <UtensilsCrossed class="h-4 w-4" />
                Diet
              </CardTitle>
            </CardHeader>
            <CardContent class="space-y-3">
              <div
                v-for="(rec, i) in healthSummary.recommendations.diet"
                :key="i"
                class="rounded-lg border p-3"
              >
                <div class="flex items-center justify-between mb-1">
                  <h4 class="text-sm font-medium">{{ rec.title }}</h4>
                  <Badge :class="priorityColor(rec.priority)" class="text-xs">{{ rec.priority }}</Badge>
                </div>
                <p class="text-sm text-muted-foreground">{{ rec.description }}</p>
              </div>
            </CardContent>
          </Card>

          <!-- Lifestyle -->
          <Card v-if="healthSummary.recommendations.lifestyle?.length">
            <CardHeader>
              <CardTitle class="text-base flex items-center gap-2">
                <CheckCircle2 class="h-4 w-4" />
                Lifestyle
              </CardTitle>
            </CardHeader>
            <CardContent class="space-y-3">
              <div
                v-for="(rec, i) in healthSummary.recommendations.lifestyle"
                :key="i"
                class="rounded-lg border p-3"
              >
                <div class="flex items-center justify-between mb-1">
                  <h4 class="text-sm font-medium">{{ rec.title }}</h4>
                  <Badge :class="priorityColor(rec.priority)" class="text-xs">{{ rec.priority }}</Badge>
                </div>
                <p class="text-sm text-muted-foreground">{{ rec.description }}</p>
              </div>
            </CardContent>
          </Card>

          <!-- Monitoring -->
          <Card v-if="healthSummary.recommendations.monitoring?.length">
            <CardHeader>
              <CardTitle class="text-base flex items-center gap-2">
                <Calendar class="h-4 w-4" />
                Monitoring Schedule
              </CardTitle>
            </CardHeader>
            <CardContent class="space-y-3">
              <div
                v-for="(rec, i) in healthSummary.recommendations.monitoring"
                :key="i"
                class="rounded-lg border p-3"
              >
                <div class="flex items-center justify-between mb-1">
                  <h4 class="text-sm font-medium">{{ rec.testName }}</h4>
                  <Badge :class="priorityColor(rec.priority)" class="text-xs">{{ rec.priority }}</Badge>
                </div>
                <p class="text-sm text-muted-foreground">{{ rec.reason }}</p>
                <p v-if="rec.suggestedInterval" class="mt-1 text-xs text-muted-foreground">Interval: {{ rec.suggestedInterval }}</p>
              </div>
            </CardContent>
          </Card>
        </template>

        <Card v-else>
          <CardContent class="py-8 text-center">
            <p class="text-sm text-muted-foreground">
              No recommendations yet. Upload medical reports to get personalized recommendations.
            </p>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="reports" class="mt-4">
        <div v-if="memberDocs?.length" class="space-y-2">
          <DocumentCard v-for="doc in memberDocs" :key="doc.id" :document="doc" @delete="deleteReport" />
        </div>
        <div v-else class="text-center py-8 text-sm text-muted-foreground">
          <p>No reports uploaded yet</p>
          <NuxtLink :to="`/documents/upload?memberId=${member.id}`">
            <Button variant="outline" class="mt-2" size="sm">Upload First Report</Button>
          </NuxtLink>
        </div>
      </TabsContent>

      <TabsContent value="medications" class="mt-4">
        <div v-if="uniqueMeds.length" class="space-y-2">
          <MedicationCard v-for="med in uniqueMeds" :key="med.id" :medication="med" @delete="confirmDeleteMed" />
        </div>
        <div v-else class="text-center py-8 text-sm text-muted-foreground">
          <p>No medications recorded yet</p>
        </div>
      </TabsContent>

      <TabsContent value="conditions" class="mt-4">
        <div v-if="memberConditions?.length" class="space-y-2">
          <Card v-for="cond in memberConditions" :key="cond.id">
            <CardContent class="flex items-center justify-between p-4">
              <div>
                <h4 class="font-medium">{{ cond.name }}</h4>
                <p class="text-xs text-muted-foreground">
                  <span v-if="cond.firstDetected">Since {{ cond.firstDetected }}</span>
                  <span v-if="cond.documentCount"> &middot; {{ cond.documentCount }} report{{ cond.documentCount !== 1 ? 's' : '' }}</span>
                </p>
              </div>
              <Badge
                :variant="cond.status === 'active' ? 'default' : cond.status === 'monitoring' ? 'secondary' : 'outline'"
                class="text-xs"
              >
                {{ cond.status }}
              </Badge>
            </CardContent>
          </Card>
        </div>
        <div v-else class="text-center py-8 text-sm text-muted-foreground">
          <p>No conditions recorded yet</p>
        </div>
      </TabsContent>

      <!-- Follow-Ups Tab -->
      <TabsContent value="follow-ups" class="mt-4">
        <div class="mb-4 flex items-center justify-between">
          <div class="flex items-center gap-1.5 rounded-lg border p-1">
            <button
              v-for="opt in (['pending', 'completed', 'dismissed', 'all'] as const)"
              :key="opt"
              class="rounded-md px-3 py-1.5 text-sm font-medium capitalize transition-colors"
              :class="followUpFilter === opt ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'"
              @click="followUpFilter = opt"
            >
              {{ opt }}
            </button>
          </div>
          <Button size="sm" @click="showAddFollowUpDialog = true">
            <Plus class="mr-1 h-3 w-3" />
            Add Follow-Up
          </Button>
        </div>

        <div v-if="memberFollowUps?.length" class="space-y-2">
          <Card v-for="fu in memberFollowUps" :key="fu.id">
            <CardContent class="p-4">
              <div class="flex items-start justify-between gap-2">
                <div class="flex-1 min-w-0" :class="{ 'opacity-50': fu.status === 'completed' || fu.status === 'dismissed' }">
                  <div class="flex items-center gap-2 mb-1">
                    <h4 class="text-sm font-medium" :class="{ 'line-through': fu.status === 'completed' }">{{ fu.title }}</h4>
                    <Badge v-if="fu.sourceType === 'ai_extracted'" variant="secondary" class="text-xs">AI</Badge>
                    <Badge v-else variant="outline" class="text-xs">Manual</Badge>
                  </div>
                  <p class="text-xs font-medium" :class="fu.status === 'pending' ? followUpDueDateColor(fu.dueDate) : 'text-muted-foreground'">
                    {{ relativeDueDate(fu.dueDate) }}
                  </p>
                  <p v-if="fu.instructions" class="mt-1 text-xs text-muted-foreground">{{ fu.instructions }}</p>
                  <div class="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                    <span v-if="fu.doctorName">Dr. {{ fu.doctorName }}</span>
                    <span v-if="fu.hospitalName">{{ fu.hospitalName }}</span>
                  </div>
                  <NuxtLink
                    v-if="fu.documentId"
                    :to="`/documents/${fu.documentId}`"
                    class="mt-1 inline-flex items-center gap-1 text-xs text-primary hover:underline"
                  >
                    <FileText class="h-3 w-3" />
                    {{ fu.documentTitle || 'View Document' }}
                  </NuxtLink>
                </div>
                <div class="flex shrink-0 gap-1">
                  <Button
                    v-if="fu.status === 'pending'"
                    variant="ghost"
                    size="icon"
                    class="h-7 w-7 text-green-600 hover:text-green-700 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-950/30"
                    title="Complete"
                    @click="completeFollowUp(fu.id)"
                  >
                    <CheckCircle class="h-4 w-4" />
                  </Button>
                  <Button
                    v-if="fu.status === 'pending'"
                    variant="ghost"
                    size="icon"
                    class="h-7 w-7 text-muted-foreground hover:text-orange-600"
                    title="Dismiss"
                    @click="dismissFollowUp(fu.id)"
                  >
                    <X class="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    class="h-7 w-7 text-muted-foreground hover:text-destructive"
                    title="Delete"
                    @click="deleteFollowUp(fu.id)"
                  >
                    <Trash2 class="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        <Card v-else>
          <CardContent class="py-8 text-center">
            <p class="text-sm text-muted-foreground">No follow-ups found</p>
          </CardContent>
        </Card>
      </TabsContent>

      <!-- Diet Plan Tab -->
      <TabsContent value="diet" class="mt-4 space-y-4">
        <!-- Controls -->
        <div class="space-y-4">
          <div class="space-y-2">
            <Label for="member-diet-instructions">Additional instructions (optional)</Label>
            <Textarea
              id="member-diet-instructions"
              v-model="dietInstructions"
              rows="4"
              maxlength="2000"
              placeholder="Example: prefer Indian vegetarian meals, include higher-protein breakfast options, or keep prep simple for weekdays."
            />
            <p class="text-xs text-muted-foreground">
              These instructions are forwarded to the AI when generating the diet plan.
            </p>
          </div>

          <div class="flex items-center gap-3 flex-wrap">
            <div class="flex items-center gap-1.5 rounded-lg border p-1">
            <button
              v-for="opt in [1, 7, 30] as const"
              :key="opt"
              class="rounded-md px-3 py-1.5 text-sm font-medium transition-colors"
              :class="dietDays === opt ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'"
              @click="dietDays = opt"
            >
              {{ opt === 1 ? '1 Day' : opt === 7 ? '7 Days' : '30 Days' }}
            </button>
            </div>
            <Button size="sm" :disabled="dietLoading" @click="generateDiet">
              <Loader v-if="dietLoading" class="mr-1.5 h-3 w-3 animate-spin" />
              <UtensilsCrossed v-else class="mr-1.5 h-3 w-3" />
              {{ dietLoading ? 'Generating...' : 'Generate Diet Plan' }}
            </Button>
          </div>
        </div>

        <!-- Error -->
        <div v-if="dietError" class="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          {{ dietError }}
        </div>

        <!-- Loading skeleton -->
        <div v-if="dietLoading" class="space-y-3">
          <div v-for="i in 3" :key="i" class="h-24 animate-pulse rounded-lg bg-muted" />
        </div>

        <!-- Diet Plan Results -->
        <template v-if="dietPlan && !dietLoading">
          <!-- Overview -->
          <Card>
            <CardHeader>
              <CardTitle class="text-base flex items-center gap-2">
                <UtensilsCrossed class="h-4 w-4" />
                Diet Overview
              </CardTitle>
            </CardHeader>
            <CardContent class="space-y-3">
              <p class="text-sm">{{ dietPlan.overview }}</p>
              <p v-if="dietPlan.dailyCalorieTarget" class="text-sm">
                <span class="font-medium">Daily Calories:</span> {{ dietPlan.dailyCalorieTarget }}
              </p>
              <div v-if="dietPlan.keyGuidelines?.length">
                <h4 class="text-sm font-medium mb-1.5">Key Guidelines</h4>
                <ul class="space-y-1">
                  <li v-for="(g, i) in dietPlan.keyGuidelines" :key="i" class="flex items-start gap-2 text-sm text-muted-foreground">
                    <CheckCircle class="mt-0.5 h-3 w-3 shrink-0 text-green-500" />
                    {{ g }}
                  </li>
                </ul>
              </div>
            </CardContent>
          </Card>

          <!-- Foods To Favor / Avoid -->
          <div class="grid gap-4 sm:grid-cols-2">
            <Card v-if="dietPlan.foodsToFavor?.length">
              <CardHeader>
                <CardTitle class="text-sm text-green-600 dark:text-green-400">Foods to Favor</CardTitle>
              </CardHeader>
              <CardContent>
                <div class="flex flex-wrap gap-1.5">
                  <Badge v-for="(f, i) in dietPlan.foodsToFavor" :key="i" variant="secondary" class="bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400 text-xs">
                    {{ f }}
                  </Badge>
                </div>
              </CardContent>
            </Card>
            <Card v-if="dietPlan.foodsToAvoid?.length">
              <CardHeader>
                <CardTitle class="text-sm text-red-600 dark:text-red-400">Foods to Avoid</CardTitle>
              </CardHeader>
              <CardContent>
                <div class="flex flex-wrap gap-1.5">
                  <Badge v-for="(f, i) in dietPlan.foodsToAvoid" :key="i" variant="secondary" class="bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400 text-xs">
                    {{ f }}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>

          <!-- Daily Meal Plans -->
          <div v-for="day in dietPlan.days" :key="day.day" class="space-y-2">
            <h3 class="text-sm font-semibold text-muted-foreground">Day {{ day.day }}</h3>
            <Card>
              <CardContent class="p-4 space-y-4">
                <div
                  v-for="(meal, mealKey) in day.meals"
                  :key="mealKey"
                  class="border-b last:border-0 pb-3 last:pb-0"
                >
                  <div class="flex items-center gap-2 mb-1">
                    <span class="text-sm font-medium capitalize">{{ String(mealKey).replace(/([A-Z])/g, ' $1').trim() }}</span>
                    <span v-if="meal?.time" class="text-xs text-muted-foreground">{{ meal.time }}</span>
                  </div>
                  <ul v-if="meal?.items?.length" class="ml-4 space-y-0.5">
                    <li v-for="(item, j) in meal.items" :key="j" class="text-sm text-muted-foreground list-disc">
                      {{ item }}
                    </li>
                  </ul>
                  <p v-if="meal?.notes" class="mt-1 text-xs text-muted-foreground/70 italic">{{ meal.notes }}</p>
                </div>

                <div v-if="day.hydration" class="flex items-start gap-2 pt-1">
                  <Droplets class="mt-0.5 h-3.5 w-3.5 shrink-0 text-blue-500" />
                  <span class="text-xs text-muted-foreground">{{ day.hydration }}</span>
                </div>

                <div v-if="day.supplements?.length" class="flex items-start gap-2">
                  <Pill class="mt-0.5 h-3.5 w-3.5 shrink-0 text-purple-500" />
                  <span class="text-xs text-muted-foreground">Supplements: {{ day.supplements.join(', ') }}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </template>

        <!-- Empty state -->
        <Card v-if="!dietPlan && !dietLoading && !dietError">
          <CardContent class="py-8 text-center">
            <p class="text-sm text-muted-foreground">
              Generate a personalized diet plan for {{ member.name }} based on their health profile, conditions, and medications.
            </p>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>

    <!-- Regenerate All Dialog -->
    <AlertDialog v-model:open="showRegenerateDialog">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Regenerate All Data?</AlertDialogTitle>
          <AlertDialogDescription>
            This will clear all conditions, medications, timeline events, and health summaries for {{ member.name }}, then regenerate everything from the existing report extractions. The uploaded reports themselves will not be affected.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction @click="regenerateAll">
            Regenerate
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    <!-- Delete Dialog -->
    <AlertDialog v-model:open="showDeleteDialog">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Archive {{ member.name }}?</AlertDialogTitle>
          <AlertDialogDescription>
            This will archive this family member's profile. Their records will be preserved but hidden from view.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction @click="handleDelete" class="bg-destructive text-destructive-foreground">
            Archive
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    <!-- Add Follow-Up Dialog -->
    <AlertDialog v-model:open="showAddFollowUpDialog">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Add Follow-Up</AlertDialogTitle>
          <AlertDialogDescription>
            Create a manual follow-up reminder for {{ member.name }}.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div class="space-y-3 py-2">
          <div class="space-y-1.5">
            <Label for="fu-title">Title *</Label>
            <Input id="fu-title" v-model="newFollowUp.title" placeholder="e.g., Follow-up with Dr. Smith" />
          </div>
          <div class="space-y-1.5">
            <Label for="fu-date">Due Date</Label>
            <Input id="fu-date" v-model="newFollowUp.dueDate" type="date" />
          </div>
          <div class="space-y-1.5">
            <Label for="fu-instructions">Instructions</Label>
            <Textarea id="fu-instructions" v-model="newFollowUp.instructions" rows="2" placeholder="e.g., Bring fasting blood sugar report" />
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div class="space-y-1.5">
              <Label for="fu-doctor">Doctor Name</Label>
              <Input id="fu-doctor" v-model="newFollowUp.doctorName" placeholder="Dr. Name" />
            </div>
            <div class="space-y-1.5">
              <Label for="fu-hospital">Hospital</Label>
              <Input id="fu-hospital" v-model="newFollowUp.hospitalName" placeholder="Hospital name" />
            </div>
          </div>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction :disabled="!newFollowUp.title.trim()" @click="handleAddFollowUp">
            Add Follow-Up
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    <!-- Delete Medication Dialog -->
    <AlertDialog v-model:open="showDeleteMedDialog">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Medication?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently remove this medication from the records. This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction @click="handleDeleteMed" class="bg-destructive text-destructive-foreground">
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>
</template>
