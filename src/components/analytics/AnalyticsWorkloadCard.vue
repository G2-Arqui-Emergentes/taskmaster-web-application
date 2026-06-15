<script setup>
import { computed } from 'vue'

const props = defineProps({
  workloadData: {
    type: Object,
    default: () => ({ labels: [], data: [] })
  }
})

const hasData = computed(() => {
  return props.workloadData.labels && props.workloadData.labels.length > 0
})

const chartData = computed(() => {
  return {
    labels: props.workloadData.labels,
    datasets: [{
      label: 'Tasks Assigned',
      backgroundColor: '#b22222',
      borderColor: '#b22222',
      data: props.workloadData.data
    }]
  }
})

const chartOptions = computed(() => {
  const documentStyle = getComputedStyle(document.documentElement)
  const textColor = documentStyle.getPropertyValue('--text-color') || '#4b5563'
  const textColorSecondary = documentStyle.getPropertyValue('--text-color-secondary') || '#6b7280'
  const surfaceBorder = documentStyle.getPropertyValue('--surface-border') || '#e5e7eb'

  return {
    indexAxis: 'y',
    maintainAspectRatio: false,
    aspectRatio: 0.8,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        callbacks: {
          label: (context) => `${context.raw} tasks`
        }
      }
    },
    scales: {
      x: {
        ticks: { color: textColorSecondary },
        grid: { display: false, drawBorder: false },
        title: {
          display: true,
          text: 'Number of Tasks',
          color: textColorSecondary
        }
      },
      y: {
        ticks: { color: textColorSecondary },
        grid: { color: surfaceBorder, drawBorder: false }
      }
    }
  }
})
</script>

<template>
  <div class="card w-full flex p-3">
    <pv-chart
        v-if="hasData"
        type="bar"
        :data="chartData"
        :options="chartOptions"
        class="h-12rem w-full"
    />
    <div v-else class="flex w-full justify-content-center align-items-center">
      <p class="text-gray-500">No team members assigned</p>
    </div>
  </div>
</template>

<style scoped>

</style>