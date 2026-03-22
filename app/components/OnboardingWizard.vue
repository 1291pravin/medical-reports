<script setup lang="ts">
import { Heart, UserPlus, Upload } from 'lucide-vue-next'

const show = ref(false)

onMounted(() => {
  if (localStorage.getItem('onboarded') !== 'true') {
    show.value = true
  }
})

function dismiss() {
  show.value = false
  localStorage.setItem('onboarded', 'true')
}
</script>

<template>
  <Dialog v-model:open="show">
    <DialogContent class="sm:max-w-md">
      <div class="flex flex-col items-center text-center pt-2 pb-4">
        <div class="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
          <Heart class="h-7 w-7 text-primary" />
        </div>
        <h2 class="text-lg font-bold">Welcome to MedRecords</h2>
        <p class="mt-2 text-sm text-muted-foreground max-w-sm">
          Your family's health records, organized and accessible. Let's get you set up in two quick steps.
        </p>

        <div class="mt-6 w-full space-y-3 text-left">
          <NuxtLink to="/members/add" @click="dismiss">
            <div class="flex items-center gap-3 rounded-xl border p-3.5 transition-all hover:border-primary/30 hover:shadow-sm cursor-pointer">
              <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
                <UserPlus class="h-5 w-5" />
              </div>
              <div>
                <p class="text-sm font-semibold">Add your first family member</p>
                <p class="text-xs text-muted-foreground">Start by adding a family member's profile</p>
              </div>
            </div>
          </NuxtLink>

          <div class="flex items-center gap-3 rounded-xl border p-3.5 opacity-50">
            <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Upload class="h-5 w-5" />
            </div>
            <div>
              <p class="text-sm font-semibold">Upload your first report</p>
              <p class="text-xs text-muted-foreground">Then upload a medical document to get AI insights</p>
            </div>
          </div>
        </div>

        <Button variant="ghost" size="sm" class="mt-4 text-muted-foreground" @click="dismiss">
          Skip for now
        </Button>
      </div>
    </DialogContent>
  </Dialog>
</template>
