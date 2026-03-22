<script setup lang="ts">
import { FileText, X, CheckCircle, XCircle, AlertTriangle } from 'lucide-vue-next'

const router = useRouter()
const route = useRoute()
const { members } = await useMembers()
const { uploadDocument, processDocument } = useDocuments()

type FileStatus = 'pending' | 'uploading' | 'processing' | 'done' | 'error'

interface BatchFile {
  file: File
  status: FileStatus
  error?: string
  docId?: string
}

const step = ref<'upload' | 'processing' | 'done'>('upload')
const selectedMemberId = ref((route.query.memberId as string) || '')
const batchFiles = ref<BatchFile[]>([])
const customInstructions = ref('')
const error = ref('')

function handleFiles(files: File[]) {
  const newFiles = files.map((file) => ({
    file,
    status: 'pending' as FileStatus,
  }))
  batchFiles.value.push(...newFiles)
}

function removeFile(i: number) {
  batchFiles.value.splice(i, 1)
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const processedCount = computed(
  () => batchFiles.value.filter((f) => f.status === 'done' || f.status === 'error').length,
)
const totalCount = computed(() => batchFiles.value.length)
const successCount = computed(() => batchFiles.value.filter((f) => f.status === 'done').length)
const hasErrors = computed(() => batchFiles.value.some((f) => f.status === 'error'))

async function handleUploadAndProcess() {
  if (!selectedMemberId.value || !batchFiles.value.length) {
    error.value = 'Please select a member and add files'
    return
  }

  error.value = ''
  step.value = 'processing'

  for (const bf of batchFiles.value) {
    try {
      // Upload
      bf.status = 'uploading'
      const doc = await uploadDocument(bf.file, {
        familyMemberId: selectedMemberId.value,
      })
      bf.docId = doc.id

      // Process with AI (extract + save medications/conditions + health summary)
      bf.status = 'processing'
      await processDocument(doc.id, {
        customInstructions: customInstructions.value.trim() || undefined,
      })
      bf.status = 'done'
    } catch (e: any) {
      bf.status = 'error'
      bf.error = e.data?.statusMessage || e.message || JSON.stringify(e)
      console.error(`[Upload] Failed to process ${bf.file.name}:`, e)
    }
  }

  step.value = 'done'
}

function goToMember() {
  router.push(`/members/${selectedMemberId.value}`)
}
</script>

<template>
  <div class="mx-auto max-w-3xl">
    <div class="mb-6">
      <h1 class="text-xl font-bold tracking-tight">Upload Medical Reports</h1>
      <p class="mt-0.5 text-sm text-muted-foreground">
        Upload one or more reports — AI will extract and save medical data automatically
      </p>
    </div>

    <!-- Step: Upload -->
    <div v-if="step === 'upload'" class="space-y-6">
      <Card>
        <CardContent class="space-y-4 pt-6">
          <div v-if="error" class="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {{ error }}
          </div>

          <div class="space-y-2">
            <Label>Patient / Family Member *</Label>
            <select
              v-model="selectedMemberId"
              class="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="" disabled>Select a member</option>
              <option v-for="m in members" :key="m.id" :value="m.id">{{ m.name }}</option>
            </select>
          </div>

          <FileUploader @files="handleFiles" />

          <div class="space-y-2">
            <Label for="upload-instructions">Additional instructions (optional)</Label>
            <Textarea
              id="upload-instructions"
              v-model="customInstructions"
              rows="4"
              maxlength="2000"
              placeholder="Example: focus on diabetes-related values, capture all medication names exactly, or summarize the report in simpler language."
            />
            <p class="text-xs text-muted-foreground">
              These instructions will be forwarded to the AI while analyzing the uploaded report.
            </p>
          </div>

          <div v-if="batchFiles.length" class="space-y-2">
            <Label>Selected Files ({{ batchFiles.length }})</Label>
            <div v-for="(bf, i) in batchFiles" :key="i" class="flex items-center justify-between rounded-md border p-2 text-sm">
              <div class="flex items-center gap-2 truncate">
                <FileText class="h-4 w-4 shrink-0 text-muted-foreground" />
                <span class="truncate">{{ bf.file.name }}</span>
                <span class="shrink-0 text-xs text-muted-foreground">{{ formatSize(bf.file.size) }}</span>
              </div>
              <Button variant="ghost" size="icon" class="h-6 w-6 shrink-0" @click="removeFile(i)">
                <X class="h-3 w-3" />
              </Button>
            </div>
          </div>

          <Button
            class="w-full"
            size="lg"
            :disabled="!selectedMemberId || !batchFiles.length"
            @click="handleUploadAndProcess"
          >
            Upload & Analyze {{ batchFiles.length > 1 ? `${batchFiles.length} Files` : '' }}
          </Button>
        </CardContent>
      </Card>
    </div>

    <!-- Step: Processing -->
    <div v-else-if="step === 'processing'" class="space-y-4">
      <Card>
        <CardContent class="py-8">
          <div class="mb-6 text-center">
            <div class="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-muted border-t-primary" />
            <h3 class="font-semibold">AI is analyzing your documents...</h3>
            <p class="mt-1 text-sm text-muted-foreground">
              Processing {{ processedCount }} of {{ totalCount }} files
            </p>
            <p class="mt-2 text-xs text-muted-foreground">
              This may take a minute per file. Medications, conditions, and health summary will be saved automatically.
            </p>
          </div>

          <div class="space-y-2">
            <div v-for="(bf, i) in batchFiles" :key="i" class="flex items-center gap-3 rounded-md border p-3 text-sm">
              <div class="shrink-0">
                <div v-if="bf.status === 'pending'" class="h-5 w-5 rounded-full border-2 border-muted" />
                <div v-else-if="bf.status === 'uploading' || bf.status === 'processing'" class="h-5 w-5 animate-spin rounded-full border-2 border-muted border-t-primary" />
                <CheckCircle v-else-if="bf.status === 'done'" class="h-5 w-5 text-green-600" />
                <XCircle v-else-if="bf.status === 'error'" class="h-5 w-5 text-destructive" />
              </div>
              <div class="min-w-0 flex-1">
                <p class="truncate font-medium">{{ bf.file.name }}</p>
                <p class="text-xs text-muted-foreground">
                  <template v-if="bf.status === 'pending'">Waiting...</template>
                  <template v-else-if="bf.status === 'uploading'">Uploading...</template>
                  <template v-else-if="bf.status === 'processing'">AI analyzing & saving data...</template>
                  <template v-else-if="bf.status === 'done'">Done</template>
                  <template v-else-if="bf.status === 'error'">{{ bf.error }}</template>
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>

    <!-- Step: Done -->
    <div v-else-if="step === 'done'" class="space-y-4">
      <Card>
        <CardContent class="py-8 text-center">
          <CheckCircle v-if="!hasErrors" class="mx-auto mb-4 h-16 w-16 text-green-600" />
          <AlertTriangle v-else class="mx-auto mb-4 h-16 w-16 text-amber-500" />

          <h3 class="text-lg font-semibold">
            {{ hasErrors ? 'Processing Complete (with errors)' : 'All Reports Processed!' }}
          </h3>
          <p class="mt-1 text-sm text-muted-foreground">
            {{ successCount }} of {{ totalCount }} {{ totalCount === 1 ? 'report' : 'reports' }} processed successfully.
            Medications, conditions, and health summary have been saved.
          </p>

          <div v-if="hasErrors" class="mt-4 space-y-2 text-left">
            <div v-for="(bf, i) in batchFiles.filter(f => f.status === 'error')" :key="i" class="flex items-start gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              <XCircle class="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <span class="font-medium">{{ bf.file.name }}:</span> {{ bf.error }}
              </div>
            </div>
          </div>

          <div class="mt-6 flex justify-center gap-3">
            <Button size="lg" @click="goToMember">
              View Member Profile
            </Button>
            <Button variant="outline" size="lg" @click="step = 'upload'; batchFiles = []">
              Upload More
            </Button>
          </div>
        </CardContent>
      </Card>

      <!-- Summary of processed files -->
      <div class="space-y-2">
        <div v-for="(bf, i) in batchFiles" :key="i" class="flex items-center gap-3 rounded-md border p-3 text-sm">
          <div class="shrink-0">
            <CheckCircle v-if="bf.status === 'done'" class="h-5 w-5 text-green-600" />
            <XCircle v-else class="h-5 w-5 text-destructive" />
          </div>
          <div class="min-w-0 flex-1">
            <p class="truncate font-medium">{{ bf.file.name }}</p>
            <p class="text-xs text-muted-foreground">
              {{ bf.status === 'done' ? 'Processed and saved' : bf.error }}
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
