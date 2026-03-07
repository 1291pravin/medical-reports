<script setup lang="ts">
definePageMeta({ layout: 'auth' })

const { fetch: refreshSession } = useUserSession()
const router = useRouter()

const form = reactive({
  email: '',
  password: '',
})
const loading = ref(false)
const error = ref('')

async function handleLogin() {
  loading.value = true
  error.value = ''

  try {
    await $fetch('/api/auth/login', {
      method: 'POST',
      body: form,
    })
    await refreshSession()
    router.push('/')
  } catch (e: any) {
    error.value = e.data?.statusMessage || 'Login failed'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div>
    <div class="mb-6">
      <h1 class="text-2xl font-bold tracking-tight">Welcome back</h1>
      <p class="mt-1 text-sm text-muted-foreground">Sign in to your account</p>
    </div>

    <form @submit.prevent="handleLogin" class="space-y-4">
      <div v-if="error" class="rounded-lg bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
        {{ error }}
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
          placeholder="Enter your password"
          required
        />
      </div>

      <Button type="submit" class="w-full" :disabled="loading">
        {{ loading ? 'Signing in...' : 'Sign in' }}
      </Button>
    </form>

    <p class="mt-6 text-center text-sm text-muted-foreground">
      Don't have an account?
      <NuxtLink to="/register" class="font-medium text-primary hover:underline">
        Sign up
      </NuxtLink>
    </p>
  </div>
</template>
