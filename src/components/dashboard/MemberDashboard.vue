<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { getProjectsByMember } from '@/services/project.service.js'
import { getTasksByUserId } from '@/services/task.service.js'

const router = useRouter()

const currentUser = ref(JSON.parse(localStorage.getItem('user') || '{}'))
const userName = computed(() => currentUser.value?.name || 'Member')

const myTasks = ref([])
const myProjects = ref([])

const activeTasksCount = ref(0)
const upcomingDeadlinesCount = ref(0)
const completedTasksCount = ref(0)
const totalTasksCount = ref(0)
const completionPercentage = ref(0)

const smartVelocity = ref({ current: 4.2, max: 5.0 })
const delayWarning = ref('AI predicts a 15% chance of delay on Project Neon due to recent review bottlenecks.')
const suggestion1 = ref('Shift focus to "UI Assets" before 2 PM to maximize your morning peak productivity window.')
const suggestion2 = ref('Consider rescheduling Thursday\'s meeting to clear a 4-hour Deep Work block.')
const lastUpdated = ref('just now')

const upcomingTasks = ref([])

const projectMembersMap = ref({
  1: [
    { id: 1, name: 'Ana', avatar: 'https://randomuser.me/api/portraits/women/1.jpg' },
    { id: 2, name: 'Carlos', avatar: 'https://randomuser.me/api/portraits/men/2.jpg' },
    { id: 3, name: 'Laura', avatar: 'https://randomuser.me/api/portraits/women/3.jpg' },
    { id: 4, name: 'Pedro', avatar: 'https://randomuser.me/api/portraits/men/4.jpg' },
    { id: 5, name: 'Maria', avatar: 'https://randomuser.me/api/portraits/women/5.jpg' }
  ],
  2: [
    { id: 1, name: 'Ana', avatar: 'https://randomuser.me/api/portraits/women/1.jpg' },
    { id: 2, name: 'Carlos', avatar: 'https://randomuser.me/api/portraits/men/2.jpg' }
  ],
  3: [
    { id: 1, name: 'Ana', avatar: 'https://randomuser.me/api/portraits/women/1.jpg' },
    { id: 2, name: 'Carlos', avatar: 'https://randomuser.me/api/portraits/men/2.jpg' },
    { id: 3, name: 'Laura', avatar: 'https://randomuser.me/api/portraits/women/3.jpg' },
    { id: 4, name: 'Pedro', avatar: 'https://randomuser.me/api/portraits/men/4.jpg' }
  ]
})

const circumference = 2 * Math.PI * 54
const circumferenceOffset = computed(() => {
  return circumference - (completionPercentage.value / 100) * circumference
})

const calculateTimeLeft = (endDate) => {
  if (!endDate) return 'No date'
  const now = new Date()
  const due = new Date(endDate)
  const diffMs = due - now
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffHours < 0) return 'Overdue'
  if (diffHours < 24) return `${diffHours}h left`
  if (diffDays === 1) return 'Tomorrow'
  if (diffDays < 7) return `${diffDays}d left`
  return due.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

const getUrgencyFromDate = (endDate) => {
  if (!endDate) return 'NORMAL'
  const now = new Date()
  const due = new Date(endDate)
  const diffHours = (due - now) / (1000 * 60 * 60)

  if (diffHours < 24 && diffHours > 0) return 'URGENT'
  if (diffHours < 72 && diffHours > 0) return 'HIGH'
  return 'NORMAL'
}

const getPriorityFromTask = (priority) => {
  switch (priority) {
    case 'HIGH': return 'HIGH'
    case 'MEDIUM': return 'MEDIUM'
    default: return 'LOW'
  }
}

const loadUserProjects = async () => {
  try {
    const projects = await getProjectsByMember()
    myProjects.value = Array.isArray(projects) ? projects : []
  } catch (error) {
    console.error('Error loading user projects:', error)
    myProjects.value = [
      { projectId: 1, name: 'Clean Carpayo Beach', description: 'Lorem ipsum dolor sit amet consectetur adipiscing elit augue pretium erat.', status: 'IN_PROGRESS' },
      { projectId: 2, name: 'Tree Planting', description: 'Planting 1000 trees in the urban area to improve air quality.', status: 'IN_PROGRESS' },
      { projectId: 3, name: 'Recycling Programme', description: 'Implement recycling stations across the city.', status: 'PLANNED' }
    ]
  }
}

const loadUserTasks = async () => {
  try {
    const userId = currentUser.value?.id
    if (!userId) return

    const tasks = await getTasksByUserId(userId)
    myTasks.value = Array.isArray(tasks) ? tasks : []

    const active = myTasks.value.filter(t => t.status === 'TO_DO' || t.status === 'IN_PROGRESS').length
    activeTasksCount.value = active

    const upcoming = myTasks.value.filter(t => {
      if (t.status === 'DONE') return false
      if (!t.endDate) return false
      const daysLeft = (new Date(t.endDate) - new Date()) / (1000 * 60 * 60 * 24)
      return daysLeft <= 7 && daysLeft >= 0
    })
    upcomingDeadlinesCount.value = upcoming.length

    const completed = myTasks.value.filter(t => t.status === 'DONE').length
    const total = myTasks.value.length
    completedTasksCount.value = completed
    totalTasksCount.value = total

    completionPercentage.value = total > 0 ? Math.round((completed / total) * 100) : 0

    upcomingTasks.value = upcoming.slice(0, 3).map(task => ({
      id: task.taskId,
      title: task.title || 'Untitled Task',
      description: task.description || 'No description',
      timeLeft: calculateTimeLeft(task.endDate),
      urgency: getUrgencyFromDate(task.endDate),
      priority: getPriorityFromTask(task.priority)
    }))

    const now = new Date()
    lastUpdated.value = `${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}`

  } catch (error) {
    console.error('Error loading user tasks:', error)
    activeTasksCount.value = 12
    upcomingDeadlinesCount.value = 4
    completionPercentage.value = 85
    upcomingTasks.value = [
      {
        id: 1,
        title: 'Finalizing UI Assets',
        description: 'Deliver high-res icons for the v2.4 mobile release.',
        timeLeft: '2h left',
        urgency: 'URGENT',
        priority: 'HIGH'
      },
      {
        id: 2,
        title: 'Backend Integration',
        description: 'Connect authentication module with new endpoints.',
        timeLeft: 'Tomorrow',
        urgency: 'NORMAL',
        priority: 'HIGH'
      },
      {
        id: 3,
        title: 'User Testing Session',
        description: 'Schedule and conduct usability testing with 5 users.',
        timeLeft: 'Dec 22',
        urgency: 'NORMAL',
        priority: 'MEDIUM'
      }
    ]
  }
}

const getUrgencyClass = (task) => {
  return task.urgency === 'URGENT' ? 'tag-urgent' : (task.urgency === 'HIGH' ? 'tag-high' : 'tag-normal')
}

const getPriorityClass = (priority) => {
  switch (priority) {
    case 'HIGH': return 'tag-high'
    case 'MEDIUM': return 'tag-medium'
    default: return 'tag-low'
  }
}

const getProjectStatusClass = (status) => {
  switch (status) {
    case 'IN_PROGRESS': return 'badge-progress'
    case 'PLANNED': return 'badge-planning'
    case 'COMPLETED': return 'badge-completed'
    default: return 'badge-progress'
  }
}

const getProjectStatusText = (status) => {
  switch (status) {
    case 'IN_PROGRESS': return 'IN PROGRESS'
    case 'PLANNED': return 'PLANNING'
    case 'COMPLETED': return 'COMPLETED'
    default: return status || 'PLANNING'
  }
}

const getProjectMembers = (project) => {
  return projectMembersMap.value[project.projectId] || [
    { id: 1, name: 'User 1', avatar: 'https://randomuser.me/api/portraits/men/1.jpg' },
    { id: 2, name: 'User 2', avatar: 'https://randomuser.me/api/portraits/women/2.jpg' },
    { id: 3, name: 'User 3', avatar: 'https://randomuser.me/api/portraits/men/3.jpg' }
  ]
}

const getProjectProgress = (project) => {
  const projectTasks = myTasks.value.filter(t => t.projectId === project.projectId)
  if (projectTasks.length === 0) return 0
  const completed = projectTasks.filter(t => t.status === 'DONE').length
  return Math.round((completed / projectTasks.length) * 100)
}

const goToCalendar = () => {
  router.push({ name: 'calendar' })
}

onMounted(() => {
  loadUserProjects()
  loadUserTasks()
})
</script>

<template>
  <div class="member-dashboard">
    <div class="dashboard-grid">
      <div class="left-column">
        <div class="welcome-card">
          <div class="welcome-content">
            <div class="welcome-text">
              <h1 class="welcome-title">Welcome back, {{ userName }}!</h1>
              <p class="welcome-subtitle">You've completed {{ completionPercentage }}% of your weekly targets. Keep it up!</p>
            </div>            <div class="metrics-row">
            <div class="metric-block">
              <span class="metric-number red">{{ activeTasksCount }}</span>
              <span class="metric-label">ACTIVE TASKS</span>
            </div>
            <div class="metric-divider"></div>
            <div class="metric-block">
              <span class="metric-number dark">{{ upcomingDeadlinesCount }}</span>
              <span class="metric-label">UPCOMING DEADLINES</span>
            </div>
          </div>
          </div>
          <div class="progress-ring-container">
            <svg width="100" height="100" viewBox="0 0 120 120">
              <circle cx="60" cy="60" r="54" fill="none" stroke="#F0F0F0" stroke-width="8"/>
              <circle cx="60" cy="60" r="54" fill="none" stroke="#B70F4B" stroke-width="8"
                      :stroke-dasharray="circumference" :stroke-dashoffset="circumferenceOffset"
                      transform="rotate(-90 60 60)" stroke-linecap="round"/>
            </svg>
            <div class="progress-percent">{{ completionPercentage }}%</div>
          </div>
        </div>

        <div class="ai-summary-card">
          <div class="ai-header">
            <div class="ai-title">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2L15 8.5L22 9.5L17 14.5L18 21.5L12 18L6 21.5L7 14.5L2 9.5L9 8.5L12 2Z" fill="#B70F4B" stroke="#B70F4B" stroke-width="1.5" stroke-linejoin="round"/>
              </svg>
              <span>Weekly AI Summary</span>
            </div>
            <span class="last-updated">Last updated: {{ lastUpdated }}</span>
          </div>

          <div class="ai-content">
            <div class="ai-column left">
              <div class="smart-velocity">
                <div class="velocity-label">SMART VELOCITY</div>
                <div class="velocity-value">
                  <span class="big-number">{{ smartVelocity.current }}</span>
                  <span class="slash">/</span>
                  <span class="small-number">{{ smartVelocity.max }}</span>
                </div>
              </div>
              <div class="delay-warning">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 8V12M12 16H12.01M3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12Z" stroke="#E24D4D" stroke-width="1.5" stroke-linecap="round"/>
                </svg>
                <span>{{ delayWarning }}</span>
              </div>
            </div>

            <div class="ai-divider"></div>

            <div class="ai-column right">
              <div class="suggestions-title">PERFORMANCE SUGGESTIONS</div>
              <div class="suggestion-item">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 6V12L16 14M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="#999999" stroke-width="1.5" stroke-linecap="round"/>
                </svg>
                <span>{{ suggestion1 }}</span>
              </div>
              <div class="suggestion-item">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M8 2V5M16 2V5M3 8H21M5 4H19C20.1046 4 21 4.89543 21 6V20C21 21.1046 20.1046 22 19 22H5C3.89543 22 3 21.1046 3 20V6C3 4.89543 3.89543 4 5 4Z" stroke="#999999" stroke-width="1.5" stroke-linecap="round"/>
                </svg>
                <span>{{ suggestion2 }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="right-column">
        <div class="deadlines-card">
          <div class="deadlines-header">
            <h3>Upcoming Deadlines</h3>
            <button class="view-all-btn" @click="goToCalendar">View All →</button>
          </div>

          <div class="deadlines-list">
            <div v-for="task in upcomingTasks" :key="task.id" class="deadline-item">
              <div class="deadline-main">
                <div class="deadline-left">
                  <div class="task-tags">
                    <span class="tag" :class="getUrgencyClass(task)">{{ task.urgency }}</span>
                    <span class="tag" :class="getPriorityClass(task.priority)">{{ task.priority }}</span>
                  </div>
                  <div class="task-title">{{ task.title }}</div>
                  <div class="task-description">{{ task.description }}</div>
                </div>
                <div class="deadline-time">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 6V12L16 14M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="#E24D4D" stroke-width="1.5" stroke-linecap="round"/>
                  </svg>
                  <span>{{ task.timeLeft }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="projects-section">
      <h2 class="section-title">Active Projects</h2>
      <div class="projects-grid">
        <div v-for="project in myProjects" :key="project.projectId" class="project-card">
          <div class="project-header">
            <h4 class="project-name">{{ project.name }}</h4>
            <span class="project-badge" :class="getProjectStatusClass(project.status)">
              {{ getProjectStatusText(project.status) }}
            </span>
          </div>
          <p class="project-description">{{ project.description || 'No description available' }}</p>
          <div class="project-footer">
            <div class="project-members">
              <div class="member-avatars">
                <img v-for="(member, idx) in getProjectMembers(project).slice(0, 3)"
                     :key="member.id"
                     :src="member.avatar"
                     class="member-avatar-small"
                     :style="{ zIndex: 3 - idx }" />
                <div v-if="getProjectMembers(project).length > 3" class="extra-members">
                  +{{ getProjectMembers(project).length - 3 }}
                </div>
              </div>
            </div>
            <div class="project-progress">
              <span class="progress-label">PROGRESS</span>
              <span class="progress-value">{{ getProjectProgress(project) }}%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.member-dashboard {
  max-width: 1400px;
  margin: 0 auto;
  padding: 1.5rem;
  background: #FFFFFF;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

.dashboard-grid {
  display: flex;
  gap: 20px;
  margin-bottom: 32px;
}

.left-column {
  flex: 0 0 70%;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.right-column {
  flex: 0 0 30%;
}

.welcome-card {
  background: #FFFFFF;
  border: 1px solid #FFCDCD;
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.03);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.welcome-content {
  flex: 1;
}

.welcome-title {
  font-size: 28px;
  font-weight: 600;
  color: #111111;
  margin: 0 0 8px 0;
}

.welcome-subtitle {
  font-size: 15px;
  font-weight: 400;
  color: #666666;
  margin: 0 0 24px 0;
}

.metrics-row {
  display: flex;
  align-items: center;
  gap: 32px;
}

.metric-block {
  display: flex;
  flex-direction: column;
}

.metric-number {
  font-size: 32px;
  font-weight: 600;
}

.metric-number.red {
  color: #C1124A;
}

.metric-number.dark {
  color: #111111;
}

.metric-label {
  font-size: 11px;
  font-weight: 500;
  color: #999999;
  letter-spacing: 0.5px;
  margin-top: 4px;
}

.metric-divider {
  width: 1px;
  height: 40px;
  background: #E8E8E8;
}

.progress-ring-container {
  position: relative;
  width: 100px;
  height: 100px;
  flex-shrink: 0;
}

.progress-percent {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 20px;
  font-weight: 600;
  color: #111111;
}

.ai-summary-card {
  background: #FFFFFF;
  border: 1px solid #FFCDCD;
  border-radius: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.03);
  overflow: hidden;
}

.ai-header {
  background: linear-gradient(
      90deg,
      #FDF8F8 0%,
      #ffcece 25%,
      #ff9898 50%,
      #ffcece 75%,
      #FDF8F8 100%
  );
  padding: 16px 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.ai-title {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 18px;
  font-weight: 600;
  color: #111111;
}

.last-updated {
  font-size: 12px;
  font-weight: 400;
  color: #C1124A;
}

.ai-content {
  display: flex;
  padding: 20px;
  gap: 20px;
}

.ai-column.left {
  flex: 0.8;
}

.ai-column.right {
  flex: 1.2;
}

.ai-divider {
  width: 1px;
  background: #ECECEC;
}

.velocity-label {
  font-size: 11px;
  font-weight: 500;
  color: #999999;
  letter-spacing: 0.5px;
  margin-bottom: 8px;
}

.velocity-value {
  display: flex;
  align-items: baseline;
  gap: 4px;
  margin-bottom: 20px;
}

.big-number {
  font-size: 36px;
  font-weight: 600;
  color: #111111;
}

.slash {
  font-size: 20px;
  color: #CCCCCC;
}

.small-number {
  font-size: 20px;
  font-weight: 500;
  color: #999999;
}

.delay-warning {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  background: #FFF5F5;
  padding: 12px;
  border-radius: 12px;
}

.delay-warning span {
  font-size: 13px;
  font-weight: 400;
  color: #D64B4B;
  line-height: 1.4;
}

.suggestions-title {
  font-size: 11px;
  font-weight: 500;
  color: #999999;
  letter-spacing: 0.5px;
  margin-bottom: 16px;
}

.suggestion-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin-bottom: 16px;
}

.suggestion-item span {
  font-size: 14px;
  font-weight: 400;
  color: #444444;
  line-height: 1.4;
}

.deadlines-card {
  background: #FFFFFF;
  border: 1px solid #FFCDCD;
  border-radius: 16px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.03);
  height: 100%;
  display: flex;
  flex-direction: column;
}

.deadlines-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.deadlines-header h3 {
  font-size: 18px;
  font-weight: 600;
  color: #111111;
  margin: 0;
}

.view-all-btn {
  background: none;
  border: none;
  color: #C1124A;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
}

.deadlines-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
  flex: 1;
}

.deadline-item {
  padding: 16px;
  background: #FFFFFF;
  border: 1px solid #EAEAEA;
  border-radius: 12px;
  transition: all 0.2s;
}

.deadline-item:hover {
  border-color: #FFCDCD;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.deadline-main {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.deadline-left {
  flex: 1;
}

.task-tags {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}

.tag {
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 500;
}

.tag-urgent {
  background: #FFEAEA;
  color: #E24D4D;
}

.tag-high {
  background: #FFE4EA;
  color: #D4205B;
}

.tag-normal {
  background: #F0F0F0;
  color: #666666;
}

.tag-medium {
  background: #EEF2FF;
  color: #5A78D1;
}

.tag-low {
  background: #E8F5E9;
  color: #2E9F6B;
}

.task-title {
  font-size: 16px;
  font-weight: 600;
  color: #111111;
  margin-bottom: 4px;
}

.task-description {
  font-size: 13px;
  font-weight: 400;
  color: #666666;
  line-height: 1.4;
}

.deadline-time {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 500;
  color: #E24D4D;
  flex-shrink: 0;
  margin-left: 16px;
}

.projects-section {
  margin-top: 8px;
}

.section-title {
  font-size: 24px;
  font-weight: 600;
  color: #111111;
  margin: 0 0 20px 0;
}

.projects-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
}

.project-card {
  background: #FFFFFF;
  border: 1px solid #FFCDCD;
  border-radius: 12px;
  padding: 16px;
  transition: all 0.2s;
}

.project-card:hover {
  border-color: #E8E8E8;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
}

.project-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.project-name {
  font-size: 14px;
  font-weight: 600;
  color: #111111;
  margin: 0;
}

.project-badge {
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.3px;
}

.badge-progress {
  background: #FFF2F4;
  color: #D7A5AF;
}

.badge-planning {
  background: #FFF3F3;
  color: #D6A1AA;
}

.badge-completed {
  background: #E8F5E9;
  color: #2E9F6B;
}

.project-description {
  font-size: 13px;
  font-weight: 400;
  color: #666666;
  line-height: 1.5;
  margin: 0 0 16px 0;
}

.project-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.member-avatars {
  display: flex;
  align-items: center;
}

.member-avatar-small {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid white;
  margin-left: -8px;
}

.member-avatar-small:first-child {
  margin-left: 0;
}

.extra-members {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: #FCEEEF;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 600;
  color: #B70F4B;
  margin-left: -8px;
  border: 2px solid white;
}

.project-progress {
  display: flex;
  align-items: center;
  gap: 8px;
}

.progress-label {
  font-size: 11px;
  font-weight: 500;
  color: #999999;
  letter-spacing: 0.3px;
}

.progress-value {
  font-size: 14px;
  font-weight: 600;
  color: #B70F4B;
}

@media (max-width: 1200px) {
  .dashboard-grid {
    flex-direction: column;
  }

  .left-column, .right-column {
    flex: 1;
  }

  .projects-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .member-dashboard {
    padding: 1rem;
  }

  .welcome-card {
    flex-direction: column;
    text-align: center;
    gap: 20px;
  }

  .metrics-row {
    justify-content: center;
  }

  .ai-content {
    flex-direction: column;
  }

  .ai-divider {
    display: none;
  }

  .ai-column.left, .ai-column.right {
    flex: 1;
  }

  .projects-grid {
    grid-template-columns: 1fr;
  }

  .deadline-main {
    flex-direction: column;
    gap: 12px;
  }

  .deadline-time {
    margin-left: 0;
  }
}

</style>