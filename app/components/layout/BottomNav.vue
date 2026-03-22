<script setup lang="ts">
import { Home, Users, Upload, Pill, Calendar, Search } from 'lucide-vue-next'

const route = useRoute()

const links = [
  { to: '/', label: 'Home', icon: Home },
  { to: '/members', label: 'Members', icon: Users },
  { to: '/documents/upload', label: 'Upload', icon: Upload },
  { to: '/medications', label: 'Meds', icon: Pill },
  { to: '/calendar', label: 'Calendar', icon: Calendar },
  { to: '/search', label: 'Search', icon: Search },
]

function isActive(path: string) {
  if (path === '/') return route.path === '/'
  return route.path.startsWith(path)
}
</script>

<template>
  <nav class="fixed bottom-0 left-0 right-0 z-40 border-t bg-background/90 backdrop-blur-lg">
    <div class="flex items-center justify-around py-1.5 pb-[calc(0.375rem+env(safe-area-inset-bottom))]">
      <NuxtLink
        v-for="link in links"
        :key="link.to"
        :to="link.to"
        class="flex flex-col items-center gap-0.5 px-3 py-1 text-[10px] font-medium transition-colors"
        :class="isActive(link.to) ? 'text-primary' : 'text-muted-foreground'"
      >
        <component :is="link.icon" class="h-5 w-5" :fill="isActive(link.to) ? 'currentColor' : 'none'" />
        {{ link.label }}
      </NuxtLink>
    </div>
  </nav>
</template>
