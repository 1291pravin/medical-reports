<script setup lang="ts">
const { members } = await useMembers()

const dietPlan = ref<any>(null)
const dietLoading = ref(false)
const dietDays = ref<1 | 7 | 30>(7)
const dietError = ref<string | null>(null)
const selectedMemberIds = ref<Set<string>>(new Set())
const pdfLoading = ref(false)

// Select all members by default
watch(
  () => members.value,
  (val) => {
    if (val.length && !selectedMemberIds.value.size) {
      selectedMemberIds.value = new Set(val.map((m) => m.id))
    }
  },
  { immediate: true },
)

function toggleMember(id: string) {
  const s = new Set(selectedMemberIds.value)
  if (s.has(id)) s.delete(id)
  else s.add(id)
  selectedMemberIds.value = s
}

function toggleAll() {
  if (selectedMemberIds.value.size === members.value.length) {
    selectedMemberIds.value = new Set()
  } else {
    selectedMemberIds.value = new Set(members.value.map((m) => m.id))
  }
}

const selectedMembers = computed(() => members.value.filter((m) => selectedMemberIds.value.has(m.id)))

async function generateFamilyDiet() {
  dietLoading.value = true
  dietError.value = null
  dietPlan.value = null
  try {
    dietPlan.value = await $fetch('/api/diet/family', {
      method: 'POST',
      body: {
        days: dietDays.value,
        memberIds: [...selectedMemberIds.value],
      },
    })
  } catch (err: any) {
    dietError.value = err?.data?.message || err?.message || 'Failed to generate family diet plan'
  } finally {
    dietLoading.value = false
  }
}

async function generatePdf(): Promise<Blob | null> {
  if (!dietPlan.value) return null

  pdfLoading.value = true
  try {
    const { jsPDF } = await import('jspdf')
    const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' })
    const plan = dietPlan.value
    const names = selectedMembers.value.map((m) => m.name).join(', ')
    const pageW = doc.internal.pageSize.getWidth()
    const margin = 15
    const maxW = pageW - margin * 2
    let y = margin

    function checkPage(needed: number) {
      if (y + needed > doc.internal.pageSize.getHeight() - margin) {
        doc.addPage()
        y = margin
      }
    }

    function addText(text: string, opts: { size?: number; bold?: boolean; color?: [number, number, number]; indent?: number } = {}) {
      const { size = 10, bold = false, color = [26, 26, 26], indent = 0 } = opts
      doc.setFontSize(size)
      doc.setFont('helvetica', bold ? 'bold' : 'normal')
      doc.setTextColor(...color)
      const lines = doc.splitTextToSize(text, maxW - indent)
      const lineH = size * 0.45
      checkPage(lines.length * lineH)
      doc.text(lines, margin + indent, y)
      y += lines.length * lineH + 1
    }

    // Title
    addText(`Family Diet Plan - ${dietDays.value} ${dietDays.value === 1 ? 'Day' : 'Days'}`, { size: 16, bold: true })
    addText(`For: ${names} | Generated: ${new Date().toLocaleDateString()}`, { size: 9, color: [120, 120, 120] })
    y += 3

    // Overview
    if (plan.overview) {
      addText('Overview', { size: 12, bold: true })
      addText(plan.overview, { size: 9, color: [80, 80, 80] })
    }
    if (plan.familyConstraints?.commonDietBase) {
      addText(`Diet Base: ${plan.familyConstraints.commonDietBase}`, { size: 9, indent: 2 })
    }
    if (plan.familyConstraints?.combinedAllergies?.length) {
      addText(`Allergens: ${plan.familyConstraints.combinedAllergies.join(', ')}`, { size: 9, color: [180, 40, 40], indent: 2 })
    }
    y += 2

    // Per-member notes
    if (plan.perMemberNotes?.length) {
      addText('Per-Member Guidelines', { size: 12, bold: true })
      for (const note of plan.perMemberNotes) {
        let line = note.member
        if (note.dailyCalories) line += ` — ${note.dailyCalories} cal`
        if (note.keyFocus) line += ` — ${note.keyFocus}`
        addText(line, { size: 9, indent: 3 })
      }
      y += 2
    }

    // Days
    if (plan.days?.length) {
      for (const day of plan.days) {
        addText(`Day ${day.day}`, { size: 12, bold: true })
        if (day.meals) {
          for (const [mealKey, meal] of Object.entries(day.meals) as [string, any][]) {
            if (!meal) continue
            const label = mealKey.replace(/([A-Z])/g, ' $1').trim()
            addText(`${label}${meal.time ? ' (' + meal.time + ')' : ''}`, { size: 10, bold: true, indent: 2 })
            if (meal.sharedItems?.length) {
              for (const item of meal.sharedItems) {
                addText(`• ${item}`, { size: 9, color: [60, 60, 60], indent: 6 })
              }
            }
            if (meal.memberModifications?.length) {
              for (const mod of meal.memberModifications) {
                addText(`[${mod.member}] ${mod.modification}`, { size: 8, color: [100, 100, 100], indent: 6 })
              }
            }
            if (meal.notes) {
              addText(meal.notes, { size: 8, color: [140, 140, 140], indent: 6 })
            }
          }
        }
        y += 2
      }
    }

    // Shopping tips
    if (plan.shoppingTips?.length) {
      addText('Shopping & Prep Tips', { size: 12, bold: true })
      for (const tip of plan.shoppingTips) {
        addText(`• ${tip}`, { size: 9, color: [60, 60, 60], indent: 3 })
      }
    }

    return doc.output('blob') as Blob
  } finally {
    pdfLoading.value = false
  }
}

async function downloadPdf() {
  const blob = await generatePdf()
  if (!blob) return

  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `diet-plan-${dietDays.value}days.pdf`
  a.click()
  URL.revokeObjectURL(url)
}

async function shareOnWhatsApp() {
  const blob = await generatePdf()
  if (!blob) return

  const file = new File([blob], `diet-plan-${dietDays.value}days.pdf`, { type: 'application/pdf' })

  // Try native share with file (works on mobile)
  if (navigator.share && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({
        title: `Family Diet Plan - ${dietDays.value} Days`,
        files: [file],
      })
      return
    } catch {
      // User cancelled or failed — fall through to text share
    }
  }

  // Fallback: download PDF + open WhatsApp with text message
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = file.name
  a.click()
  URL.revokeObjectURL(url)

  const names = selectedMembers.value.map((m) => m.name).join(', ')
  const text = encodeURIComponent(
    `Family Diet Plan (${dietDays.value} days) for: ${names}\nPDF downloaded - please attach it to this chat.`,
  )
  window.open(`https://wa.me/?text=${text}`, '_blank')
}
</script>

<template>
  <div>
    <div class="mb-6">
      <h1 class="text-xl font-bold tracking-tight">Family Diet Plan</h1>
      <p class="mt-1 text-sm text-muted-foreground">
        AI-generated diet plan that accommodates all family members' health needs, conditions, and preferences.
      </p>
    </div>

    <!-- Members selection strip -->
    <div v-if="members.length" class="mb-6">
      <div class="flex items-center justify-between mb-2">
        <span class="text-sm font-medium">Select Members</span>
        <button class="text-xs text-primary hover:underline" @click="toggleAll">
          {{ selectedMemberIds.size === members.length ? 'Deselect All' : 'Select All' }}
        </button>
      </div>
      <div class="flex flex-wrap gap-2">
        <button
          v-for="m in members"
          :key="m.id"
          class="flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs transition-colors"
          :class="
            selectedMemberIds.has(m.id)
              ? 'border-primary bg-primary/10 text-foreground'
              : 'border-dashed border-muted-foreground/30 text-muted-foreground opacity-60'
          "
          @click="toggleMember(m.id)"
        >
          <span
            class="flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors"
            :class="
              selectedMemberIds.has(m.id)
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-muted-foreground/40'
            "
          >
            <svg
              v-if="selectedMemberIds.has(m.id)"
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
          <span class="font-medium">{{ m.name }}</span>
          <span v-if="m.dietPreference" class="text-muted-foreground capitalize">{{ m.dietPreference }}</span>
          <span v-if="m.allergies?.length" class="text-red-500">{{ m.allergies.join(', ') }}</span>
        </button>
      </div>
    </div>

    <!-- Controls -->
    <div class="mb-6 flex items-center gap-3 flex-wrap">
      <div class="flex items-center gap-1.5 rounded-lg border p-1">
        <button
          v-for="opt in [1, 7, 30] as const"
          :key="opt"
          class="rounded-md px-3 py-1.5 text-sm font-medium transition-colors"
          :class="
            dietDays === opt ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
          "
          @click="dietDays = opt"
        >
          {{ opt === 1 ? '1 Day' : opt === 7 ? '7 Days' : '30 Days' }}
        </button>
      </div>
      <Button :disabled="dietLoading || !selectedMemberIds.size" @click="generateFamilyDiet">
        <svg
          v-if="dietLoading"
          xmlns="http://www.w3.org/2000/svg"
          class="mr-1.5 h-4 w-4 animate-spin"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M21 12a9 9 0 1 1-6.219-8.56" />
        </svg>
        <svg
          v-else
          xmlns="http://www.w3.org/2000/svg"
          class="mr-1.5 h-4 w-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M12 20V10" />
          <path d="M18 20V4" />
          <path d="M6 20v-4" />
        </svg>
        {{ dietLoading ? 'Generating...' : 'Generate Diet Plan' }}
      </Button>

      <!-- PDF & WhatsApp buttons (shown only when plan exists) -->
      <template v-if="dietPlan && !dietLoading">
        <Button variant="outline" :disabled="pdfLoading" @click="downloadPdf">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="mr-1.5 h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" x2="12" y1="15" y2="3" />
          </svg>
          {{ pdfLoading ? 'Creating...' : 'Download PDF' }}
        </Button>
        <Button variant="outline" class="text-green-600 border-green-200 hover:bg-green-50" :disabled="pdfLoading" @click="shareOnWhatsApp">
          <svg xmlns="http://www.w3.org/2000/svg" class="mr-1.5 h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
            <path
              d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"
            />
          </svg>
          WhatsApp
        </Button>
      </template>
    </div>

    <!-- No members -->
    <Card v-if="!members.length">
      <CardContent class="py-8 text-center">
        <p class="text-sm text-muted-foreground">Add family members first to generate a family diet plan.</p>
        <NuxtLink to="/members/add">
          <Button variant="outline" class="mt-3" size="sm">Add Member</Button>
        </NuxtLink>
      </CardContent>
    </Card>

    <!-- No selection -->
    <Card v-else-if="!selectedMemberIds.size && !dietPlan && !dietLoading">
      <CardContent class="py-8 text-center">
        <p class="text-sm text-muted-foreground">Select at least one family member to generate a diet plan.</p>
      </CardContent>
    </Card>

    <!-- Error -->
    <div
      v-if="dietError"
      class="mb-4 rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive"
    >
      {{ dietError }}
    </div>

    <!-- Loading -->
    <div v-if="dietLoading" class="space-y-3">
      <div v-for="i in 4" :key="i" class="h-24 animate-pulse rounded-lg bg-muted" />
    </div>

    <!-- Results (visible on screen) -->
    <div v-if="dietPlan && !dietLoading" class="space-y-4">
      <!-- Overview -->
      <Card>
        <CardHeader>
          <CardTitle class="text-base flex items-center gap-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            Family Diet Overview
          </CardTitle>
        </CardHeader>
        <CardContent class="space-y-3">
          <p class="text-sm">{{ dietPlan.overview }}</p>

          <div v-if="dietPlan.familyConstraints" class="space-y-2">
            <div v-if="dietPlan.familyConstraints.commonDietBase" class="text-sm">
              <span class="font-medium">Common Diet Base:</span>
              <span class="ml-1 capitalize">{{ dietPlan.familyConstraints.commonDietBase }}</span>
            </div>
            <div v-if="dietPlan.familyConstraints.combinedAllergies?.length">
              <span class="text-sm font-medium">Allergens to Avoid:</span>
              <div class="mt-1 flex flex-wrap gap-1.5">
                <Badge
                  v-for="(a, i) in dietPlan.familyConstraints.combinedAllergies"
                  :key="i"
                  variant="destructive"
                  class="text-xs"
                >
                  {{ a }}
                </Badge>
              </div>
            </div>
            <div v-if="dietPlan.familyConstraints.specialConsiderations?.length">
              <span class="text-sm font-medium">Special Considerations:</span>
              <ul class="mt-1 space-y-1">
                <li
                  v-for="(c, i) in dietPlan.familyConstraints.specialConsiderations"
                  :key="i"
                  class="text-sm text-muted-foreground flex items-start gap-2"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    class="mt-0.5 h-3 w-3 shrink-0 text-amber-500"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 16v-4" />
                    <path d="M12 8h.01" />
                  </svg>
                  {{ c }}
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      <!-- Per Member Notes -->
      <Card v-if="dietPlan.perMemberNotes?.length">
        <CardHeader>
          <CardTitle class="text-base">Per-Member Guidelines</CardTitle>
        </CardHeader>
        <CardContent>
          <div class="grid gap-3 sm:grid-cols-2">
            <div v-for="(note, i) in dietPlan.perMemberNotes" :key="i" class="rounded-lg border p-3">
              <h4 class="text-sm font-medium">{{ note.member }}</h4>
              <p v-if="note.dailyCalories" class="text-xs text-muted-foreground">
                Calories: {{ note.dailyCalories }}
              </p>
              <p v-if="note.keyFocus" class="text-xs text-muted-foreground mt-0.5">{{ note.keyFocus }}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <!-- Daily Plans -->
      <div v-for="day in dietPlan.days" :key="day.day" class="space-y-2">
        <h3 class="text-sm font-semibold text-muted-foreground">Day {{ day.day }}</h3>
        <Card>
          <CardContent class="p-4 space-y-4">
            <div
              v-for="(meal, mealKey) in day.meals"
              :key="mealKey"
              class="border-b last:border-0 pb-3 last:pb-0"
            >
              <div class="flex items-center gap-2 mb-1">
                <span class="text-sm font-medium capitalize">{{
                  String(mealKey).replace(/([A-Z])/g, ' $1').trim()
                }}</span>
                <span v-if="meal?.time" class="text-xs text-muted-foreground">{{ meal.time }}</span>
              </div>
              <ul v-if="meal?.sharedItems?.length" class="ml-4 space-y-0.5">
                <li
                  v-for="(item, j) in meal.sharedItems"
                  :key="j"
                  class="text-sm text-muted-foreground list-disc"
                >
                  {{ item }}
                </li>
              </ul>
              <div v-if="meal?.memberModifications?.length" class="mt-1.5 ml-4 space-y-0.5">
                <div v-for="(mod, j) in meal.memberModifications" :key="j" class="flex items-start gap-1.5 text-xs">
                  <Badge variant="outline" class="text-[10px] shrink-0">{{ mod.member }}</Badge>
                  <span class="text-muted-foreground">{{ mod.modification }}</span>
                </div>
              </div>
              <p v-if="meal?.notes" class="mt-1 ml-4 text-xs text-muted-foreground/70 italic">{{ meal.notes }}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <!-- Shopping Tips -->
      <Card v-if="dietPlan.shoppingTips?.length">
        <CardHeader>
          <CardTitle class="text-base">Shopping & Prep Tips</CardTitle>
        </CardHeader>
        <CardContent>
          <ul class="space-y-1.5">
            <li
              v-for="(tip, i) in dietPlan.shoppingTips"
              :key="i"
              class="flex items-start gap-2 text-sm text-muted-foreground"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="mt-0.5 h-3 w-3 shrink-0 text-green-500"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path d="m9 12 2 2 4-4" />
                <circle cx="12" cy="12" r="10" />
              </svg>
              {{ tip }}
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>

    <!-- Empty state -->
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
