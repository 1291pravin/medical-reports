<script setup lang="ts">
const route = useRoute()

const links = [
  { to: '/', label: 'Dashboard', icon: 'home' },
  { to: '/members', label: 'Family Members', icon: 'users' },
  { to: '/documents/upload', label: 'Upload Report', icon: 'upload' },
  { to: '/medications', label: 'Medications', icon: 'pill' },
  { to: '/diet', label: 'Family Diet', icon: 'diet' },
  { to: '/search', label: 'Search', icon: 'search' },
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
        <!-- Home -->
        <svg v-if="link.icon === 'home'" xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
        <!-- Users -->
        <svg v-if="link.icon === 'users'" xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
        <!-- Upload -->
        <svg v-if="link.icon === 'upload'" xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>
        <!-- Pill -->
        <svg v-if="link.icon === 'pill'" xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z"/><path d="m8.5 8.5 7 7"/></svg>
        <!-- Diet -->
        <svg v-if="link.icon === 'diet'" xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 2h20"/><path d="M3.5 2v17a2.5 2.5 0 0 0 5 0V2"/><path d="M16 2v5a4 4 0 0 0 4 4"/><path d="M20 2v20"/></svg>
        <!-- Search -->
        <svg v-if="link.icon === 'search'" xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
        {{ link.label }}
      </NuxtLink>
    </nav>
  </aside>
</template>
