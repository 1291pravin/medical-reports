<script setup lang="ts">
import { ChevronLeft, Trash2 } from 'lucide-vue-next'

interface DocumentDetail {
  id: string
  familyMemberId: string
  memberName: string
  title: string
  fileUrl: string
  fileType: string
  fileSize: number
  category: string | null
  reportDate: string | null
  isProcessed: boolean
  isApproved: boolean
  createdAt: string
  aiSummary: {
    summary: string | null
    diagnosis: string[] | null
    keyFindings: string[] | null
    testValues: any[] | null
    doctorName: string | null
    hospitalName: string | null
  } | null
  medications: { id: string; name: string; dosage: string | null; frequency: string | null; purpose: string | null }[]
  conditions: { id: string; name: string; status: string; firstDetected: string | null }[]
}

const route = useRoute()
const router = useRouter()
const docId = route.params.id as string

const { data: doc, pending, error } = await useFetch<DocumentDetail>(`/api/documents/${docId}`)

const showDeleteDialog = ref(false)

async function handleDelete() {
  await $fetch(`/api/documents/${docId}`, { method: 'DELETE' })
  router.back()
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
  if (!date) return 'Unknown'
  return new Date(date).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}
</script>

<template>
  <div v-if="pending" class="space-y-4">
    <div class="h-8 w-48 animate-pulse rounded bg-muted" />
    <div class="h-64 animate-pulse rounded-lg bg-muted" />
  </div>

  <div v-else-if="error" class="text-center py-16">
    <p class="text-destructive">Failed to load document</p>
    <Button variant="outline" class="mt-4" @click="router.back()">Go Back</Button>
  </div>

  <div v-else-if="doc">
    <!-- Header -->
    <div class="mb-6 flex items-start justify-between">
      <div class="flex items-center gap-3">
        <Button variant="ghost" size="icon" @click="router.back()">
          <ChevronLeft class="h-4 w-4" />
        </Button>
        <div>
          <h1 class="text-lg font-bold tracking-tight">{{ doc.title }}</h1>
          <div class="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
            <span>{{ doc.memberName }}</span>
            <span>{{ formatDate(doc.reportDate) }}</span>
            <Badge v-if="doc.category" variant="outline" class="text-xs">
              {{ categoryLabels[doc.category] || doc.category }}
            </Badge>
          </div>
        </div>
      </div>
      <Button
        size="sm"
        variant="outline"
        class="text-destructive hover:bg-destructive hover:text-destructive-foreground"
        @click="showDeleteDialog = true"
      >
        <Trash2 class="mr-1 h-3 w-3" />
        Delete
      </Button>
    </div>

    <div class="grid gap-6 lg:grid-cols-2">
      <!-- Document Preview -->
      <Card>
        <CardHeader>
          <CardTitle class="text-base">Document</CardTitle>
        </CardHeader>
        <CardContent>
          <div v-if="doc.fileType === 'application/pdf'" class="aspect-[3/4] w-full">
            <iframe :src="doc.fileUrl" class="h-full w-full rounded border" />
          </div>
          <div v-else>
            <img :src="doc.fileUrl" :alt="doc.title" class="w-full rounded" />
          </div>
        </CardContent>
      </Card>

      <!-- AI Summary -->
      <div class="space-y-6">
        <Card v-if="doc.aiSummary">
          <CardHeader>
            <CardTitle class="text-base">AI Summary</CardTitle>
            <CardDescription>Auto-extracted by AI</CardDescription>
          </CardHeader>
          <CardContent class="space-y-4">
            <p class="text-sm">{{ doc.aiSummary.summary }}</p>

            <div v-if="doc.aiSummary.diagnosis?.length">
              <Label class="mb-1">Diagnosis</Label>
              <div class="flex flex-wrap gap-1">
                <Badge v-for="d in doc.aiSummary.diagnosis" :key="d" variant="secondary">{{ d }}</Badge>
              </div>
            </div>

            <div v-if="doc.aiSummary.keyFindings?.length">
              <Label class="mb-1">Key Findings</Label>
              <ul class="space-y-1 text-sm">
                <li v-for="(f, i) in doc.aiSummary.keyFindings" :key="i" class="flex items-start gap-2">
                  <span class="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                  {{ f }}
                </li>
              </ul>
            </div>

            <!-- Test Values -->
            <div v-if="doc.aiSummary.testValues?.length">
              <Label class="mb-1">Test Results</Label>
              <div class="rounded-md border">
                <table class="w-full text-sm">
                  <thead>
                    <tr class="border-b bg-muted/50">
                      <th class="p-2 text-left font-medium">Test</th>
                      <th class="p-2 text-left font-medium">Value</th>
                      <th class="p-2 text-left font-medium">Normal</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(test, i) in (doc.aiSummary.testValues as any[])" :key="i" class="border-b last:border-0">
                      <td class="p-2">{{ test.name }}</td>
                      <td class="p-2" :class="test.isAbnormal ? 'font-semibold text-red-600' : ''">
                        {{ test.value }} {{ test.unit || '' }}
                      </td>
                      <td class="p-2 text-muted-foreground">{{ test.normalRange || '-' }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div v-if="doc.aiSummary.doctorName || doc.aiSummary.hospitalName" class="grid grid-cols-2 gap-2 text-sm">
              <div v-if="doc.aiSummary.doctorName">
                <span class="text-muted-foreground">Doctor:</span>
                <span class="ml-1 font-medium">{{ doc.aiSummary.doctorName }}</span>
              </div>
              <div v-if="doc.aiSummary.hospitalName">
                <span class="text-muted-foreground">Hospital:</span>
                <span class="ml-1 font-medium">{{ doc.aiSummary.hospitalName }}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <!-- Linked Medications -->
        <Card v-if="doc.medications?.length">
          <CardHeader>
            <CardTitle class="text-base">Medications</CardTitle>
          </CardHeader>
          <CardContent>
            <div class="space-y-2">
              <div v-for="med in doc.medications" :key="med.id" class="rounded-md border p-3 text-sm">
                <p class="font-medium">{{ med.name }}</p>
                <div class="mt-1 flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <span v-if="med.dosage">{{ med.dosage }}</span>
                  <span v-if="med.frequency">{{ med.frequency }}</span>
                  <span v-if="med.purpose">For: {{ med.purpose }}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <!-- Linked Conditions -->
        <Card v-if="doc.conditions?.length">
          <CardHeader>
            <CardTitle class="text-base">Conditions</CardTitle>
          </CardHeader>
          <CardContent>
            <div class="flex flex-wrap gap-2">
              <Badge v-for="cond in doc.conditions" :key="cond.id" variant="outline">
                {{ cond.name }}
                <span class="ml-1 text-xs text-muted-foreground">({{ cond.status }})</span>
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>

    <!-- Delete Dialog -->
    <AlertDialog v-model:open="showDeleteDialog">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Report?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete "{{ doc.title }}" and all its associated data. This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction class="bg-destructive text-destructive-foreground" @click="handleDelete">
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>
</template>
