<script setup>
import { ref, computed, watch } from 'vue'
import AnalyticsDropdown from './AnalyticsDropdown.vue'
import AnalyticsWorkloadCard from './AnalyticsWorkloadCard.vue'
import AnalyticsHealthCard from './AnalyticsHealthCard.vue'
import AnalyticsPriorityCard from './AnalyticsPriorityCard.vue'
import AnalyticsTimelineCard from './AnalyticsTimelineCard.vue'
import InfoModal from './modals/InfoModal.vue'
import { getTasksByProjectId } from '@/services/task.service.js'
import { getProjectById } from '@/services/project.service.js'
import { UserService } from '@/services/user.service.js'

const selectedProjectId = ref(null)
const hasProjects = ref(true)
const activeModal = ref(null)

const projectData = ref(null)
const allTasks = ref([])
const teamMembers = ref([])

const userService = new UserService()

const formatNumber = (num) => {
  if (!num && num !== 0) return '0'
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

const formatDate = (dateString) => {
  if (!dateString) return 'Not set'
  const date = new Date(dateString)
  return date.toLocaleDateString('es-ES', { year: 'numeric', month: 'short', day: 'numeric' })
}

const formatStatus = (status) => {
  if (!status) return 'Unknown'
  return status.replace('_', ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())
}

const getStatusClass = (status) => {
  if (!status) return ''
  return status.toLowerCase().replace('_', '_')
}

const workloadData = computed(() => {
  if (!teamMembers.value.length || !allTasks.value.length) {
    return { labels: [], data: [] }
  }

  const taskCounts = teamMembers.value.map(member => ({
    name: member.name.split(' ')[0] || member.name,
    count: allTasks.value.filter(task =>
        task.assignedUserIds?.includes(member.id)
    ).length
  }))

  taskCounts.sort((a, b) => b.count - a.count)

  return {
    labels: taskCounts.map(t => t.name),
    data: taskCounts.map(t => t.count)
  }
})

const priorityData = computed(() => {
  const tasks = allTasks.value
  if (!tasks.length) {
    return { labels: ['Low', 'Medium', 'High'], data: [0, 0, 0] }
  }

  const low = tasks.filter(t => t.priority === 'LOW').length
  const medium = tasks.filter(t => t.priority === 'MEDIUM').length
  const high = tasks.filter(t => t.priority === 'HIGH').length
  const total = tasks.length

  return {
    labels: ['Low', 'Medium', 'High'],
    data: [
      Math.round((low / total) * 100),
      Math.round((medium / total) * 100),
      Math.round((high / total) * 100)
    ]
  }
})

const completionPercentage = computed(() => {
  if (!allTasks.value.length) return 0
  const done = allTasks.value.filter(t => t.status === 'DONE').length
  return Math.round((done / allTasks.value.length) * 100)
})

const timelineData = computed(() => {
  if (!allTasks.value.length) {
    return { labels: [], data: [] }
  }

  const completedTasks = allTasks.value.filter(task => task.status === 'DONE')

  if (!completedTasks.length) {
    const weeks = getLastNWeeks(8)
    return {
      labels: weeks.map(w => w.label),
      data: weeks.map(() => 0)
    }
  }

  const weeklyCounts = getWeeklyTaskCounts(completedTasks)
  const last8Weeks = getLastNWeeksWithData(8, weeklyCounts)

  return {
    labels: last8Weeks.map(w => w.label),
    data: last8Weeks.map(w => w.count)
  }
})

const getLastNWeeks = (n) => {
  const weeks = []
  const today = new Date()

  for (let i = n - 1; i >= 0; i--) {
    const weekDate = new Date(today)
    weekDate.setDate(today.getDate() - (i * 7))

    const startOfWeek = new Date(weekDate)
    const day = startOfWeek.getDay()
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1)
    startOfWeek.setDate(diff)

    const endOfWeek = new Date(startOfWeek)
    endOfWeek.setDate(startOfWeek.getDate() + 6)

    const startStr = `${startOfWeek.getDate()}/${startOfWeek.getMonth() + 1}`
    const endStr = `${endOfWeek.getDate()}/${endOfWeek.getMonth() + 1}`

    weeks.push({
      label: `${startStr} - ${endStr}`,
      weekKey: getWeekKey(startOfWeek),
      count: 0
    })
  }

  return weeks
}

const getWeekKey = (date) => {
  const year = date.getFullYear()
  const firstDayOfYear = new Date(year, 0, 1)
  const pastDaysOfYear = (date - firstDayOfYear) / 86400000
  const week = Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7)
  return `${year}-W${week}`
}

const getTaskWeekKey = (taskDate) => {
  if (!taskDate) return null
  const date = new Date(taskDate)
  if (isNaN(date.getTime())) return null

  const startOfWeek = new Date(date)
  const day = startOfWeek.getDay()
  const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1)
  startOfWeek.setDate(diff)

  return getWeekKey(startOfWeek)
}

const getWeeklyTaskCounts = (completedTasks) => {
  const weeklyMap = new Map()

  completedTasks.forEach(task => {
    const completionDate = task.updatedAt || task.endDate
    if (!completionDate) return

    const weekKey = getTaskWeekKey(completionDate)
    if (!weekKey) return

    weeklyMap.set(weekKey, (weeklyMap.get(weekKey) || 0) + 1)
  })

  return weeklyMap
}

const getLastNWeeksWithData = (n, weeklyCounts) => {
  const result = []
  const today = new Date()

  for (let i = n - 1; i >= 0; i--) {
    const weekDate = new Date(today)
    weekDate.setDate(today.getDate() - (i * 7))

    const startOfWeek = new Date(weekDate)
    const day = startOfWeek.getDay()
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1)
    startOfWeek.setDate(diff)

    const endOfWeek = new Date(startOfWeek)
    endOfWeek.setDate(startOfWeek.getDate() + 6)

    const startStr = `${startOfWeek.getDate()}/${startOfWeek.getMonth() + 1}`
    const endStr = `${endOfWeek.getDate()}/${endOfWeek.getMonth() + 1}`

    const weekKey = getWeekKey(startOfWeek)
    const count = weeklyCounts.get(weekKey) || 0

    result.push({
      label: `${startStr} - ${endStr}`,
      weekKey: weekKey,
      count: count
    })
  }

  return result
}

const loadTeamMembers = async (projectId) => {
  try {
    const response = await userService.getAllUsers()
    const allUsers = Array.isArray(response) ? response : response?.data || []

    const members = allUsers.filter(user => {
      const roles = user.roles || []
      const isMember = roles.some(r => String(r).toUpperCase().includes('MEMBER'))
      const belongsToProject = user.projectIds?.includes(Number(projectId))
      return isMember && belongsToProject
    })

    teamMembers.value = members.map(m => ({
      id: m.id,
      name: `${m.name || ''} ${m.lastName || ''}`.trim() || m.email,
      email: m.email
    }))
  } catch (error) {
    console.error('Error loading team members:', error)
    teamMembers.value = []
  }
}

const loadTasks = async (projectId) => {
  if (!projectId) return

  try {
    const tasks = await getTasksByProjectId(projectId)
    allTasks.value = Array.isArray(tasks) ? tasks : []
    console.log('Tareas cargadas:', allTasks.value.length)
  } catch (error) {
    console.error('Error loading tasks:', error)
    allTasks.value = []
  }
}

const loadProjectDetails = async (projectId) => {
  if (!projectId) return

  try {
    const project = await getProjectById(projectId)
    projectData.value = project
  } catch (error) {
    console.error('Error loading project details:', error)
    projectData.value = null
  }
}

const loadAllData = async (projectId) => {
  if (!projectId) return

  await Promise.all([
    loadProjectDetails(projectId),
    loadTasks(projectId),
    loadTeamMembers(projectId)
  ])
}

const handleProjectSelected = async (projectId) => {
  selectedProjectId.value = projectId
  await loadAllData(projectId)
}

const handleNoProjects = () => {
  hasProjects.value = false
}

const openModal = (modalName) => {
  activeModal.value = modalName
}

const closeModal = () => {
  activeModal.value = null
}
</script>

<template>
  <section class="h-full p-4 lg:p-5 w-full relative" style="min-height: 100%">
    <div class="flex flex-row justify-content-between flex-wrap gap-0">
      <div class="flex flex-column gap-4" style="width: unset">
        <h2 class="title-analytics text-4xl">Analytics</h2>
        <AnalyticsDropdown
            @no-projects="handleNoProjects"
            @project-selected="handleProjectSelected"
        />
      </div>
      <div class="align-self-center border-1 flex align-items-center flex-row border-round-2xl text-white mb-2"
           style="width: unset; background-color: #b22222; padding: 15px 20px; gap: 10px">
        <p class="w-max">Project Insights</p>
        <i class="text-lg pi pi-chart-line"></i>
      </div>
    </div>

    <div v-if="hasProjects && projectData" class="analytics-container">

      <pv-card class="card budget w-full p-4 cursor-pointer" @click="openModal('budget')">
        <template #header>
          <p class="font-medium mb-3">Budget Overview:</p>
        </template>
        <template #content>
          <div class="budget-stats">
            <div class="budget-item">
              <span class="budget-label">Total Budget</span>
              <span class="budget-value">${{ formatNumber(projectData.budget) }}</span>
            </div>
            <div class="budget-progress">
              <div class="progress-bar">
                <div class="progress-fill" :style="{ width: completionPercentage + '%' }"></div>
              </div>
              <span class="progress-text">{{ completionPercentage }}% Complete</span>
            </div>
            <div class="budget-item">
              <span class="budget-label">Project Status</span>
              <span class="status-badge" :class="getStatusClass(projectData.status)">{{ formatStatus(projectData.status) }}</span>
            </div>
            <div class="budget-item">
              <span class="budget-label">Due Date</span>
              <span class="budget-value">{{ formatDate(projectData.endDate) }}</span>
            </div>
          </div>
        </template>
      </pv-card>

      <pv-card class="card workload flex w-full flex-column cursor-pointer" @click="openModal('workload')">
        <template #header>
          <p class="text">Team Workload:</p>
        </template>
        <template #content>
          <div class="graph">
            <AnalyticsWorkloadCard :workload-data="workloadData" />
          </div>
        </template>
      </pv-card>

      <pv-card class="card health flex w-full flex-column w-full cursor-pointer" @click="openModal('health')">
        <template #header>
          <p class="text">Project Health:</p>
        </template>
        <template #content>
          <div class="flex w-full">
            <AnalyticsHealthCard :tasks-data="allTasks" />
          </div>
        </template>
      </pv-card>

      <pv-card class="card priority flex w-full flex-column w-full cursor-pointer" @click="openModal('priority')">
        <template #header>
          <p class="text">Priority Distribution:</p>
        </template>
        <template #content>
          <div class="flex">
            <AnalyticsPriorityCard :priority-data="priorityData" />
          </div>
        </template>
      </pv-card>

      <pv-card class="card timeline flex w-full flex-column w-full cursor-pointer" @click="openModal('timeline')">
        <template #header>
          <p class="text">Weekly Progress (Last 8 weeks):</p>
        </template>
        <template #content>
          <div class="flex">
            <AnalyticsTimelineCard :timeline-data="timelineData" />
          </div>
        </template>
      </pv-card>

    </div>

    <section v-else>
      <div class="flex flex-column align-items-center justify-content-center h-full">
        <p class="text-2xl font-medium">No projects found</p>
      </div>
    </section>

    <InfoModal
        v-if="activeModal"
        :modal-type="activeModal"
        @close="closeModal"
    />
  </section>
</template>

<style scoped>
.card:hover {
  background-color: #F5F5F5;
}

.title-analytics {
  font-family: 'Lora', serif;
  color: #b22222;
  font-weight: 600 !important;
  letter-spacing: 1.05px;
}

.analytics-container {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  grid-template-rows: auto auto;
  gap: 20px;
}

.budget {
  grid-column: 1 / 3;
  grid-row: 1 / 2;
}

.workload {
  grid-column: 3 / 5;
  grid-row: 1 / 2;
}

.health {
  grid-column: 5 / 7;
  grid-row: 1 / 2;
}

.priority {
  grid-column: 1 / 4;
  grid-row: 2 / 3;
}

.timeline {
  grid-column: 4 / 7;
  grid-row: 2 / 3;
}

.budget-stats {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.budget-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.budget-label {
  font-weight: 500;
  color: #6b7280;
}

.budget-value {
  font-weight: 700;
  font-size: 1.1rem;
  color: #b22222;
}

.budget-progress {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.progress-bar {
  height: 10px;
  background-color: #e5e7eb;
  border-radius: 10px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background-color: #b22222;
  border-radius: 10px;
  transition: width 0.3s ease;
}

.progress-text {
  font-size: 0.85rem;
  color: #6b7280;
  text-align: center;
}

.status-badge {
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: 600;
}

.status-badge.planned {
  background-color: #fff5f5;
  color: #b22222;
}

.status-badge.in_progress {
  background-color: #fef3c7;
  color: #d97706;
}

.status-badge.completed {
  background-color: #e8f5e9;
  color: #2e7d32;
}

.status-badge.cancelled {
  background-color: #fee2e2;
  color: #dc2626;
}

@media (max-width: 1024px) {
  .analytics-container {
    grid-template-columns: 1fr;
    grid-template-rows: repeat(5, auto);
  }

  .budget,
  .workload,
  .health,
  .priority,
  .timeline {
    grid-column: 1 / 2;
  }

  .budget { grid-row: 1 / 2; }
  .workload { grid-row: 2 / 3; }
  .health { grid-row: 3 / 4; }
  .priority { grid-row: 4 / 5; }
  .timeline { grid-row: 5 / 6; }
}

.flex {
  display: flex;
  justify-content: center;
  width: 100%;
}

.text {
  padding-left: 30px;
  padding-top: 20px;
  padding-bottom: 10px;
}
</style>