<script setup lang="ts">
import { ChevronRight, Home } from 'lucide-vue-next'

const route = useRoute()

const routeLabels: Record<string, string> = {
  members: 'Family Members',
  add: 'Add Member',
  edit: 'Edit',
  documents: 'Documents',
  upload: 'Upload Report',
  merge: 'Merge PDFs',
  medications: 'Medications',
  diet: 'Family Diet',
  search: 'Search',
  settings: 'Settings',
  chat: 'Chat',
}

const breadcrumbs = computed(() => {
  const path = route.path
  if (path === '/') return []

  const segments = path.split('/').filter(Boolean)
  const crumbs: { label: string; to: string }[] = []

  let currentPath = ''
  for (const segment of segments) {
    currentPath += `/${segment}`

    // Skip UUID-like segments in the label but include in path
    const isId = segment.length > 8 && /^[a-f0-9-]+$/i.test(segment)

    if (isId) {
      crumbs.push({ label: 'Details', to: currentPath })
    } else {
      crumbs.push({
        label: routeLabels[segment] || segment.charAt(0).toUpperCase() + segment.slice(1),
        to: currentPath,
      })
    }
  }

  return crumbs
})
</script>

<template>
  <nav v-if="breadcrumbs.length" class="mb-4 flex items-center gap-1 text-xs text-muted-foreground">
    <NuxtLink to="/" class="flex items-center hover:text-foreground transition-colors">
      <Home class="h-3.5 w-3.5" />
    </NuxtLink>
    <template v-for="(crumb, i) in breadcrumbs" :key="crumb.to">
      <ChevronRight class="h-3 w-3" />
      <NuxtLink
        v-if="i < breadcrumbs.length - 1"
        :to="crumb.to"
        class="hover:text-foreground transition-colors"
      >
        {{ crumb.label }}
      </NuxtLink>
      <span v-else class="text-foreground font-medium">{{ crumb.label }}</span>
    </template>
  </nav>
</template>
