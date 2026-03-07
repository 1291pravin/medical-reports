<script setup lang="ts">
const { members, loading, fetchMembers } = useMembers()

onMounted(fetchMembers)
</script>

<template>
  <div class="mx-auto max-w-3xl">
    <div class="mb-6 flex items-center justify-between">
      <div>
        <h1 class="text-xl font-bold tracking-tight">Family Members</h1>
        <p class="mt-0.5 text-sm text-muted-foreground">Manage your family's health profiles</p>
      </div>
      <NuxtLink to="/members/add">
        <Button size="sm">
          <svg xmlns="http://www.w3.org/2000/svg" class="mr-1.5 h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
          Add Member
        </Button>
      </NuxtLink>
    </div>

    <div v-if="loading" class="space-y-2.5">
      <div v-for="i in 3" :key="i" class="h-[72px] animate-pulse rounded-xl bg-muted/60" />
    </div>

    <div v-else-if="members.length === 0" class="flex flex-col items-center justify-center py-20 text-center">
      <div class="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/8">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
      </div>
      <h3 class="font-semibold">No family members yet</h3>
      <p class="mt-1 text-sm text-muted-foreground">Add your first family member to get started</p>
      <NuxtLink to="/members/add" class="mt-4">
        <Button>Add Family Member</Button>
      </NuxtLink>
    </div>

    <div v-else class="space-y-2">
      <MemberCard v-for="member in members" :key="member.id" :member="member" />
    </div>
  </div>
</template>
