<script setup lang="ts">
import type { Component } from 'vue'

defineProps<{
  icon?: Component
  title: string
  description?: string
  actionLabel?: string
  actionTo?: string
}>()
</script>

<template>
  <div class="flex flex-col items-center justify-center py-16 text-center">
    <div v-if="icon" class="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-muted">
      <component :is="icon" class="h-7 w-7 text-muted-foreground" />
    </div>
    <h3 class="font-semibold">{{ title }}</h3>
    <p v-if="description" class="mt-1 max-w-sm text-sm text-muted-foreground">{{ description }}</p>
    <NuxtLink v-if="actionLabel && actionTo" :to="actionTo" class="mt-4">
      <Button variant="outline" size="sm">{{ actionLabel }}</Button>
    </NuxtLink>
  </div>
</template>
