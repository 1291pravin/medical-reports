<script setup lang="ts">
const emit = defineEmits<{
  files: [files: File[]]
}>()

const dragover = ref(false)
const fileInput = ref<HTMLInputElement>()
const cameraInput = ref<HTMLInputElement>()

function handleDrop(e: DragEvent) {
  dragover.value = false
  const files = Array.from(e.dataTransfer?.files || [])
  const valid = files.filter((f) =>
    ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'].includes(f.type),
  )
  if (valid.length) emit('files', valid)
}

function handleFileSelect(e: Event) {
  const input = e.target as HTMLInputElement
  const files = Array.from(input.files || [])
  if (files.length) emit('files', files)
  input.value = ''
}

function openFilePicker() {
  fileInput.value?.click()
}

function openCamera() {
  cameraInput.value?.click()
}
</script>

<template>
  <div
    class="relative rounded-xl border-2 border-dashed p-10 text-center transition-all"
    :class="dragover ? 'border-primary bg-primary/4' : 'border-border hover:border-primary/40 hover:bg-accent/30'"
    @dragover.prevent="dragover = true"
    @dragleave.prevent="dragover = false"
    @drop.prevent="handleDrop"
  >
    <input
      ref="fileInput"
      type="file"
      accept=".pdf,.jpg,.jpeg,.png,.webp"
      multiple
      class="hidden"
      @change="handleFileSelect"
    />
    <input
      ref="cameraInput"
      type="file"
      accept="image/*"
      capture="environment"
      class="hidden"
      @change="handleFileSelect"
    />

    <div class="flex flex-col items-center gap-3">
      <div class="flex h-11 w-11 items-center justify-center rounded-full bg-primary/8 text-primary">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>
      </div>
      <div>
        <p class="text-sm font-medium">Drag & drop files here</p>
        <p class="mt-0.5 text-xs text-muted-foreground">PDF, JPG, PNG supported</p>
      </div>
      <div class="flex gap-2">
        <Button variant="outline" size="sm" @click="openFilePicker">
          Browse Files
        </Button>
        <Button variant="outline" size="sm" class="sm:hidden" @click="openCamera">
          <svg xmlns="http://www.w3.org/2000/svg" class="mr-1 h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg>
          Camera
        </Button>
      </div>
    </div>
  </div>
</template>
