<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const props = defineProps({
  tasksData: {
    type: Array,
    default: () => []
  }
})

const hasData = computed(() => {
  return props.tasksData && props.tasksData.length > 0
})

const taskStatusCounts = computed(() => {
  const todo = props.tasksData.filter(t => t.status === 'TO_DO').length
  const inProgress = props.tasksData.filter(t => t.status === 'IN_PROGRESS').length
  const done = props.tasksData.filter(t => t.status === 'DONE').length
  const total = props.tasksData.length || 1

  return {
    todo: Math.round((todo / total) * 100),
    inProgress: Math.round((inProgress / total) * 100),
    done: Math.round((done / total) * 100)
  }
})

const chartData = computed(() => {
  const isDark = document.documentElement.dataset.theme === 'dark'
  return {
    labels: [t('analytics.todo'), t('analytics.inprogress'), t('analytics.done')],
    datasets: [{
      data: [taskStatusCounts.value.todo, taskStatusCounts.value.inProgress, taskStatusCounts.value.done],
      backgroundColor: isDark ? ['#ff6f99', '#f59e0b', '#34d399'] : ['#fecaca', '#fed7aa', '#dcfce7'],
      hoverBackgroundColor: isDark ? ['#ff8cae', '#fbbf24', '#6ee7b7'] : ['#fca5a5', '#fdba74', '#bbf7d0'],
      borderColor: isDark ? '#10141d' : '#ffffff'
    }]
  }
})

const chartOptions = computed(() => {
  const isDark = document.documentElement.dataset.theme === 'dark'
  return {
    cutout: '60%',
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          font: { size: 11 },
          color: isDark ? '#a7b0bf' : '#4b5563'
        }
      },
      tooltip: {
        callbacks: {
          label: (context) => `${context.label}: ${context.parsed}%`
        }
      }
    }
  }
})
</script>

<template>
  <div class="card w-full h-full p-3 flex">
    <pv-chart
        v-if="hasData"
        type="doughnut"
        :data="chartData"
        :options="chartOptions"
        class="flex w-full h-12rem"
    />
    <div v-else class="flex w-full justify-content-center align-items-center">
      <p class="text-gray-500">{{ $t('analytics.notaskscreated') }}</p>
    </div>
  </div>
</template>

<style scoped>

</style>
