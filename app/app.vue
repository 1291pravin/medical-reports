<script setup lang="ts">
import { useColorMode } from '@vueuse/core'

// Initialize color mode (persists to localStorage)
const mode = useColorMode({
  attribute: 'class',
  modes: { dark: 'dark', light: '' },
})

// Make it available app-wide
provide('colorMode', mode)
</script>

<template>
  <NuxtLayout>
    <NuxtPage :transition="{ name: 'page', mode: 'out-in' }" />
  </NuxtLayout>
</template>
