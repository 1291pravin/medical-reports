<script setup lang="ts">
import {
  Users,
  FileText,
  Pill,
  Clock,
  Upload,
  UserPlus,
  Search,
  CheckCircle,
  X,
  Activity,
} from 'lucide-vue-next'

const { user } = useUserSession()
const { members, loading } = await useMembers()
const { followUps, loading: followUpsLoading, fetchFollowUps, updateFollowUp, isOverdue, isDueSoon, relativeDueDate } = useFollowUps()

const firstName = computed(() => user.value?.name?.split(' ')[0] || 'there')

const greeting = computed(() => {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
})

// Fetch data
await fetchFollowUps({ status: 'pending' })

const { data: stats } = await useFetch('/api/dashboard/stats')
const { data: recentActivity } = await useFetch('/api/dashboard/activity')

const upcomingFollowUps = computed(() => followUps.value.slice(0, 5))

function dueDateColor(dueDate: string | null): string {
  if (!dueDate) return 'text-muted-foreground'
  if (isOverdue(dueDate)) return 'text-red-600 dark:text-red-400'
  if (isDueSoon(dueDate)) return 'text-amber-600 dark:text-amber-400'
  return 'text-green-600 dark:text-green-400'
}

async function completeFollowUp(id: string) {
  await updateFollowUp(id, { status: 'completed' })
  await fetchFollowUps({ status: 'pending' })
}

async function dismissFollowUp(id: string) {
  await updateFollowUp(id, { status: 'dismissed' })
  await fetchFollowUps({ status: 'pending' })
}

const categoryLabels: Record<string, string> = {
  lab_report: 'Lab Report',
  prescription: 'Prescription',
  scan: 'Scan',
  discharge_summary: 'Discharge',
  vaccination: 'Vaccination',
  insurance: 'Insurance',
  other: 'Other',
}

function formatDate(date: string | null): string {
  if (!date) return ''
  return new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}
</script>

<template>
  <div class="mx-auto max-w-4xl">
    <!-- Onboarding for new users -->
    <OnboardingWizard v-if="members.length === 0" />

    <!-- Greeting -->
    <div class="mb-6">
      <p class="text-sm font-medium text-primary">{{ greeting }}</p>
      <h1 class="text-2xl font-bold tracking-tight">{{ firstName }}</h1>
    </div>

    <!-- Stats Cards -->
    <div class="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
      <div class="rounded-xl border bg-card p-4">
        <div class="flex items-center gap-3">
          <div class="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Users class="h-4 w-4" />
          </div>
          <div>
            <p class="text-2xl font-bold">{{ stats?.totalMembers ?? 0 }}</p>
            <p class="text-[11px] text-muted-foreground">Members</p>
          </div>
        </div>
      </div>
      <div class="rounded-xl border bg-card p-4">
        <div class="flex items-center gap-3">
          <div class="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-50 text-sky-600 dark:bg-sky-950/30 dark:text-sky-400">
            <FileText class="h-4 w-4" />
          </div>
          <div>
            <p class="text-2xl font-bold">{{ stats?.totalDocuments ?? 0 }}</p>
            <p class="text-[11px] text-muted-foreground">Reports</p>
          </div>
        </div>
      </div>
      <div class="rounded-xl border bg-card p-4">
        <div class="flex items-center gap-3">
          <div class="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400">
            <Pill class="h-4 w-4" />
          </div>
          <div>
            <p class="text-2xl font-bold">{{ stats?.activeMedications ?? 0 }}</p>
            <p class="text-[11px] text-muted-foreground">Active Meds</p>
          </div>
        </div>
      </div>
      <div class="rounded-xl border bg-card p-4">
        <div class="flex items-center gap-3">
          <div class="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400">
            <Clock class="h-4 w-4" />
          </div>
          <div>
            <p class="text-2xl font-bold">{{ stats?.pendingFollowUps ?? 0 }}</p>
            <p class="text-[11px] text-muted-foreground">Follow-Ups</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Quick Actions -->
    <div class="mb-6 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
      <NuxtLink to="/documents/upload" class="group">
        <div class="flex flex-col items-center gap-2.5 rounded-xl border bg-card p-4 text-center transition-all group-hover:border-primary/30 group-hover:shadow-sm">
          <div class="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary transition-colors group-hover:bg-primary/15">
            <Upload class="h-[18px] w-[18px]" />
          </div>
          <span class="text-xs font-medium">Upload Report</span>
        </div>
      </NuxtLink>

      <NuxtLink to="/members/add" class="group">
        <div class="flex flex-col items-center gap-2.5 rounded-xl border bg-card p-4 text-center transition-all group-hover:border-emerald-300/50 group-hover:shadow-sm">
          <div class="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 transition-colors group-hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-400">
            <UserPlus class="h-[18px] w-[18px]" />
          </div>
          <span class="text-xs font-medium">Add Member</span>
        </div>
      </NuxtLink>

      <NuxtLink to="/medications" class="group">
        <div class="flex flex-col items-center gap-2.5 rounded-xl border bg-card p-4 text-center transition-all group-hover:border-amber-300/50 group-hover:shadow-sm">
          <div class="flex h-10 w-10 items-center justify-center rounded-full bg-amber-50 text-amber-600 transition-colors group-hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-400">
            <Pill class="h-[18px] w-[18px]" />
          </div>
          <span class="text-xs font-medium">Medications</span>
        </div>
      </NuxtLink>

      <NuxtLink to="/search" class="group">
        <div class="flex flex-col items-center gap-2.5 rounded-xl border bg-card p-4 text-center transition-all group-hover:border-sky-300/50 group-hover:shadow-sm">
          <div class="flex h-10 w-10 items-center justify-center rounded-full bg-sky-50 text-sky-600 transition-colors group-hover:bg-sky-100 dark:bg-sky-950/40 dark:text-sky-400">
            <Search class="h-[18px] w-[18px]" />
          </div>
          <span class="text-xs font-medium">Search</span>
        </div>
      </NuxtLink>
    </div>

    <div class="grid gap-6 lg:grid-cols-2">
      <!-- Left Column -->
      <div class="space-y-6">
        <!-- Recent Activity -->
        <div v-if="recentActivity?.length">
          <h2 class="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Recent Activity</h2>
          <div class="space-y-2">
            <NuxtLink
              v-for="doc in recentActivity"
              :key="doc.id"
              :to="`/documents/${doc.id}`"
              class="group block"
            >
              <div class="flex items-center gap-3 rounded-xl border bg-card p-3 transition-all group-hover:border-primary/25 group-hover:shadow-sm">
                <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sky-50 text-sky-600 dark:bg-sky-950/30 dark:text-sky-400">
                  <FileText class="h-4 w-4" />
                </div>
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-medium truncate">{{ doc.title }}</p>
                  <p class="text-[11px] text-muted-foreground">
                    {{ doc.memberName }}
                    <span v-if="doc.reportDate"> &middot; {{ formatDate(doc.reportDate) }}</span>
                  </p>
                </div>
                <Badge v-if="doc.category" variant="secondary" class="text-[10px] shrink-0">
                  {{ categoryLabels[doc.category] || doc.category }}
                </Badge>
              </div>
            </NuxtLink>
          </div>
        </div>

        <!-- Family Members -->
        <div>
          <div class="mb-3 flex items-center justify-between">
            <h2 class="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Family Members</h2>
            <NuxtLink to="/members" class="text-xs font-medium text-primary hover:underline">View all</NuxtLink>
          </div>

          <div v-if="loading" class="space-y-2.5">
            <div v-for="i in 2" :key="i" class="h-[72px] animate-pulse rounded-lg bg-muted/60" />
          </div>

          <div v-else-if="members.length === 0" class="rounded-xl border border-dashed py-10 text-center">
            <div class="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <Users class="h-5 w-5 text-muted-foreground" />
            </div>
            <p class="text-sm text-muted-foreground">No family members added yet</p>
            <NuxtLink to="/members/add">
              <Button variant="outline" size="sm" class="mt-3">Add Your First Member</Button>
            </NuxtLink>
          </div>

          <div v-else class="space-y-2">
            <MemberCard v-for="member in members" :key="member.id" :member="member" />
          </div>
        </div>
      </div>

      <!-- Right Column -->
      <div>
        <!-- Upcoming Follow-Ups -->
        <div>
          <div class="mb-3 flex items-center justify-between">
            <h2 class="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Upcoming Follow-Ups</h2>
          </div>

          <div v-if="upcomingFollowUps.length" class="space-y-2">
            <div
              v-for="fu in upcomingFollowUps"
              :key="fu.id"
              class="flex items-center gap-3 rounded-xl border bg-card p-3 transition-all"
            >
              <div class="flex-1 min-w-0">
                <p class="text-xs text-muted-foreground">{{ fu.memberName }}</p>
                <p class="text-sm font-medium truncate">{{ fu.title }}</p>
                <p class="text-xs font-medium" :class="dueDateColor(fu.dueDate)">
                  {{ relativeDueDate(fu.dueDate) }}
                </p>
                <p v-if="fu.instructions" class="mt-0.5 text-xs text-muted-foreground truncate">
                  {{ fu.instructions }}
                </p>
              </div>
              <div class="flex shrink-0 gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  class="h-7 w-7 text-green-600 hover:text-green-700 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-950/30"
                  title="Complete"
                  @click="completeFollowUp(fu.id)"
                >
                  <CheckCircle class="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  class="h-7 w-7 text-muted-foreground hover:text-destructive"
                  title="Dismiss"
                  @click="dismissFollowUp(fu.id)"
                >
                  <X class="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          <div v-else class="rounded-xl border border-dashed py-10 text-center">
            <div class="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <Activity class="h-5 w-5 text-muted-foreground" />
            </div>
            <p class="text-sm text-muted-foreground">No pending follow-ups</p>
            <p class="mt-0.5 text-xs text-muted-foreground">Follow-ups are added when reports are processed</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
