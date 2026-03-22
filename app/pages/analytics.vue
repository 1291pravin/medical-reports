<script setup lang="ts">
import { BarChart3, Users, Activity, Pill, FileText, TrendingUp, Scale, ArrowRight } from 'lucide-vue-next'

definePageMeta({ middleware: 'auth' })

const { data: familyData, pending } = await useFetch<any[]>('/api/analytics/family')

const totalDocuments = computed(() => familyData.value?.reduce((sum, m) => sum + (m.documentCount || 0), 0) || 0)
const totalActiveMeds = computed(() => familyData.value?.reduce((sum, m) => sum + (m.activeMedCount || 0), 0) || 0)
const totalActiveConditions = computed(() => familyData.value?.reduce((sum, m) => sum + (m.activeConditions || 0), 0) || 0)

function age(dob: string | null): string {
  if (!dob) return '—'
  const diff = Date.now() - new Date(dob).getTime()
  return `${Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000))}y`
}

function bmi(weight: number | null, height: number | null): string {
  if (!weight || !height) return '—'
  return (weight / ((height / 100) ** 2)).toFixed(1)
}

function bmiCategory(weight: number | null, height: number | null): { label: string; color: string } {
  if (!weight || !height) return { label: '', color: '' }
  const val = weight / ((height / 100) ** 2)
  if (val < 18.5) return { label: 'Underweight', color: 'text-amber-600 dark:text-amber-400' }
  if (val < 25) return { label: 'Normal', color: 'text-green-600 dark:text-green-400' }
  if (val < 30) return { label: 'Overweight', color: 'text-amber-600 dark:text-amber-400' }
  return { label: 'Obese', color: 'text-red-600 dark:text-red-400' }
}
</script>

<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-2xl font-bold flex items-center gap-2">
        <BarChart3 class="h-6 w-6 text-primary" />
        Family Analytics
      </h1>
      <p class="text-sm text-muted-foreground mt-1">Overview of your family's health data</p>
    </div>

    <div v-if="pending" class="flex items-center justify-center py-12">
      <div class="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>

    <template v-else-if="familyData && familyData.length > 0">
      <!-- Summary Stats -->
      <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card class="p-4">
          <div class="flex items-center gap-2 text-muted-foreground">
            <Users class="h-4 w-4" />
            <span class="text-xs font-medium">Members</span>
          </div>
          <p class="mt-1 text-2xl font-bold">{{ familyData.length }}</p>
        </Card>
        <Card class="p-4">
          <div class="flex items-center gap-2 text-muted-foreground">
            <FileText class="h-4 w-4" />
            <span class="text-xs font-medium">Documents</span>
          </div>
          <p class="mt-1 text-2xl font-bold">{{ totalDocuments }}</p>
        </Card>
        <Card class="p-4">
          <div class="flex items-center gap-2 text-muted-foreground">
            <Pill class="h-4 w-4" />
            <span class="text-xs font-medium">Active Meds</span>
          </div>
          <p class="mt-1 text-2xl font-bold">{{ totalActiveMeds }}</p>
        </Card>
        <Card class="p-4">
          <div class="flex items-center gap-2 text-muted-foreground">
            <Activity class="h-4 w-4" />
            <span class="text-xs font-medium">Active Conditions</span>
          </div>
          <p class="mt-1 text-2xl font-bold">{{ totalActiveConditions }}</p>
        </Card>
      </div>

      <!-- Member Comparison Table -->
      <Card>
        <CardHeader>
          <CardTitle class="text-lg">Family Health Overview</CardTitle>
          <p class="text-sm text-muted-foreground">Compare health metrics across family members</p>
        </CardHeader>
        <CardContent>
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr class="border-b text-left text-muted-foreground">
                  <th class="pb-2 pr-4 font-medium">Member</th>
                  <th class="pb-2 pr-4 font-medium">Age</th>
                  <th class="pb-2 pr-4 font-medium">Blood</th>
                  <th class="pb-2 pr-4 font-medium">Weight</th>
                  <th class="pb-2 pr-4 font-medium">BMI</th>
                  <th class="pb-2 pr-4 font-medium text-center">Docs</th>
                  <th class="pb-2 pr-4 font-medium text-center">Meds</th>
                  <th class="pb-2 pr-4 font-medium text-center">Conditions</th>
                  <th class="pb-2 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="m in familyData" :key="m.id" class="border-b last:border-0">
                  <td class="py-3 pr-4 font-medium">{{ m.name }}</td>
                  <td class="py-3 pr-4 text-muted-foreground">{{ age(m.dob) }}</td>
                  <td class="py-3 pr-4">
                    <Badge v-if="m.bloodGroup" variant="outline" class="text-xs">{{ m.bloodGroup }}</Badge>
                    <span v-else class="text-muted-foreground">—</span>
                  </td>
                  <td class="py-3 pr-4">
                    <span v-if="m.weightKg">{{ m.weightKg }} kg</span>
                    <span v-else class="text-muted-foreground">—</span>
                  </td>
                  <td class="py-3 pr-4">
                    <span v-if="m.weightKg && m.heightCm">
                      {{ bmi(Number(m.weightKg), Number(m.heightCm)) }}
                      <span class="text-xs ml-1" :class="bmiCategory(Number(m.weightKg), Number(m.heightCm)).color">
                        {{ bmiCategory(Number(m.weightKg), Number(m.heightCm)).label }}
                      </span>
                    </span>
                    <span v-else class="text-muted-foreground">—</span>
                  </td>
                  <td class="py-3 pr-4 text-center">{{ m.documentCount || 0 }}</td>
                  <td class="py-3 pr-4 text-center">
                    <Badge v-if="m.activeMedCount > 0" variant="secondary">{{ m.activeMedCount }}</Badge>
                    <span v-else class="text-muted-foreground">0</span>
                  </td>
                  <td class="py-3 pr-4 text-center">
                    <Badge v-if="m.activeConditions > 0" variant="destructive" class="text-xs">{{ m.activeConditions }}</Badge>
                    <span v-else class="text-muted-foreground">0</span>
                  </td>
                  <td class="py-3">
                    <NuxtLink :to="`/members/${m.id}`" class="text-primary hover:underline">
                      <ArrowRight class="h-4 w-4" />
                    </NuxtLink>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <!-- Per-Member Cards (mobile-friendly) -->
      <div class="grid gap-4 sm:grid-cols-2 lg:hidden">
        <Card v-for="m in familyData" :key="'card-' + m.id" class="overflow-hidden">
          <CardHeader class="pb-2">
            <div class="flex items-center justify-between">
              <CardTitle class="text-base">{{ m.name }}</CardTitle>
              <Badge v-if="m.bloodGroup" variant="outline" class="text-xs">{{ m.bloodGroup }}</Badge>
            </div>
            <p v-if="m.dob" class="text-xs text-muted-foreground">{{ age(m.dob) }} old</p>
          </CardHeader>
          <CardContent class="space-y-2 text-sm">
            <div class="flex justify-between">
              <span class="text-muted-foreground">Weight</span>
              <span>{{ m.weightKg ? `${m.weightKg} kg` : '—' }}</span>
            </div>
            <div v-if="m.weightKg && m.heightCm" class="flex justify-between">
              <span class="text-muted-foreground">BMI</span>
              <span>
                {{ bmi(Number(m.weightKg), Number(m.heightCm)) }}
                <span class="text-xs ml-1" :class="bmiCategory(Number(m.weightKg), Number(m.heightCm)).color">
                  {{ bmiCategory(Number(m.weightKg), Number(m.heightCm)).label }}
                </span>
              </span>
            </div>
            <div class="flex gap-3 pt-1 text-xs">
              <span class="flex items-center gap-1">
                <FileText class="h-3 w-3" /> {{ m.documentCount || 0 }} docs
              </span>
              <span class="flex items-center gap-1">
                <Pill class="h-3 w-3" /> {{ m.activeMedCount || 0 }} meds
              </span>
              <span class="flex items-center gap-1">
                <Activity class="h-3 w-3" /> {{ m.activeConditions || 0 }} conditions
              </span>
            </div>
            <NuxtLink :to="`/members/${m.id}`" class="mt-2 block">
              <Button size="sm" variant="outline" class="w-full">
                <TrendingUp class="mr-1 h-4 w-4" />
                View Details
              </Button>
            </NuxtLink>
          </CardContent>
        </Card>
      </div>
    </template>

    <!-- Empty State -->
    <EmptyState
      v-else
      :icon="BarChart3"
      title="No analytics data yet"
      description="Add family members and upload medical documents to see health analytics."
      action-label="Add Family Member"
      action-to="/members/new"
    />
  </div>
</template>
