<script setup lang="ts">
import { Pill, FileText, Trash2 } from 'lucide-vue-next'
import type { Medication } from '~/composables/useMedications'

const props = defineProps<{
  medication: Medication
  showMember?: boolean
}>()

const emit = defineEmits<{
  toggleActive: [id: string, isActive: boolean]
  delete: [id: string]
}>()

const { isEndingSoon } = useMedications()

function formatDate(date: string | null): string {
  if (!date) return ''
  return new Date(date).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
  })
}

function daysRemaining(endDate: string | null): string {
  if (!endDate) return ''
  const end = new Date(endDate)
  const now = new Date()
  const days = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  if (days < 0) return 'Ended'
  if (days === 0) return 'Ends today'
  if (days === 1) return '1 day left'
  return `${days} days left`
}
</script>

<template>
  <div
    class="rounded-xl border bg-card p-3.5 transition-all"
    :class="isEndingSoon(medication.endDate) ? 'border-amber-200 bg-amber-50/40 dark:border-amber-800/50 dark:bg-amber-950/15' : ''"
  >
    <div class="flex items-start gap-3">
      <div
        class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
        :class="isEndingSoon(medication.endDate) ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400' : 'bg-primary/8 text-primary'"
      >
        <Pill class="h-4 w-4" />
      </div>

      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2">
          <h4 class="text-sm font-medium">{{ medication.name }}</h4>
          <span v-if="!medication.isActive" class="inline-flex items-center rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">Stopped</span>
          <span v-if="isEndingSoon(medication.endDate)" class="inline-flex items-center rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
            {{ daysRemaining(medication.endDate) }}
          </span>
        </div>
        <p v-if="showMember" class="text-[11px] text-muted-foreground">{{ medication.memberName }}</p>
        <div class="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
          <span v-if="medication.dosage">{{ medication.dosage }}</span>
          <span v-if="medication.frequency">{{ medication.frequency }}</span>
          <span v-if="medication.purpose">For: {{ medication.purpose }}</span>
        </div>
        <div v-if="medication.startDate || medication.endDate" class="mt-0.5 text-[11px] text-muted-foreground">
          {{ formatDate(medication.startDate) }}
          <span v-if="medication.endDate"> - {{ formatDate(medication.endDate) }}</span>
        </div>
        <NuxtLink
          v-if="medication.documentId"
          :to="`/documents/${medication.documentId}`"
          class="mt-1.5 inline-flex items-center gap-1 text-[11px] text-primary hover:underline"
        >
          <FileText class="h-3 w-3" />
          {{ medication.documentTitle || 'Source Document' }}
        </NuxtLink>
      </div>

      <Button
        variant="ghost"
        size="icon"
        class="h-7 w-7 shrink-0 text-muted-foreground/50 hover:text-destructive"
        @click="emit('delete', medication.id)"
      >
        <Trash2 class="h-3.5 w-3.5" />
      </Button>
    </div>
  </div>
</template>
