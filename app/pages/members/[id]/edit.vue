<script setup lang="ts">
import type { FamilyMember } from '~/composables/useMembers'

const route = useRoute()
const router = useRouter()
const { updateMember } = await useMembers()

const memberId = route.params.id as string
const loading = ref(false)
const error = ref('')

const { data: member, pending, error: fetchError } = await useFetch<FamilyMember>(
  `/api/members/${memberId}`,
)

async function handleSubmit(data: any) {
  loading.value = true
  error.value = ''
  try {
    await updateMember(memberId, data)
    router.push(`/members/${memberId}`)
  } catch (e: any) {
    error.value = e.data?.statusMessage || 'Failed to update member'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="mx-auto max-w-lg">
    <div v-if="pending" class="space-y-4">
      <div class="h-8 w-48 animate-pulse rounded bg-muted" />
      <div class="h-64 animate-pulse rounded-lg bg-muted" />
    </div>

    <div v-else-if="fetchError" class="text-center py-16">
      <p class="text-destructive">Failed to load member</p>
      <NuxtLink to="/members"><Button variant="outline" class="mt-4">Back to Members</Button></NuxtLink>
    </div>

    <template v-else-if="member">
      <div class="mb-6">
        <h1 class="text-xl font-bold tracking-tight">Edit {{ member.name }}</h1>
        <p class="mt-0.5 text-sm text-muted-foreground">Update profile and health information</p>
      </div>

      <Card>
        <CardContent class="pt-6">
          <div v-if="error" class="mb-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {{ error }}
          </div>
          <MemberForm :member="member" @submit="handleSubmit" />
        </CardContent>
      </Card>
    </template>
  </div>
</template>
