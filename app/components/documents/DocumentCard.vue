<script setup lang="ts">
import type { Document } from '~/composables/useDocuments'

const props = defineProps<{
  document: Document
}>()

const emit = defineEmits<{
  delete: [id: string]
}>()

const showDeleteDialog = ref(false)

function handleDeleteClick(e: Event) {
  e.preventDefault()
  e.stopPropagation()
  showDeleteDialog.value = true
}

function confirmDelete() {
  emit('delete', props.document.id)
  showDeleteDialog.value = false
}

const categoryLabels: Record<string, string> = {
  lab_report: 'Lab Report',
  prescription: 'Prescription',
  scan: 'Scan',
  discharge_summary: 'Discharge Summary',
  vaccination: 'Vaccination',
  insurance: 'Insurance',
  other: 'Other',
}

function formatDate(date: string | null): string {
  if (!date) return ''
  return new Date(date).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)}KB`
  return `${(bytes / 1048576).toFixed(1)}MB`
}
</script>

<template>
  <NuxtLink :to="`/documents/${document.id}`" class="group block">
    <div class="flex items-center gap-3 rounded-xl border bg-card p-3.5 transition-all group-hover:border-primary/25 group-hover:shadow-sm">
      <div
        class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
        :class="document.fileType === 'application/pdf' ? 'bg-red-50 text-red-500 dark:bg-red-950/30 dark:text-red-400' : 'bg-sky-50 text-sky-500 dark:bg-sky-950/30 dark:text-sky-400'"
      >
        <svg v-if="document.fileType === 'application/pdf'" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/></svg>
        <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
      </div>

      <div class="flex-1 min-w-0">
        <h4 class="text-sm font-medium truncate">{{ document.title }}</h4>
        <div class="mt-0.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <span>{{ document.memberName }}</span>
          <span v-if="document.reportDate" class="before:content-['\B7'] before:mr-1.5">{{ formatDate(document.reportDate) }}</span>
          <span class="before:content-['\B7'] before:mr-1.5">{{ formatSize(document.fileSize) }}</span>
        </div>
      </div>

      <div class="flex items-center gap-1.5">
        <Badge v-if="document.category" variant="secondary" class="text-[10px] font-medium">
          {{ categoryLabels[document.category] || document.category }}
        </Badge>
        <span v-if="document.isProcessed" class="flex h-2 w-2 rounded-full bg-emerald-500" title="Processed" />
        <Button
          variant="ghost"
          size="icon"
          class="h-7 w-7 shrink-0 text-muted-foreground/60 hover:text-destructive"
          @click="handleDeleteClick"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
        </Button>
      </div>
    </div>
  </NuxtLink>

  <!-- Delete Confirmation Dialog -->
  <AlertDialog v-model:open="showDeleteDialog">
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Delete Report?</AlertDialogTitle>
        <AlertDialogDescription>
          This will permanently delete "{{ document.title }}" and all its associated data (AI summary, linked medications, conditions). This action cannot be undone.
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>Cancel</AlertDialogCancel>
        <AlertDialogAction class="bg-destructive text-destructive-foreground" @click="confirmDelete">
          Delete
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</template>
