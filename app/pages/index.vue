<script setup lang="ts">
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

// Fetch pending follow-ups
await fetchFollowUps({ status: 'pending' })

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
</script>

<template>
  <div class="mx-auto max-w-3xl">
    <!-- Greeting -->
    <div class="mb-8">
      <p class="text-sm font-medium text-primary">{{ greeting }}</p>
      <h1 class="text-2xl font-bold tracking-tight">{{ firstName }}</h1>
    </div>

    <!-- Quick Actions -->
    <div class="mb-8 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
      <NuxtLink to="/documents/upload" class="group">
        <div class="flex flex-col items-center gap-2.5 rounded-xl border bg-card p-4 text-center transition-all group-hover:border-primary/30 group-hover:shadow-sm">
          <div class="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary transition-colors group-hover:bg-primary/15">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>
          </div>
          <span class="text-xs font-medium">Upload Report</span>
        </div>
      </NuxtLink>

      <NuxtLink to="/members/add" class="group">
        <div class="flex flex-col items-center gap-2.5 rounded-xl border bg-card p-4 text-center transition-all group-hover:border-emerald-300/50 group-hover:shadow-sm">
          <div class="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 transition-colors group-hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-400">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" x2="19" y1="8" y2="14"/><line x1="22" x2="16" y1="11" y2="11"/></svg>
          </div>
          <span class="text-xs font-medium">Add Member</span>
        </div>
      </NuxtLink>

      <NuxtLink to="/medications" class="group">
        <div class="flex flex-col items-center gap-2.5 rounded-xl border bg-card p-4 text-center transition-all group-hover:border-amber-300/50 group-hover:shadow-sm">
          <div class="flex h-10 w-10 items-center justify-center rounded-full bg-amber-50 text-amber-600 transition-colors group-hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-400">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z"/><path d="m8.5 8.5 7 7"/></svg>
          </div>
          <span class="text-xs font-medium">Medications</span>
        </div>
      </NuxtLink>

      <NuxtLink to="/search" class="group">
        <div class="flex flex-col items-center gap-2.5 rounded-xl border bg-card p-4 text-center transition-all group-hover:border-sky-300/50 group-hover:shadow-sm">
          <div class="flex h-10 w-10 items-center justify-center rounded-full bg-sky-50 text-sky-600 transition-colors group-hover:bg-sky-100 dark:bg-sky-950/40 dark:text-sky-400">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
          </div>
          <span class="text-xs font-medium">Search</span>
        </div>
      </NuxtLink>
    </div>

    <!-- Upcoming Follow-Ups -->
    <div v-if="upcomingFollowUps.length" class="mb-8">
      <div class="mb-3 flex items-center justify-between">
        <h2 class="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Upcoming Follow-Ups</h2>
      </div>
      <div class="space-y-2">
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
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 12 2 2 4-4"/><circle cx="12" cy="12" r="10"/></svg>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              class="h-7 w-7 text-muted-foreground hover:text-destructive"
              title="Dismiss"
              @click="dismissFollowUp(fu.id)"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" x2="6" y1="6" y2="18"/><line x1="6" x2="18" y1="6" y2="18"/></svg>
            </Button>
          </div>
        </div>
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
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
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
</template>
