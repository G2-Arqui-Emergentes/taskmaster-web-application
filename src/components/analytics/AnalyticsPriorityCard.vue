<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

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
      label: t('analytics.percentageoftasks'),
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
          label: (context) => t('analytics.percentoftasks', { percentage: context.raw })
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
          text: t('analytics.percentage'),
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
      <p class="text-gray-500">{{ $t('analytics.notaskspriority') }}</p>
    </div>
  </div>
</template>

<style scoped>

</style>
