<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

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
  const isDark = document.documentElement.dataset.theme === 'dark'
  return {
    labels: props.timelineData.labels,
    datasets: [{
      label: t('analytics.taskscompleted'),
      data: props.timelineData.data,
      fill: true,
      backgroundColor: isDark ? 'rgba(255, 79, 130, 0.14)' : 'rgba(178, 34, 34, 0.1)',
      borderColor: isDark ? '#ff4f82' : '#b22222',
      tension: 0.4,
      pointBackgroundColor: isDark ? '#ff4f82' : '#b22222',
      pointBorderColor: isDark ? '#10141d' : '#fff',
      pointRadius: 4,
      pointHoverRadius: 6,
      stepped: false
    }]
  }
})

const chartOptions = computed(() => {
  const isDark = document.documentElement.dataset.theme === 'dark'
  const documentStyle = getComputedStyle(document.documentElement)
  const textColor = isDark ? '#eef2f8' : (documentStyle.getPropertyValue('--text-color') || '#4b5563')
  const textColorSecondary = isDark ? '#a7b0bf' : (documentStyle.getPropertyValue('--text-color-secondary') || '#6b7280')
  const surfaceBorder = isDark ? '#252b38' : (documentStyle.getPropertyValue('--surface-border') || '#e5e7eb')

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
            return t('analytics.taskscompletedcount', { count: Math.round(value) })
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
          text: t('analytics.numberoftasks'),
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
      <p class="text-gray-500">{{ $t('analytics.nocompletedtasks') }}</p>
    </div>
  </div>
</template>

<style scoped>

</style>
