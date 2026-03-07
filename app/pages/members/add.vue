<script setup lang="ts">
const { createMember } = await useMembers()
const router = useRouter()
const loading = ref(false)
const error = ref('')

async function handleSubmit(data: any) {
  loading.value = true
  error.value = ''
  try {
    await createMember(data)
    router.push('/members')
  } catch (e: any) {
    error.value = e.data?.statusMessage || 'Failed to add member'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="mx-auto max-w-lg">
    <div class="mb-6">
      <h1 class="text-xl font-bold tracking-tight">Add Family Member</h1>
      <p class="mt-0.5 text-sm text-muted-foreground">Create a health profile for a family member</p>
    </div>

    <Card>
      <CardContent class="pt-6">
        <div v-if="error" class="mb-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {{ error }}
        </div>
        <MemberForm @submit="handleSubmit" />
      </CardContent>
    </Card>
  </div>
</template>
