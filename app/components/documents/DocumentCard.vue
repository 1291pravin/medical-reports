<script setup lang="ts">
import { FileText, Image, Trash2 } from 'lucide-vue-next'
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
        <FileText v-if="document.fileType === 'application/pdf'" class="h-5 w-5" />
        <Image v-else class="h-5 w-5" />
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
          <Trash2 class="h-3.5 w-3.5" />
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
