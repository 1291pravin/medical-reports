<script setup lang="ts">
import { Line } from 'vue-chartjs'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler)

const props = defineProps<{
  data: { recordedAt: string; weightKg: number; bmi: number | null }[]
  showBmi?: boolean
}>()

const chartData = computed(() => {
  const labels = props.data.map((d) =>
    new Date(d.recordedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
  )

  const datasets: any[] = [
    {
      label: 'Weight (kg)',
      data: props.data.map((d) => d.weightKg),
      borderColor: 'oklch(0.47 0.12 195)',
      backgroundColor: 'oklch(0.47 0.12 195 / 0.1)',
      fill: true,
      tension: 0.3,
      pointRadius: 4,
      pointHoverRadius: 6,
    },
  ]

  if (props.showBmi) {
    datasets.push({
      label: 'BMI',
      data: props.data.map((d) => d.bmi),
      borderColor: 'oklch(0.6 0.15 55)',
      backgroundColor: 'oklch(0.6 0.15 55 / 0.1)',
      fill: false,
      tension: 0.3,
      pointRadius: 4,
      pointHoverRadius: 6,
      yAxisID: 'y1',
    })
  }

  return { labels, datasets }
})

const chartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  interaction: { intersect: false, mode: 'index' as const },
  plugins: {
    legend: { display: props.showBmi, position: 'top' as const },
    tooltip: { mode: 'index' as const },
  },
  scales: {
    y: {
      title: { display: true, text: 'Weight (kg)' },
      grid: { color: 'oklch(0.5 0 0 / 0.08)' },
    },
    ...(props.showBmi
      ? {
          y1: {
            position: 'right' as const,
            title: { display: true, text: 'BMI' },
            grid: { drawOnChartArea: false },
          },
        }
      : {}),
    x: {
      grid: { color: 'oklch(0.5 0 0 / 0.05)' },
    },
  },
}))
</script>

<template>
  <div class="h-64">
    <Line v-if="data.length >= 2" :data="chartData" :options="chartOptions" />
    <div v-else class="flex h-full items-center justify-center text-sm text-muted-foreground">
      Need at least 2 data points to show chart
    </div>
  </div>
</template>
