<script setup>
import { computed } from 'vue'
import LeaderDashboard from './LeaderDashboard.vue'
import MemberDashboard from './MemberDashboard.vue'

const currentUser = computed(() => {
  return JSON.parse(localStorage.getItem('user') || '{}')
})

const isLeader = computed(() => {
  const roles = currentUser.value?.roles || []
  return roles.some(r => r === 'ROLE_LEADER')
})
</script>

<template>
  <section class="dashboard-container">
    <LeaderDashboard v-if="isLeader" />
    <MemberDashboard v-else />
  </section>
</template>

<style scoped>
.dashboard-container {
  min-height: 100vh;
  background: #f8fafc;
}
</style>