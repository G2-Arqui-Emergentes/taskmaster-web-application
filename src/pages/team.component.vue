<script setup>
import { ref } from 'vue'
import TeamProjectsList from '@/components/team/TeamProjectsList.vue'
import TeamMembersList from '@/components/team/TeamMembersList.vue'

const selectedProject = ref(null)

const selectProject = (project) => {
  selectedProject.value = project
}
</script>

<template>
  <TeamProjectsList
      v-if="!selectedProject"
      @project-selected="selectProject"
  />

  <TeamMembersList
      v-else
      :project="selectedProject"
      @back="selectedProject = null"
  />
</template>

<style scoped>

</style>