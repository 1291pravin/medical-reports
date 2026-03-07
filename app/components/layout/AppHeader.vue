<script setup lang="ts">
const { user, clear } = useUserSession()
const router = useRouter()

async function handleLogout() {
  await $fetch('/api/auth/logout', { method: 'POST' })
  await clear()
  router.push('/login')
}
</script>

<template>
  <header class="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-lg">
    <div class="flex h-14 items-center gap-4 px-4 lg:px-6">
      <NuxtLink to="/" class="flex items-center gap-2">
        <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M11 2a2 2 0 0 0-2 2v5H4a2 2 0 0 0-2 2v2c0 1.1.9 2 2 2h5v5c0 1.1.9 2 2 2h2a2 2 0 0 0 2-2v-5h5a2 2 0 0 0 2-2v-2a2 2 0 0 0-2-2h-5V4a2 2 0 0 0-2-2h-2z" />
          </svg>
        </div>
        <span class="hidden text-base font-semibold tracking-tight sm:inline">MedRecords</span>
      </NuxtLink>

      <div class="flex-1" />

      <NuxtLink to="/search">
        <Button variant="ghost" size="icon" class="text-muted-foreground">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
          </svg>
        </Button>
      </NuxtLink>

      <DropdownMenu>
        <DropdownMenuTrigger as-child>
          <Button variant="ghost" size="icon" class="rounded-full">
            <Avatar class="h-8 w-8">
              <AvatarFallback class="bg-primary/10 text-primary text-xs font-semibold">{{ user?.name?.charAt(0)?.toUpperCase() || '?' }}</AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" class="w-48">
          <div class="px-2 py-1.5">
            <p class="text-sm font-medium">{{ user?.name }}</p>
            <p class="text-xs text-muted-foreground">{{ user?.email }}</p>
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem @click="handleLogout" class="text-destructive focus:text-destructive">
            Logout
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  </header>
</template>
