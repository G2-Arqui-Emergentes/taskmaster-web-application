<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import LeaderDashboard from './LeaderDashboard.vue'
import MemberDashboard from './MemberDashboard.vue'

const currentTheme = ref(document.documentElement.dataset.theme || localStorage.getItem('theme') || 'light')
const isDarkTheme = computed(() => currentTheme.value === 'dark')

const currentUser = computed(() => {
  return JSON.parse(localStorage.getItem('user') || '{}')
})

const isLeader = computed(() => {
  const roles = currentUser.value?.roles || []
  return roles.some(r => r === 'ROLE_LEADER')
})

const resolveThemePreference = () => {
  const preference = localStorage.getItem('theme') || 'light'
  if (preference === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }
  return preference
}

const syncTheme = (event) => {
  currentTheme.value = event?.detail?.theme || document.documentElement.dataset.theme || resolveThemePreference()
}

onMounted(() => {
  currentTheme.value = document.documentElement.dataset.theme || resolveThemePreference()
  window.addEventListener('theme-changed', syncTheme)
  window.addEventListener('storage', syncTheme)
})

onBeforeUnmount(() => {
  window.removeEventListener('theme-changed', syncTheme)
  window.removeEventListener('storage', syncTheme)
})
</script>

<template>
  <section class="dashboard-container" :class="{ 'dark-dashboard': isDarkTheme }">
    <LeaderDashboard v-if="isLeader" />
    <MemberDashboard v-else />
  </section>
</template>

<style scoped>
.dashboard-container {
  min-height: 100vh;
  background: #f8fafc;
}

.dashboard-container.dark-dashboard {
  background: #080b12;
}
</style>
