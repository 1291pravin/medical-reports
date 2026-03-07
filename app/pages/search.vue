<script setup lang="ts">
const query = ref('')
const searching = ref(false)
const results = ref<{
  documents: any[]
  medications: any[]
  conditions: any[]
} | null>(null)

const categoryLabels: Record<string, string> = {
  lab_report: 'Lab Report',
  prescription: 'Prescription',
  scan: 'Scan',
  discharge_summary: 'Discharge Summary',
  vaccination: 'Vaccination',
  insurance: 'Insurance',
  other: 'Other',
}

let searchTimeout: ReturnType<typeof setTimeout>

function handleSearch() {
  clearTimeout(searchTimeout)
  if (!query.value.trim()) {
    results.value = null
    return
  }
  searchTimeout = setTimeout(doSearch, 300)
}

async function doSearch() {
  searching.value = true
  try {
    results.value = await $fetch<{
      documents: any[]
      medications: any[]
      conditions: any[]
    }>('/api/search', {
      query: { q: query.value },
    })
  } finally {
    searching.value = false
  }
}

const totalResults = computed(() => {
  if (!results.value) return 0
  return (
    results.value.documents.length +
    results.value.medications.length +
    results.value.conditions.length
  )
})
</script>

<template>
  <div class="mx-auto max-w-2xl">
    <div class="mb-6">
      <h1 class="text-xl font-bold tracking-tight">Search</h1>
      <p class="mt-0.5 text-sm text-muted-foreground">
        Search across reports, medications, and conditions
      </p>
    </div>

    <div class="relative mb-6">
      <svg xmlns="http://www.w3.org/2000/svg" class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
      <Input
        v-model="query"
        placeholder="Search reports, medications, conditions..."
        class="pl-10"
        @input="handleSearch"
      />
    </div>

    <!-- Loading -->
    <div v-if="searching" class="flex items-center justify-center py-8">
      <div class="h-6 w-6 animate-spin rounded-full border-2 border-muted border-t-primary" />
    </div>

    <!-- Results -->
    <div v-else-if="results" class="space-y-6">
      <p class="text-sm text-muted-foreground">
        {{ totalResults }} result{{ totalResults !== 1 ? 's' : '' }} for "{{ query }}"
      </p>

      <!-- Documents -->
      <div v-if="results.documents.length">
        <h3 class="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Reports</h3>
        <div class="space-y-2">
          <NuxtLink
            v-for="doc in results.documents"
            :key="doc.id"
            :to="`/documents/${doc.id}`"
          >
            <Card class="transition-shadow hover:shadow-md">
              <CardContent class="p-3">
                <div class="flex items-center justify-between">
                  <div>
                    <p class="font-medium">{{ doc.title }}</p>
                    <p class="text-xs text-muted-foreground">{{ doc.memberName }} &middot; {{ doc.reportDate || 'No date' }}</p>
                  </div>
                  <Badge v-if="doc.category" variant="outline" class="text-xs">
                    {{ categoryLabels[doc.category] || doc.category }}
                  </Badge>
                </div>
                <p v-if="doc.summary" class="mt-1 text-xs text-muted-foreground line-clamp-2">{{ doc.summary }}</p>
              </CardContent>
            </Card>
          </NuxtLink>
        </div>
      </div>

      <!-- Medications -->
      <div v-if="results.medications.length">
        <h3 class="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Medications</h3>
        <div class="space-y-2">
          <Card v-for="med in results.medications" :key="med.id">
            <CardContent class="p-3">
              <div class="flex items-center justify-between">
                <div>
                  <p class="font-medium">{{ med.name }}</p>
                  <p class="text-xs text-muted-foreground">
                    {{ med.memberName }}
                    <span v-if="med.dosage"> &middot; {{ med.dosage }}</span>
                    <span v-if="med.frequency"> &middot; {{ med.frequency }}</span>
                  </p>
                </div>
                <Badge :variant="med.isActive ? 'default' : 'outline'" class="text-xs">
                  {{ med.isActive ? 'Active' : 'Stopped' }}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <!-- Conditions -->
      <div v-if="results.conditions.length">
        <h3 class="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Conditions</h3>
        <div class="space-y-2">
          <Card v-for="cond in results.conditions" :key="cond.id">
            <CardContent class="flex items-center justify-between p-3">
              <div>
                <p class="font-medium">{{ cond.name }}</p>
                <p class="text-xs text-muted-foreground">
                  {{ cond.memberName }}
                  <span v-if="cond.firstDetected"> &middot; Since {{ cond.firstDetected }}</span>
                </p>
              </div>
              <Badge variant="outline" class="text-xs">{{ cond.status }}</Badge>
            </CardContent>
          </Card>
        </div>
      </div>

      <!-- No Results -->
      <div v-if="totalResults === 0" class="py-8 text-center">
        <p class="text-sm text-muted-foreground">No results found for "{{ query }}"</p>
      </div>
    </div>
  </div>
</template>
