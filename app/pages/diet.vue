<script setup lang="ts">
import type { FamilyDietPlan, FamilyGroceryList } from '~~/shared/types/diet'

const { members } = await useMembers()

const dietPlan = ref<FamilyDietPlan | null>(null)
const groceryList = ref<FamilyGroceryList | null>(null)
const exportedPdf = ref<{ fileUrl: string; fileName: string } | null>(null)
const dietLoading = ref(false)
const groceryLoading = ref(false)
const pdfLoading = ref(false)
const dietDays = ref<1 | 7 | 30>(7)
const dietError = ref<string | null>(null)
const actionError = ref<string | null>(null)
const dietInstructions = ref('')
const selectedMemberIds = ref<Set<string>>(new Set())

watch(
  () => members.value,
  (value) => {
    if (value.length && !selectedMemberIds.value.size) {
      selectedMemberIds.value = new Set(value.map(member => member.id))
    }
  },
  { immediate: true },
)

function toggleMember(id: string) {
  const next = new Set(selectedMemberIds.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  selectedMemberIds.value = next
}

function toggleAll() {
  if (selectedMemberIds.value.size === members.value.length) {
    selectedMemberIds.value = new Set()
    return
  }

  selectedMemberIds.value = new Set(members.value.map(member => member.id))
}

const selectedMembers = computed(() => members.value.filter(member => selectedMemberIds.value.has(member.id)))
const selectedMemberIdsList = computed(() => [...selectedMemberIds.value])
const selectedMemberNames = computed(() => selectedMembers.value.map(member => member.name))
const planLengthLabel = computed(() => (dietDays.value === 1 ? '1 day' : `${dietDays.value} days`))
const selectedMemberLabel = computed(() => {
  if (!selectedMemberNames.value.length) return 'No members selected'
  if (selectedMemberNames.value.length <= 3) return selectedMemberNames.value.join(', ')
  return `${selectedMemberNames.value.slice(0, 3).join(', ')} +${selectedMemberNames.value.length - 3} more`
})

function resetDerivedOutputs() {
  groceryList.value = null
  exportedPdf.value = null
  actionError.value = null
}

async function generateFamilyDiet() {
  dietLoading.value = true
  dietError.value = null
  actionError.value = null
  dietPlan.value = null
  resetDerivedOutputs()

  try {
    dietPlan.value = await $fetch<FamilyDietPlan>('/api/diet/family', {
      method: 'POST',
      body: {
        days: dietDays.value,
        memberIds: selectedMemberIdsList.value,
        instructions: dietInstructions.value.trim() || undefined,
      },
    })
  } catch (err: any) {
    dietError.value = err?.data?.message || err?.message || 'Failed to generate family diet plan'
  } finally {
    dietLoading.value = false
  }
}

async function generateGroceryList() {
  if (!dietPlan.value) return

  groceryLoading.value = true
  actionError.value = null
  try {
    groceryList.value = await $fetch<FamilyGroceryList>('/api/diet/family/grocery', {
      method: 'POST',
      body: {
        days: dietDays.value,
        memberIds: selectedMemberIdsList.value,
        plan: dietPlan.value,
      },
    })
    exportedPdf.value = null
  } catch (err: any) {
    actionError.value = err?.data?.message || err?.message || 'Failed to generate grocery list'
  } finally {
    groceryLoading.value = false
  }
}

async function ensurePdf() {
  if (!dietPlan.value) return null

  if (exportedPdf.value) {
    return {
      ...exportedPdf.value,
      groceryList: groceryList.value,
    }
  }

  pdfLoading.value = true
  actionError.value = null
  try {
    const response = await $fetch<{
      fileName: string
      fileUrl: string
      groceryList: FamilyGroceryList
    }>('/api/diet/family/pdf', {
      method: 'POST',
      body: {
        days: dietDays.value,
        memberIds: selectedMemberIdsList.value,
        plan: dietPlan.value,
        groceryList: groceryList.value || undefined,
      },
    })

    groceryList.value = response.groceryList
    exportedPdf.value = {
      fileName: response.fileName,
      fileUrl: response.fileUrl,
    }

    return response
  } catch (err: any) {
    actionError.value = err?.data?.message || err?.message || 'Failed to prepare PDF'
    return null
  } finally {
    pdfLoading.value = false
  }
}

async function fetchPdfBlob(fileUrl: string) {
  const response = await fetch(fileUrl)
  if (!response.ok) {
    throw new Error('Unable to fetch the exported PDF')
  }
  return response.blob()
}

async function downloadPdf() {
  const pdf = await ensurePdf()
  if (!pdf) return

  try {
    const blob = await fetchPdfBlob(pdf.fileUrl)
    const objectUrl = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = objectUrl
    link.download = pdf.fileName
    link.click()
    URL.revokeObjectURL(objectUrl)
  } catch (err: any) {
    actionError.value = err?.message || 'Failed to download PDF'
  }
}

async function shareOnWhatsApp() {
  const pdf = await ensurePdf()
  if (!pdf) return

  try {
    const blob = await fetchPdfBlob(pdf.fileUrl)
    const file = new File([blob], pdf.fileName, { type: 'application/pdf' })

    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      await navigator.share({
        title: `Family Diet Plan - ${planLengthLabel.value}`,
        files: [file],
      })
      return
    }

    const objectUrl = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = objectUrl
    link.download = pdf.fileName
    link.click()
    URL.revokeObjectURL(objectUrl)

    const text = encodeURIComponent(
      `Family diet PDF for ${selectedMemberNames.value.join(', ')} has been downloaded. Attach the PDF in this WhatsApp chat.`,
    )
    window.open(`https://wa.me/?text=${text}`, '_blank')
  } catch (err: any) {
    actionError.value = err?.message || 'Failed to share PDF'
  }
}
</script>

<template>
  <div>
    <div class="mb-6">
      <h1 class="text-xl font-bold tracking-tight">Family Diet Plan</h1>
      <p class="mt-1 text-sm text-muted-foreground">
        Generate one family-safe diet plan, turn it into a grocery list, and export a clearer PDF from the server.
      </p>
    </div>

    <div v-if="members.length" class="mb-6">
      <div class="mb-2 flex items-center justify-between">
        <span class="text-sm font-medium">Select Members</span>
        <button class="text-xs text-primary hover:underline" @click="toggleAll">
          {{ selectedMemberIds.size === members.length ? 'Deselect All' : 'Select All' }}
        </button>
      </div>
      <div class="flex flex-wrap gap-2">
        <button
          v-for="member in members"
          :key="member.id"
          class="flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs transition-colors"
          :class="selectedMemberIds.has(member.id)
            ? 'border-primary bg-primary/10 text-foreground'
            : 'border-dashed border-muted-foreground/30 text-muted-foreground opacity-60'"
          @click="toggleMember(member.id)"
        >
          <span
            class="flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors"
            :class="selectedMemberIds.has(member.id)
              ? 'border-primary bg-primary text-primary-foreground'
              : 'border-muted-foreground/40'"
          >
            <svg
              v-if="selectedMemberIds.has(member.id)"
              xmlns="http://www.w3.org/2000/svg"
              class="h-3 w-3"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="3"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="m5 12 5 5L20 7" />
            </svg>
          </span>
          <span class="font-medium">{{ member.name }}</span>
          <span v-if="member.dietPreference" class="text-muted-foreground capitalize">{{ member.dietPreference }}</span>
          <span v-if="member.allergies?.length" class="text-red-500">{{ member.allergies.join(', ') }}</span>
        </button>
      </div>
    </div>

    <div class="mb-6 space-y-4">
      <Card class="border-primary/15 bg-gradient-to-br from-primary/5 via-background to-emerald-50/80">
        <CardContent class="space-y-4 p-5">
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p class="text-xs font-semibold uppercase tracking-[0.22em] text-primary/80">Plan Setup</p>
              <h2 class="mt-1 text-lg font-semibold">Family meal plan + grocery export</h2>
              <p class="mt-1 text-sm text-muted-foreground">Current selection: {{ selectedMemberLabel }}</p>
            </div>

            <div class="flex items-center gap-1.5 rounded-lg border bg-background/80 p-1">
              <button
                v-for="opt in [1, 7, 30] as const"
                :key="opt"
                class="rounded-md px-3 py-1.5 text-sm font-medium transition-colors"
                :class="dietDays === opt ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'"
                @click="dietDays = opt"
              >
                {{ opt === 1 ? '1 Day' : opt === 7 ? '7 Days' : '30 Days' }}
              </button>
            </div>
          </div>

          <div class="space-y-2">
            <Label for="family-diet-instructions">Additional instructions (optional)</Label>
            <Textarea
              id="family-diet-instructions"
              v-model="dietInstructions"
              rows="4"
              maxlength="2000"
              placeholder="Example: keep meals South Indian, avoid expensive ingredients, include kid-friendly options, or prefer quick weekday prep."
            />
            <p class="text-xs text-muted-foreground">
              These instructions are forwarded to the AI when generating the family diet plan.
            </p>
          </div>

          <div class="flex flex-wrap items-center gap-3">
            <Button :disabled="dietLoading || !selectedMemberIds.size" @click="generateFamilyDiet">
              {{ dietLoading ? 'Generating...' : 'Generate Diet Plan' }}
            </Button>
            <p class="text-xs text-muted-foreground">
              The PDF export is rendered on the server and saved to the configured uploads storage.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card v-if="dietPlan && !dietLoading" class="border-emerald-200/70 bg-white">
        <CardContent class="space-y-4 p-5">
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p class="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-700">Actions</p>
              <h2 class="mt-1 text-lg font-semibold">Plan is ready</h2>
              <p class="mt-1 text-sm text-muted-foreground">
                {{ planLengthLabel }} plan for {{ selectedMemberNames.length }} member{{ selectedMemberNames.length === 1 ? '' : 's' }}.
                The PDF will include the grocery list automatically.
              </p>
            </div>

            <div class="flex flex-wrap gap-2">
              <Button variant="outline" :disabled="groceryLoading || pdfLoading" @click="generateGroceryList">
                {{ groceryLoading ? 'Generating...' : groceryList ? 'Refresh Grocery List' : 'Generate Grocery List' }}
              </Button>
              <Button variant="outline" :disabled="pdfLoading || groceryLoading" @click="downloadPdf">
                {{ pdfLoading ? 'Preparing PDF...' : 'Download PDF' }}
              </Button>
              <Button
                variant="outline"
                class="border-green-200 text-green-700 hover:bg-green-50"
                :disabled="pdfLoading || groceryLoading"
                @click="shareOnWhatsApp"
              >
                WhatsApp
              </Button>
            </div>
          </div>

          <div v-if="exportedPdf" class="rounded-lg border border-dashed border-emerald-200 bg-emerald-50/70 px-3 py-2 text-sm">
            <span class="font-medium text-emerald-900">Latest PDF:</span>
            <a :href="exportedPdf.fileUrl" target="_blank" class="ml-2 text-emerald-700 underline">
              {{ exportedPdf.fileName }}
            </a>
          </div>

          <div
            v-if="actionError"
            class="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive"
          >
            {{ actionError }}
          </div>
        </CardContent>
      </Card>
    </div>

    <Card v-if="!members.length">
      <CardContent class="py-8 text-center">
        <p class="text-sm text-muted-foreground">Add family members first to generate a family diet plan.</p>
        <NuxtLink to="/members/add">
          <Button variant="outline" class="mt-3" size="sm">Add Member</Button>
        </NuxtLink>
      </CardContent>
    </Card>

    <Card v-else-if="!selectedMemberIds.size && !dietPlan && !dietLoading">
      <CardContent class="py-8 text-center">
        <p class="text-sm text-muted-foreground">Select at least one family member to generate a diet plan.</p>
      </CardContent>
    </Card>

    <div v-if="dietError" class="mb-4 rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
      {{ dietError }}
    </div>

    <div v-if="dietLoading" class="space-y-3">
      <div v-for="i in 4" :key="i" class="h-24 animate-pulse rounded-lg bg-muted" />
    </div>

    <div v-if="dietPlan && !dietLoading" class="space-y-6">
      <section class="space-y-4">
        <div class="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p class="text-xs font-semibold uppercase tracking-[0.22em] text-primary/80">Diet</p>
            <h2 class="text-lg font-semibold">Family diet overview</h2>
          </div>
          <Badge variant="secondary" class="bg-primary/10 text-primary">{{ planLengthLabel }}</Badge>
        </div>

        <div class="grid gap-4 lg:grid-cols-[1.25fr_0.75fr]">
          <Card>
            <CardHeader>
              <CardTitle class="text-base">Family Diet Overview</CardTitle>
            </CardHeader>
            <CardContent class="space-y-3">
              <p class="text-sm leading-6">{{ dietPlan.overview }}</p>

              <div v-if="dietPlan.familyConstraints" class="grid gap-3 md:grid-cols-2">
                <div class="rounded-lg border bg-muted/30 p-3">
                  <p class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Shared base</p>
                  <p class="mt-1 text-sm font-medium capitalize">
                    {{ dietPlan.familyConstraints.commonDietBase || 'No shared base specified' }}
                  </p>
                </div>
                <div class="rounded-lg border bg-muted/30 p-3">
                  <p class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Allergens to avoid</p>
                  <div class="mt-2 flex flex-wrap gap-1.5">
                    <Badge
                      v-for="(allergy, index) in dietPlan.familyConstraints.combinedAllergies || []"
                      :key="index"
                      variant="destructive"
                      class="text-xs"
                    >
                      {{ allergy }}
                    </Badge>
                    <span v-if="!dietPlan.familyConstraints.combinedAllergies?.length" class="text-sm text-muted-foreground">
                      None listed
                    </span>
                  </div>
                </div>
              </div>

              <div v-if="dietPlan.familyConstraints?.specialConsiderations?.length" class="space-y-2">
                <p class="text-sm font-medium">Special considerations</p>
                <ul class="space-y-1.5">
                  <li
                    v-for="(consideration, index) in dietPlan.familyConstraints.specialConsiderations"
                    :key="index"
                    class="flex items-start gap-2 text-sm text-muted-foreground"
                  >
                    <span class="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                    <span>{{ consideration }}</span>
                  </li>
                </ul>
              </div>
            </CardContent>
          </Card>

          <Card v-if="dietPlan.perMemberNotes?.length">
            <CardHeader>
              <CardTitle class="text-base">Per-Member Guidelines</CardTitle>
            </CardHeader>
            <CardContent class="space-y-3">
              <div v-for="(note, index) in dietPlan.perMemberNotes" :key="index" class="rounded-lg border bg-muted/20 p-3">
                <p class="text-sm font-medium">{{ note.member }}</p>
                <p v-if="note.dailyCalories" class="mt-1 text-xs text-muted-foreground">Calories: {{ note.dailyCalories }}</p>
                <p v-if="note.keyFocus" class="mt-1 text-xs text-muted-foreground">{{ note.keyFocus }}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <section class="space-y-4">
        <div class="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p class="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-700">Groceries</p>
            <h2 class="text-lg font-semibold">Grocery list</h2>
          </div>
          <Button variant="outline" size="sm" :disabled="groceryLoading || pdfLoading" @click="generateGroceryList">
            {{ groceryLoading ? 'Generating...' : groceryList ? 'Refresh Grocery List' : 'Generate Grocery List' }}
          </Button>
        </div>

        <Card v-if="groceryLoading">
          <CardContent class="space-y-3 p-5">
            <div v-for="i in 3" :key="i" class="h-16 animate-pulse rounded-lg bg-muted" />
          </CardContent>
        </Card>

        <Card v-else-if="!groceryList" class="border-dashed border-emerald-200 bg-emerald-50/40">
          <CardContent class="py-8 text-center">
            <p class="text-sm text-muted-foreground">
              Generate a consolidated grocery list from this diet plan. PDF export will also create it automatically if needed.
            </p>
          </CardContent>
        </Card>

        <template v-else>
          <div class="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
            <Card>
              <CardHeader>
                <CardTitle class="text-base">Shopping Summary</CardTitle>
              </CardHeader>
              <CardContent class="space-y-3">
                <p v-if="groceryList.summary" class="text-sm leading-6">{{ groceryList.summary }}</p>
                <p v-else class="text-sm text-muted-foreground">Grouped grocery list generated from the current family diet plan.</p>
                <div class="grid gap-3 sm:grid-cols-2">
                  <div class="rounded-lg border bg-muted/20 p-3">
                    <p class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Sections</p>
                    <p class="mt-1 text-lg font-semibold">{{ groceryList.sections.length }}</p>
                  </div>
                  <div class="rounded-lg border bg-muted/20 p-3">
                    <p class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Members</p>
                    <p class="mt-1 text-lg font-semibold">{{ selectedMemberNames.length }}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card v-if="dietPlan.shoppingTips?.length || groceryList.notes?.length">
              <CardHeader>
                <CardTitle class="text-base">Shopping Notes</CardTitle>
              </CardHeader>
              <CardContent class="space-y-2">
                <div
                  v-for="(tip, index) in [...(dietPlan.shoppingTips || []), ...(groceryList.notes || [])]"
                  :key="index"
                  class="flex items-start gap-2 text-sm text-muted-foreground"
                >
                  <span class="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-green-500" />
                  <span>{{ tip }}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <Card
              v-for="(section, index) in groceryList.sections"
              :key="`${section.title}-${index}`"
              class="border-emerald-200/70"
            >
              <CardHeader class="pb-3">
                <CardTitle class="text-base text-emerald-800">{{ section.title }}</CardTitle>
              </CardHeader>
              <CardContent>
                <ul class="space-y-2">
                  <li
                    v-for="(item, itemIndex) in section.items"
                    :key="itemIndex"
                    class="flex items-start gap-2 text-sm text-muted-foreground"
                  >
                    <span class="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                    <span>{{ item }}</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>

          <div class="grid gap-4 lg:grid-cols-2">
            <Card v-if="groceryList.pantryStaples?.length">
              <CardHeader>
                <CardTitle class="text-base">Pantry Staples</CardTitle>
              </CardHeader>
              <CardContent>
                <div class="flex flex-wrap gap-1.5">
                  <Badge
                    v-for="(item, index) in groceryList.pantryStaples"
                    :key="index"
                    variant="secondary"
                    class="bg-amber-50 text-amber-700"
                  >
                    {{ item }}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card v-if="groceryList.prepAhead?.length">
              <CardHeader>
                <CardTitle class="text-base">Prep Ahead</CardTitle>
              </CardHeader>
              <CardContent class="space-y-2">
                <div
                  v-for="(item, index) in groceryList.prepAhead"
                  :key="index"
                  class="flex items-start gap-2 text-sm text-muted-foreground"
                >
                  <span class="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                  <span>{{ item }}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </template>
      </section>

      <section class="space-y-4">
        <div class="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p class="text-xs font-semibold uppercase tracking-[0.22em] text-primary/80">Meals</p>
            <h2 class="text-lg font-semibold">Daily diet plan</h2>
          </div>
          <p class="text-sm text-muted-foreground">
            Each day shows the shared meal plus any member-specific adjustment.
          </p>
        </div>

        <div v-for="day in dietPlan.days" :key="day.day" class="space-y-3">
          <Badge variant="secondary" class="bg-primary/10 text-primary">Day {{ day.day }}</Badge>
          <Card class="overflow-hidden">
            <CardContent class="space-y-4 p-4">
              <div v-for="(meal, mealKey) in day.meals" :key="mealKey" class="rounded-xl border bg-muted/15 p-4">
                <div class="mb-2 flex flex-wrap items-center gap-2">
                  <span class="text-sm font-semibold capitalize">{{ String(mealKey).replace(/([A-Z])/g, ' $1').trim() }}</span>
                  <Badge v-if="meal?.time" variant="outline" class="text-[11px]">{{ meal.time }}</Badge>
                </div>

                <ul v-if="meal?.sharedItems?.length" class="space-y-1.5">
                  <li
                    v-for="(item, index) in meal.sharedItems"
                    :key="index"
                    class="flex items-start gap-2 text-sm text-muted-foreground"
                  >
                    <span class="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                    <span>{{ item }}</span>
                  </li>
                </ul>

                <div v-if="meal?.memberModifications?.length" class="mt-3 space-y-1.5">
                  <p class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Member adjustments</p>
                  <div
                    v-for="(modification, index) in meal.memberModifications"
                    :key="index"
                    class="flex items-start gap-2 text-xs"
                  >
                    <Badge variant="outline" class="shrink-0 text-[10px]">{{ modification.member }}</Badge>
                    <span class="text-muted-foreground">{{ modification.modification }}</span>
                  </div>
                </div>

                <p v-if="meal?.notes" class="mt-3 text-xs italic text-muted-foreground/80">{{ meal.notes }}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>

    <Card v-if="!dietPlan && !dietLoading && !dietError && members.length && selectedMemberIds.size">
      <CardContent class="py-8 text-center">
        <p class="text-sm text-muted-foreground">
          Generate a unified diet plan that works for your entire family, considering everyone's conditions, allergies,
          and dietary preferences.
        </p>
      </CardContent>
    </Card>
  </div>
</template>
