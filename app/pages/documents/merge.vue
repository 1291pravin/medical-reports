<script setup lang="ts">
import type { Document } from '~/composables/useDocuments'

const { members } = await useMembers()
const { documents, fetchDocuments } = useDocuments()

const selectedMemberId = ref('')
const selectedDocIds = ref<Set<string>>(new Set())
const merging = ref(false)

watch(selectedMemberId, async (id) => {
  if (id) {
    await fetchDocuments({ memberId: id })
    selectedDocIds.value.clear()
  }
})

const pdfDocuments = computed(() =>
  documents.value.filter((d) => d.fileType === 'application/pdf'),
)

function toggleDoc(id: string) {
  if (selectedDocIds.value.has(id)) {
    selectedDocIds.value.delete(id)
  } else {
    selectedDocIds.value.add(id)
  }
}

async function handleMerge() {
  if (selectedDocIds.value.size < 2) return
  merging.value = true

  try {
    const response = await $fetch('/api/documents/merge', {
      method: 'POST',
      body: { documentIds: Array.from(selectedDocIds.value) },
      responseType: 'arrayBuffer',
    })

    // Download the merged PDF
    const blob = new Blob([response as unknown as ArrayBuffer], { type: 'application/pdf' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `merged-reports-${Date.now()}.pdf`
    a.click()
    URL.revokeObjectURL(url)
  } catch (e: any) {
    console.error('Merge failed:', e)
  } finally {
    merging.value = false
  }
}
</script>

<template>
  <div class="mx-auto max-w-2xl">
    <div class="mb-6">
      <h1 class="text-xl font-bold tracking-tight">Merge Reports</h1>
      <p class="mt-0.5 text-sm text-muted-foreground">Select multiple PDF reports to merge into one</p>
    </div>

    <Card>
      <CardContent class="space-y-4 pt-6">
        <div class="space-y-2">
          <Label>Family Member</Label>
          <select
            v-model="selectedMemberId"
            class="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="" disabled>Select a member</option>
            <option v-for="m in members" :key="m.id" :value="m.id">{{ m.name }}</option>
          </select>
        </div>

        <div v-if="selectedMemberId && pdfDocuments.length === 0" class="py-8 text-center text-sm text-muted-foreground">
          No PDF documents found for this member
        </div>

        <div v-if="pdfDocuments.length" class="space-y-2">
          <Label>Select PDFs to merge ({{ selectedDocIds.size }} selected)</Label>
          <div class="space-y-2">
            <div
              v-for="doc in pdfDocuments"
              :key="doc.id"
              class="flex items-center gap-3 rounded-md border p-3 cursor-pointer transition-colors"
              :class="selectedDocIds.has(doc.id) ? 'border-primary bg-primary/5' : ''"
              @click="toggleDoc(doc.id)"
            >
              <Checkbox :checked="selectedDocIds.has(doc.id)" />
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium truncate">{{ doc.title }}</p>
                <p class="text-xs text-muted-foreground">{{ doc.reportDate || 'No date' }}</p>
              </div>
            </div>
          </div>
        </div>

        <Button
          class="w-full"
          :disabled="selectedDocIds.size < 2 || merging"
          @click="handleMerge"
        >
          {{ merging ? 'Merging...' : `Merge ${selectedDocIds.size} PDFs & Download` }}
        </Button>
      </CardContent>
    </Card>
  </div>
</template>
