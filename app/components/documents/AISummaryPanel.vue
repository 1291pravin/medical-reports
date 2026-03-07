<script setup lang="ts">
import type { AIExtraction } from '~/composables/useDocuments'

const props = defineProps<{
  extraction: AIExtraction
  loading?: boolean
}>()

const emit = defineEmits<{
  approve: [data: AIExtraction]
}>()

// Editable copy of extraction data
const form = reactive<AIExtraction>({
  category: props.extraction.category,
  summary: props.extraction.summary,
  diagnosis: [...(props.extraction.diagnosis || [])],
  medications: (props.extraction.medications || []).map((m) => ({ ...m })),
  testValues: (props.extraction.testValues || []).map((t) => ({ ...t })),
  doctorName: props.extraction.doctorName || '',
  hospitalName: props.extraction.hospitalName || '',
  keyFindings: [...(props.extraction.keyFindings || [])],
})

const categories = [
  { value: 'lab_report', label: 'Lab Report' },
  { value: 'prescription', label: 'Prescription' },
  { value: 'scan', label: 'Scan / Imaging' },
  { value: 'discharge_summary', label: 'Discharge Summary' },
  { value: 'vaccination', label: 'Vaccination' },
  { value: 'insurance', label: 'Insurance' },
  { value: 'other', label: 'Other' },
]

const newDiagnosis = ref('')
function addDiagnosis() {
  const val = newDiagnosis.value.trim()
  if (val && !form.diagnosis.includes(val)) {
    form.diagnosis.push(val)
  }
  newDiagnosis.value = ''
}

function removeDiagnosis(i: number) {
  form.diagnosis.splice(i, 1)
}

function removeMedication(i: number) {
  form.medications.splice(i, 1)
}

function addMedication() {
  form.medications.push({ name: '', dosage: '', frequency: '', purpose: '' })
}

function handleApprove() {
  emit('approve', { ...form })
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center gap-2">
      <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/></svg>
      </div>
      <div>
        <h3 class="font-semibold">AI Analysis</h3>
        <p class="text-xs text-muted-foreground">Review and edit before saving</p>
      </div>
    </div>

    <!-- Category -->
    <div class="space-y-2">
      <Label>Document Type</Label>
      <select
        v-model="form.category"
        class="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      >
        <option v-for="cat in categories" :key="cat.value" :value="cat.value">{{ cat.label }}</option>
      </select>
    </div>

    <!-- Summary -->
    <div class="space-y-2">
      <Label>Summary</Label>
      <Textarea v-model="form.summary" rows="3" />
    </div>

    <!-- Diagnosis -->
    <div class="space-y-2">
      <Label>Diagnosis / Conditions</Label>
      <div class="flex flex-wrap gap-1">
        <Badge
          v-for="(d, i) in form.diagnosis"
          :key="i"
          variant="secondary"
          class="cursor-pointer"
          @click="removeDiagnosis(i)"
        >
          {{ d }} &times;
        </Badge>
      </div>
      <div class="flex gap-2">
        <Input v-model="newDiagnosis" placeholder="Add diagnosis" @keydown.enter.prevent="addDiagnosis" />
        <Button type="button" variant="outline" size="sm" @click="addDiagnosis">Add</Button>
      </div>
    </div>

    <!-- Test Values -->
    <div v-if="form.testValues.length" class="space-y-2">
      <Label>Test Results</Label>
      <div class="rounded-md border">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b bg-muted/50">
              <th class="p-2 text-left font-medium">Test</th>
              <th class="p-2 text-left font-medium">Value</th>
              <th class="p-2 text-left font-medium">Normal Range</th>
              <th class="p-2 text-left font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(test, i) in form.testValues" :key="i" class="border-b last:border-0">
              <td class="p-2">{{ test.name }}</td>
              <td class="p-2">
                <span :class="test.isAbnormal ? 'font-semibold text-red-600' : ''">
                  {{ test.value }} {{ test.unit || '' }}
                </span>
              </td>
              <td class="p-2 text-muted-foreground">{{ test.normalRange || '-' }}</td>
              <td class="p-2">
                <Badge v-if="test.isAbnormal" variant="destructive" class="text-xs">Abnormal</Badge>
                <Badge v-else variant="outline" class="text-xs">Normal</Badge>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Medications -->
    <div class="space-y-2">
      <div class="flex items-center justify-between">
        <Label>Medications Found</Label>
        <Button type="button" variant="ghost" size="sm" @click="addMedication">+ Add</Button>
      </div>
      <div v-for="(med, i) in form.medications" :key="i" class="rounded-md border p-3">
        <div class="flex items-start justify-between">
          <div class="grid flex-1 grid-cols-2 gap-2">
            <Input v-model="med.name" placeholder="Medication name" />
            <Input v-model="med.dosage" placeholder="Dosage" />
            <Input v-model="med.frequency" placeholder="Frequency" />
            <Input v-model="med.purpose" placeholder="Purpose" />
          </div>
          <Button type="button" variant="ghost" size="icon" class="ml-2 shrink-0" @click="removeMedication(i)">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
          </Button>
        </div>
      </div>
      <p v-if="!form.medications.length" class="text-sm text-muted-foreground">No medications detected</p>
    </div>

    <!-- Doctor & Hospital -->
    <div class="grid grid-cols-2 gap-4">
      <div class="space-y-2">
        <Label>Doctor</Label>
        <Input v-model="form.doctorName" placeholder="Doctor name" />
      </div>
      <div class="space-y-2">
        <Label>Hospital / Clinic</Label>
        <Input v-model="form.hospitalName" placeholder="Hospital name" />
      </div>
    </div>

    <!-- Key Findings -->
    <div v-if="form.keyFindings.length" class="space-y-2">
      <Label>Key Findings</Label>
      <ul class="space-y-1 text-sm">
        <li v-for="(finding, i) in form.keyFindings" :key="i" class="flex items-start gap-2">
          <span class="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
          {{ finding }}
        </li>
      </ul>
    </div>

    <!-- Approve Button -->
    <Button class="w-full" size="lg" @click="handleApprove" :disabled="loading">
      <svg xmlns="http://www.w3.org/2000/svg" class="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
      {{ loading ? 'Saving...' : 'Approve & Save' }}
    </Button>
  </div>
</template>
