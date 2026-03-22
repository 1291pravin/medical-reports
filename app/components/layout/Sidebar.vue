<script setup lang="ts">
import { Home, Users, Upload, Pill, UtensilsCrossed, Search } from 'lucide-vue-next'

const route = useRoute()

const links = [
  { to: '/', label: 'Dashboard', icon: Home },
  { to: '/members', label: 'Family Members', icon: Users },
  { to: '/documents/upload', label: 'Upload Report', icon: Upload },
  { to: '/medications', label: 'Medications', icon: Pill },
  { to: '/diet', label: 'Family Diet', icon: UtensilsCrossed },
  { to: '/search', label: 'Search', icon: Search },
]

function isActive(path: string) {
  if (path === '/') return route.path === '/'
  return route.path.startsWith(path)
}
</script>

<template>
  <aside class="sticky top-14 h-[calc(100vh-3.5rem)] w-56 shrink-0 border-r p-3">
    <nav class="flex flex-col gap-0.5">
      <NuxtLink
        v-for="link in links"
        :key="link.to"
        :to="link.to"
        class="flex items-center gap-2.5 rounded-md px-3 py-2 text-[13px] font-medium transition-colors"
        :class="isActive(link.to) ? 'bg-primary/8 text-primary' : 'text-muted-foreground hover:bg-accent hover:text-foreground'"
      >
        <component :is="link.icon" class="h-4 w-4" />
        {{ link.label }}
      </NuxtLink>
    </nav>
  </aside>
</template>
