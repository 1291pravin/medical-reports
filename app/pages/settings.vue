<script setup lang="ts">
import { Sun, Moon, User, Lock } from 'lucide-vue-next'
import { useColorMode } from '@vueuse/core'

const { user, fetch: refreshSession } = useUserSession()

const mode = useColorMode({
  attribute: 'class',
  modes: { dark: 'dark', light: '' },
})

// Profile form
const profileForm = reactive({
  name: user.value?.name || '',
  email: user.value?.email || '',
})
const profileSaving = ref(false)
const profileSuccess = ref(false)
const profileError = ref('')

async function saveProfile() {
  profileSaving.value = true
  profileError.value = ''
  profileSuccess.value = false
  try {
    await $fetch('/api/auth/profile', {
      method: 'PUT',
      body: { name: profileForm.name, email: profileForm.email },
    })
    await refreshSession()
    profileSuccess.value = true
    setTimeout(() => (profileSuccess.value = false), 3000)
  } catch (e: any) {
    profileError.value = e.data?.statusMessage || 'Failed to update profile'
  } finally {
    profileSaving.value = false
  }
}

// Password form
const passwordForm = reactive({
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
})
const passwordSaving = ref(false)
const passwordSuccess = ref(false)
const passwordError = ref('')

async function changePassword() {
  passwordError.value = ''
  passwordSuccess.value = false

  if (passwordForm.newPassword !== passwordForm.confirmPassword) {
    passwordError.value = 'New passwords do not match'
    return
  }

  passwordSaving.value = true
  try {
    await $fetch('/api/auth/password', {
      method: 'PUT',
      body: {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      },
    })
    passwordSuccess.value = true
    passwordForm.currentPassword = ''
    passwordForm.newPassword = ''
    passwordForm.confirmPassword = ''
    setTimeout(() => (passwordSuccess.value = false), 3000)
  } catch (e: any) {
    passwordError.value = e.data?.statusMessage || 'Failed to change password'
  } finally {
    passwordSaving.value = false
  }
}
</script>

<template>
  <div class="mx-auto max-w-xl">
    <div class="mb-6">
      <h1 class="text-xl font-bold tracking-tight">Settings</h1>
      <p class="mt-0.5 text-sm text-muted-foreground">Manage your account and preferences</p>
    </div>

    <!-- Appearance -->
    <div class="mb-6 rounded-xl border bg-card p-5">
      <h2 class="mb-4 text-sm font-semibold">Appearance</h2>
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <Sun v-if="mode === 'dark'" class="h-4 w-4 text-muted-foreground" />
          <Moon v-else class="h-4 w-4 text-muted-foreground" />
          <div>
            <p class="text-sm font-medium">Dark Mode</p>
            <p class="text-xs text-muted-foreground">{{ mode === 'dark' ? 'Dark theme active' : 'Light theme active' }}</p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          @click="mode = mode === 'dark' ? 'light' : 'dark'"
        >
          {{ mode === 'dark' ? 'Switch to Light' : 'Switch to Dark' }}
        </Button>
      </div>
    </div>

    <!-- Profile -->
    <div class="mb-6 rounded-xl border bg-card p-5">
      <div class="mb-4 flex items-center gap-2">
        <User class="h-4 w-4 text-muted-foreground" />
        <h2 class="text-sm font-semibold">Profile</h2>
      </div>

      <form @submit.prevent="saveProfile" class="space-y-4">
        <div>
          <Label for="name">Name</Label>
          <Input id="name" v-model="profileForm.name" class="mt-1" />
        </div>
        <div>
          <Label for="email">Email</Label>
          <Input id="email" v-model="profileForm.email" type="email" class="mt-1" />
        </div>

        <p v-if="profileError" class="text-sm text-destructive">{{ profileError }}</p>
        <p v-if="profileSuccess" class="text-sm text-green-600 dark:text-green-400">Profile updated successfully</p>

        <Button type="submit" size="sm" :disabled="profileSaving">
          {{ profileSaving ? 'Saving...' : 'Save Changes' }}
        </Button>
      </form>
    </div>

    <!-- Change Password -->
    <div class="rounded-xl border bg-card p-5">
      <div class="mb-4 flex items-center gap-2">
        <Lock class="h-4 w-4 text-muted-foreground" />
        <h2 class="text-sm font-semibold">Change Password</h2>
      </div>

      <form @submit.prevent="changePassword" class="space-y-4">
        <div>
          <Label for="currentPassword">Current Password</Label>
          <Input id="currentPassword" v-model="passwordForm.currentPassword" type="password" class="mt-1" />
        </div>
        <div>
          <Label for="newPassword">New Password</Label>
          <Input id="newPassword" v-model="passwordForm.newPassword" type="password" class="mt-1" />
        </div>
        <div>
          <Label for="confirmPassword">Confirm New Password</Label>
          <Input id="confirmPassword" v-model="passwordForm.confirmPassword" type="password" class="mt-1" />
        </div>

        <p v-if="passwordError" class="text-sm text-destructive">{{ passwordError }}</p>
        <p v-if="passwordSuccess" class="text-sm text-green-600 dark:text-green-400">Password changed successfully</p>

        <Button type="submit" size="sm" :disabled="passwordSaving">
          {{ passwordSaving ? 'Changing...' : 'Change Password' }}
        </Button>
      </form>
    </div>
  </div>
</template>
