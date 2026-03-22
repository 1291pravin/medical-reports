<script setup lang="ts">
import { Bar } from 'vue-chartjs'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  TimeScale,
} from 'chart.js'

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend)

const props = defineProps<{
  medications: {
    name: string
    startDate: string | null
    endDate: string | null
    isActive: boolean
  }[]
}>()

const today = new Date()

const chartData = computed(() => {
  const meds = props.medications.filter((m) => m.startDate)

  // Find the earliest start date
  const dates = meds.map((m) => new Date(m.startDate!).getTime())
  const minDate = dates.length ? Math.min(...dates) : today.getTime()

  const labels = meds.map((m) => m.name)

  // Calculate relative positions (days from earliest)
  const startDays = meds.map((m) => {
    const start = new Date(m.startDate!).getTime()
    return Math.round((start - minDate) / (1000 * 60 * 60 * 24))
  })

  const durations = meds.map((m, i) => {
    const start = new Date(m.startDate!).getTime()
    const end = m.endDate ? new Date(m.endDate).getTime() : today.getTime()
    return Math.max(1, Math.round((end - start) / (1000 * 60 * 60 * 24)))
  })

  return {
    labels,
    datasets: [
      {
        label: 'Offset',
        data: startDays,
        backgroundColor: 'transparent',
        borderWidth: 0,
        barPercentage: 0.6,
      },
      {
        label: 'Duration (days)',
        data: durations,
        backgroundColor: meds.map((m) =>
          m.isActive ? 'oklch(0.47 0.12 195 / 0.7)' : 'oklch(0.5 0.02 240 / 0.3)',
        ),
        borderColor: meds.map((m) =>
          m.isActive ? 'oklch(0.47 0.12 195)' : 'oklch(0.5 0.02 240 / 0.5)',
        ),
        borderWidth: 1,
        borderRadius: 4,
        barPercentage: 0.6,
      },
    ],
  }
})

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  indexAxis: 'y' as const,
  plugins: {
    legend: { display: false },
    tooltip: {
      callbacks: {
        label: (ctx: any) => {
          if (ctx.datasetIndex === 0) return ''
          return `${ctx.raw} days`
        },
      },
    },
  },
  scales: {
    x: {
      stacked: true,
      title: { display: true, text: 'Days' },
      grid: { color: 'oklch(0.5 0 0 / 0.05)' },
    },
    y: {
      stacked: true,
      grid: { display: false },
    },
  },
}
</script>

<template>
  <div :style="{ height: `${Math.max(150, medications.filter((m) => m.startDate).length * 36 + 60)}px` }">
    <Bar
      v-if="medications.filter((m) => m.startDate).length > 0"
      :data="chartData"
      :options="chartOptions"
    />
    <div v-else class="flex h-full items-center justify-center text-sm text-muted-foreground">
      No medication data with dates available
    </div>
  </div>
</template>
