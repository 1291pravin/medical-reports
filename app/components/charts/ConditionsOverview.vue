<script setup lang="ts">
import { Doughnut } from 'vue-chartjs'
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js'

ChartJS.register(ArcElement, Tooltip, Legend)

const props = defineProps<{
  conditions: { name: string; status: string }[]
}>()

const statusCounts = computed(() => {
  const counts = { active: 0, resolved: 0, monitoring: 0 }
  for (const c of props.conditions) {
    if (c.status in counts) counts[c.status as keyof typeof counts]++
  }
  return counts
})

const total = computed(() => props.conditions.length)

const chartData = computed(() => ({
  labels: ['Active', 'Monitoring', 'Resolved'],
  datasets: [
    {
      data: [statusCounts.value.active, statusCounts.value.monitoring, statusCounts.value.resolved],
      backgroundColor: [
        'oklch(0.577 0.245 27.325 / 0.8)',
        'oklch(0.7 0.15 55 / 0.8)',
        'oklch(0.55 0.15 160 / 0.8)',
      ],
      borderColor: [
        'oklch(0.577 0.245 27.325)',
        'oklch(0.7 0.15 55)',
        'oklch(0.55 0.15 160)',
      ],
      borderWidth: 1,
    },
  ],
}))

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  cutout: '65%',
  plugins: {
    legend: {
      position: 'bottom' as const,
      labels: { padding: 16, usePointStyle: true, pointStyle: 'circle' },
    },
  },
}
</script>

<template>
  <div class="flex flex-col items-center">
    <div class="relative h-48 w-48">
      <Doughnut v-if="total > 0" :data="chartData" :options="chartOptions" />
      <div v-if="total > 0" class="absolute inset-0 flex items-center justify-center">
        <div class="text-center">
          <p class="text-2xl font-bold">{{ total }}</p>
          <p class="text-[10px] text-muted-foreground">Total</p>
        </div>
      </div>
    </div>
    <p v-if="total === 0" class="text-sm text-muted-foreground">No conditions recorded</p>
  </div>
</template>
