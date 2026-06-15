<script setup>
import { computed } from 'vue'

const props = defineProps({
  timelineData: {
    type: Object,
    default: () => ({ labels: [], data: [] })
  }
})

const hasData = computed(() => {
  return props.timelineData.labels && props.timelineData.labels.length > 0
})

const chartData = computed(() => {
  return {
    labels: props.timelineData.labels,
    datasets: [{
      label: 'Tasks Completed',
      data: props.timelineData.data,
      fill: true,
      backgroundColor: 'rgba(178, 34, 34, 0.1)',
      borderColor: '#b22222',
      tension: 0.4,
      pointBackgroundColor: '#b22222',
      pointBorderColor: '#fff',
      pointRadius: 4,
      pointHoverRadius: 6,
      stepped: false
    }]
  }
})

const chartOptions = computed(() => {
  const documentStyle = getComputedStyle(document.documentElement)
  const textColor = documentStyle.getPropertyValue('--text-color') || '#4b5563'
  const textColorSecondary = documentStyle.getPropertyValue('--text-color-secondary') || '#6b7280'
  const surfaceBorder = documentStyle.getPropertyValue('--surface-border') || '#e5e7eb'

  return {
    maintainAspectRatio: false,
    aspectRatio: 0.6,
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
        labels: { color: textColor }
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const value = context.raw
            return `${Math.round(value)} task${value !== 1 ? 's' : ''} completed`
          }
        }
      }
    },
    scales: {
      x: {
        ticks: {
          color: textColorSecondary,
          maxRotation: 45,
          minRotation: 45
        },
        grid: { color: surfaceBorder }
      },
      y: {
        ticks: {
          color: textColorSecondary,
          stepSize: 1,
          precision: 0,
          callback: function(value) {
            return Math.round(value)
          }
        },
        grid: { color: surfaceBorder },
        title: {
          display: true,
          text: 'Number of Tasks',
          color: textColorSecondary
        },
        min: 0,
        beginAtZero: true
      }
    },
    animation: {
      duration: 500
    },
    elements: {
      point: {
        radius: 4
      }
    }
  }
})
</script>

<template>
  <div class="card w-full flex p-3">
    <pv-chart
        v-if="hasData"
        type="line"
        :data="chartData"
        :options="chartOptions"
        class="w-full h-12rem"
    />
    <div v-else class="flex w-full justify-content-center align-items-center">
      <p class="text-gray-500">No completed tasks in the last 8 weeks</p>
    </div>
  </div>
</template>

<style scoped>

</style>