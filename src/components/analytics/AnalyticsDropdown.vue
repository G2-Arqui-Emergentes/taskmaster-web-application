<script setup>
import { ref, onMounted } from 'vue'
import { getProjectsByLeader, getProjectsByMember } from '@/services/project.service.js'

const emit = defineEmits(['projectSelected', 'noProjects'])

const projects = ref([])
const selectedProject = ref(null)

const getCurrentUserRole = () => {
  const user = JSON.parse(localStorage.getItem('user') || '{}')
  const roles = user.roles || []
  if (roles.some(r => r === 'ROLE_LEADER')) return 'LEADER'
  if (roles.some(r => r === 'ROLE_MEMBER')) return 'MEMBER'
  return 'MEMBER'
}

const loadProjects = async () => {
  try {
    const role = getCurrentUserRole()
    let data = []

    if (role === 'LEADER') {
      data = await getProjectsByLeader()
    } else {
      data = await getProjectsByMember()
    }

    projects.value = Array.isArray(data) ? data : []

    if (projects.value.length === 0) {
      emit('noProjects')
    } else {
      const savedProject = localStorage.getItem('selectedProjectForAnalytics')
      if (savedProject) {
        const parsed = JSON.parse(savedProject)
        const found = projects.value.find(p => p.projectId === parsed.projectId)
        if (found) {
          selectedProject.value = found
          emit('projectSelected', found.projectId)
        } else {
          selectedProject.value = projects.value[0]
          emit('projectSelected', projects.value[0].projectId)
        }
      } else {
        selectedProject.value = projects.value[0]
        emit('projectSelected', projects.value[0].projectId)
      }
    }
  } catch (error) {
    console.error('Error loading projects:', error)
    projects.value = []
    emit('noProjects')
  }
}

const handleProjectChange = () => {
  if (selectedProject.value) {
    localStorage.setItem('selectedProjectForAnalytics', JSON.stringify(selectedProject.value))
    emit('projectSelected', selectedProject.value.projectId)
  }
}

onMounted(() => {
  loadProjects()
})
</script>

<template>
  <pv-dropdown
      v-model="selectedProject"
      :options="projects"
      optionLabel="name"
      placeholder="Select a project"
      class="w-full md:w-14rem p-2 mb-4"
      @change="handleProjectChange"
  >
    <template #value="slotProps">
      <div v-if="slotProps.value" class="flex align-items-start">
        <div>{{ slotProps.value.name }}</div>
      </div>
    </template>
    <template #option="slotProps">
      <div class="p-2">{{ slotProps.option.name }}</div>
    </template>
  </pv-dropdown>
</template>

<style scoped>

</style>