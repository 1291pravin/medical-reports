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
  data: {
    reportDate: string | null
    numericValue: number | null
    testValue: string
    referenceMin: number | null
    referenceMax: number | null
    isAbnormal: boolean | null
  }[]
  testName: string
  unit?: string | null
}>()

const chartData = computed(() => {
  const points = props.data.filter((d) => d.numericValue !== null)
  const labels = points.map((d) =>
    d.reportDate
      ? new Date(d.reportDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' })
      : '—',
  )

  const datasets: any[] = [
    {
      label: props.testName,
      data: points.map((d) => d.numericValue),
      borderColor: 'oklch(0.47 0.12 195)',
      backgroundColor: 'oklch(0.47 0.12 195 / 0.1)',
      fill: false,
      tension: 0.3,
      pointRadius: 5,
      pointHoverRadius: 7,
      pointBackgroundColor: points.map((d) =>
        d.isAbnormal ? 'oklch(0.577 0.245 27.325)' : 'oklch(0.47 0.12 195)',
      ),
    },
  ]

  // Add reference range bands if available
  const hasRange = points.some((d) => d.referenceMin !== null || d.referenceMax !== null)
  if (hasRange) {
    const refMax = points.map((d) => d.referenceMax)
    const refMin = points.map((d) => d.referenceMin)

    if (refMax.some((v) => v !== null)) {
      datasets.push({
        label: 'Upper Limit',
        data: refMax,
        borderColor: 'oklch(0.577 0.245 27.325 / 0.4)',
        borderDash: [5, 5],
        pointRadius: 0,
        fill: false,
      })
    }
    if (refMin.some((v) => v !== null)) {
      datasets.push({
        label: 'Lower Limit',
        data: refMin,
        borderColor: 'oklch(0.577 0.245 27.325 / 0.4)',
        borderDash: [5, 5],
        pointRadius: 0,
        fill: false,
      })
    }
  }

  return { labels, datasets }
})

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  interaction: { intersect: false, mode: 'index' as const },
  plugins: {
    legend: { display: true, position: 'top' as const },
  },
  scales: {
    y: {
      title: { display: true, text: props.unit || 'Value' },
      grid: { color: 'oklch(0.5 0 0 / 0.08)' },
    },
    x: {
      grid: { color: 'oklch(0.5 0 0 / 0.05)' },
    },
  },
}
</script>

<template>
  <div class="h-64">
    <Line
      v-if="data.filter((d) => d.numericValue !== null).length >= 2"
      :data="chartData"
      :options="chartOptions"
    />
    <div v-else class="flex h-full items-center justify-center text-sm text-muted-foreground">
      Need at least 2 numeric data points to show trend
    </div>
  </div>
</template>
