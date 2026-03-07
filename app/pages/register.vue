<script setup lang="ts">
definePageMeta({ layout: 'auth' })

const { fetch: refreshSession } = useUserSession()
const router = useRouter()

const form = reactive({
  name: '',
  email: '',
  password: '',
  confirmPassword: '',
})
const loading = ref(false)
const error = ref('')

async function handleRegister() {
  if (form.password !== form.confirmPassword) {
    error.value = 'Passwords do not match'
    return
  }

  loading.value = true
  error.value = ''

  try {
    await $fetch('/api/auth/register', {
      method: 'POST',
      body: {
        name: form.name,
        email: form.email,
        password: form.password,
      },
    })
    await refreshSession()
    router.push('/')
  } catch (e: any) {
    error.value = e.data?.statusMessage || 'Registration failed'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div>
    <div class="mb-6">
      <h1 class="text-2xl font-bold tracking-tight">Create account</h1>
      <p class="mt-1 text-sm text-muted-foreground">Start managing your family's medical records</p>
    </div>

    <form @submit.prevent="handleRegister" class="space-y-4">
      <div v-if="error" class="rounded-lg bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
        {{ error }}
      </div>

      <div class="space-y-1.5">
        <Label for="name">Full Name</Label>
        <Input
          id="name"
          v-model="form.name"
          type="text"
          placeholder="John Doe"
          required
        />
      </div>

      <div class="space-y-1.5">
        <Label for="email">Email</Label>
        <Input
          id="email"
          v-model="form.email"
          type="email"
          placeholder="you@example.com"
          required
        />
      </div>

      <div class="space-y-1.5">
        <Label for="password">Password</Label>
        <Input
          id="password"
          v-model="form.password"
          type="password"
          placeholder="At least 8 characters"
          required
          minlength="8"
        />
      </div>

      <div class="space-y-1.5">
        <Label for="confirmPassword">Confirm Password</Label>
        <Input
          id="confirmPassword"
          v-model="form.confirmPassword"
          type="password"
          placeholder="Confirm your password"
          required
        />
      </div>

      <Button type="submit" class="w-full" :disabled="loading">
        {{ loading ? 'Creating account...' : 'Create account' }}
      </Button>
    </form>

    <p class="mt-6 text-center text-sm text-muted-foreground">
      Already have an account?
      <NuxtLink to="/login" class="font-medium text-primary hover:underline">
        Sign in
      </NuxtLink>
    </p>
  </div>
</template>
