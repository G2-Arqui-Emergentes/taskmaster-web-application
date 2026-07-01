<script setup>
import { computed } from 'vue'

const props = defineProps({
  priorityData: {
    type: Object,
    default: () => ({ labels: [], data: [] })
  }
})

const hasData = computed(() => {
  return props.priorityData.data && props.priorityData.data.some(v => v > 0)
})

const chartData = computed(() => {
  return {
    labels: props.priorityData.labels,
    datasets: [{
      label: 'Percentage of Tasks (%)',
      backgroundColor: ['#fecaca', '#fed7aa', '#ef4444'],
      data: props.priorityData.data
    }]
  }
})

const chartOptions = computed(() => {
  const isDark = document.documentElement.dataset.theme === 'dark'
  const documentStyle = getComputedStyle(document.documentElement)
  const textColorSecondary = isDark ? '#a7b0bf' : (documentStyle.getPropertyValue('--text-color-secondary') || '#6b7280')
  const surfaceBorder = isDark ? '#252b38' : '#e5e7eb'

  return {
    maintainAspectRatio: false,
    aspectRatio: 0.8,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        callbacks: {
          label: (context) => `${context.raw}% of tasks`
        }
      }
    },
    scales: {
      x: {
        ticks: { color: textColorSecondary },
        grid: { display: false }
      },
      y: {
        ticks: { color: textColorSecondary },
        grid: { color: surfaceBorder },
        title: {
          display: true,
          text: 'Percentage (%)',
          color: textColorSecondary
        },
        max: 100
      }
    }
  }
})
</script>

<template>
  <div class="card w-full p-5 flex">
    <pv-chart
        v-if="hasData"
        type="bar"
        :data="chartData"
        :options="chartOptions"
        class="h-12rem w-full"
    />
    <div v-else class="flex w-full justify-content-center align-items-center">
      <p class="text-gray-500">No tasks with priority assigned</p>
    </div>
  </div>
</template>

<style scoped>

</style>
