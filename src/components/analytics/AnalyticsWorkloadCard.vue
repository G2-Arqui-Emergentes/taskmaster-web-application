<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

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
      label: t('analytics.tasksassigned'),
      backgroundColor: '#b22222',
      borderColor: '#b22222',
      data: props.workloadData.data
    }]
  }
})

const chartOptions = computed(() => {
  const isDark = document.documentElement.dataset.theme === 'dark'
  const documentStyle = getComputedStyle(document.documentElement)
  const textColorSecondary = isDark ? '#a7b0bf' : (documentStyle.getPropertyValue('--text-color-secondary') || '#6b7280')
  const surfaceBorder = isDark ? '#252b38' : (documentStyle.getPropertyValue('--surface-border') || '#e5e7eb')

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
          label: (context) => t('analytics.taskscount', { count: context.raw })
        }
      }
    },
    scales: {
      x: {
        ticks: { color: textColorSecondary },
        grid: { display: false, drawBorder: false },
        title: {
          display: true,
          text: t('analytics.numberoftasks'),
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
      <p class="text-gray-500">{{ $t('analytics.noteammembersassigned') }}</p>
    </div>
  </div>
</template>

<style scoped>

</style>
