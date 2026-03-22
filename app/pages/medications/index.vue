<script setup lang="ts">
import { AlertTriangle, Pill } from 'lucide-vue-next'

const { medications, loading, fetchMedications, deleteMedication } = useMedications()

onMounted(() => fetchMedications())

const showDeleteDialog = ref(false)
const deletingMedId = ref<string | null>(null)

function confirmDelete(id: string) {
  deletingMedId.value = id
  showDeleteDialog.value = true
}

async function handleDelete() {
  if (!deletingMedId.value) return
  await deleteMedication(deletingMedId.value)
  showDeleteDialog.value = false
  deletingMedId.value = null
  await fetchMedications()
}

// Group by member
const groupedMeds = computed(() => {
  const groups: Record<string, { memberName: string; meds: (typeof medications.value)[number][] }> = {}
  for (const med of medications.value) {
    if (!groups[med.familyMemberId]) {
      groups[med.familyMemberId] = { memberName: med.memberName, meds: [] }
    }
    groups[med.familyMemberId]!.meds.push(med)
  }
  return Object.values(groups)
})

const endingSoonCount = computed(() =>
  medications.value.filter((m) => {
    if (!m.endDate) return false
    const days = Math.ceil(
      (new Date(m.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
    )
    return days >= 0 && days <= 3
  }).length,
)
</script>

<template>
  <div>
    <div class="mb-6">
      <h1 class="text-xl font-bold tracking-tight">Active Medications</h1>
      <p class="mt-0.5 text-sm text-muted-foreground">
        Currently prescribed medications across all family members
      </p>
    </div>

    <!-- Ending Soon Alert -->
    <div v-if="endingSoonCount > 0" class="mb-4 flex items-center gap-2.5 rounded-lg border border-amber-200 bg-amber-50/60 px-3 py-2.5 dark:border-amber-800/50 dark:bg-amber-950/20">
      <AlertTriangle class="h-4 w-4 shrink-0 text-amber-600" />
      <span class="text-sm text-amber-800 dark:text-amber-300">
        {{ endingSoonCount }} medication{{ endingSoonCount > 1 ? 's' : '' }} ending within 3 days
      </span>
    </div>

    <div v-if="loading" class="space-y-3">
      <div v-for="i in 3" :key="i" class="h-20 animate-pulse rounded-lg bg-muted" />
    </div>

    <div v-else-if="medications.length === 0" class="flex flex-col items-center justify-center py-16 text-center">
      <div class="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
        <Pill class="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 class="font-semibold">No active medications</h3>
      <p class="mt-1 text-sm text-muted-foreground">
        Medications are automatically added when reports are processed
      </p>
    </div>

    <div v-else class="space-y-6">
      <div v-for="group in groupedMeds" :key="group.memberName">
        <h3 class="mb-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          {{ group.memberName }}
        </h3>
        <div class="space-y-2">
          <MedicationCard
            v-for="med in group.meds"
            :key="med.id"
            :medication="med"
            @delete="confirmDelete"
          />
        </div>
      </div>
    </div>

    <!-- Delete Medication Dialog -->
    <AlertDialog v-model:open="showDeleteDialog">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Medication?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently remove this medication from the records. This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction @click="handleDelete" class="bg-destructive text-destructive-foreground">
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>
</template>
