<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { getProjectsByMember } from '@/services/project.service.js'
import { getTasksByUserId, getTasksByProjectId } from '@/services/task.service.js'
import { getMemberAiDashboard } from '@/services/ai-dashboard.service.js'
import { UserService } from '@/services/user.service.js'

const router = useRouter()
const { t, locale } = useI18n()
const userService = new UserService()

const currentUser = ref(JSON.parse(localStorage.getItem('user') || '{}'))
const userName = computed(() => getFirstName(currentUser.value?.fullName || currentUser.value?.name || t('home.member.fallbackName')))
const currentTheme = ref(document.documentElement.dataset.theme || localStorage.getItem('theme') || 'light')
const isDarkTheme = computed(() => currentTheme.value === 'dark')

const myTasks = ref([])
const myProjects = ref([])

const activeTasksCount = ref(0)
const upcomingDeadlinesCount = ref(0)
const completedTasksCount = ref(0)
const totalTasksCount = ref(0)
const completionPercentage = ref(0)

const smartVelocity = ref(null)
const aiSummary = ref('')
const delayWarning = ref('')
const performanceSuggestions = ref([])
const lastUpdated = ref(t('home.common.notGeneratedYet'))
const riskPrediction = ref('')

const upcomingTasks = ref([])
const allUsers = ref([])
const suggestedTask = ref(null)
const performanceRecommendation = ref('')
const projectProgressMap = ref({})
const deadlineWindowDays = ref(7)

const circumference = 2 * Math.PI * 54

const suggestedTaskInsight = computed(() => {
  if (performanceRecommendation.value) return performanceRecommendation.value
  return 'Ares recomienda priorizar esta tarea para mejorar tu flujo de trabajo.'
})

const getFirstName = (name) => {
  return String(name || '')
    .trim()
    .split(' ')
    .filter(Boolean)[0] || t('home.member.fallbackName')
}

const normalizeStatus = (status) => String(status || '').toUpperCase()

const getTaskDeadline = (task) => task.endDate || task.deadline || task.dueDate || null

const isTaskOverdue = (task) => {
  if (normalizeStatus(task?.status) === 'DONE') return false
  const deadline = getTaskDeadline(task)
  if (!deadline) return false
  const due = new Date(deadline)
  if (Number.isNaN(due.getTime())) return false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  due.setHours(0, 0, 0, 0)
  return due < today
}

const weeklyCompletedCount = computed(() => myTasks.value.filter(t => normalizeStatus(t.status) === 'DONE').length)
const weeklyPendingCount = computed(() => myTasks.value.filter(t => {
  const status = normalizeStatus(t.status)
  return status === 'TODO' || status === 'TO_DO'
}).length)
const weeklyOverdueCount = computed(() => myTasks.value.filter(isTaskOverdue).length)

const smartVelocityLabel = computed(() => {
  const velocity = Number(smartVelocity.value)
  if (!Number.isFinite(velocity)) return 'Sin datos'
  if (velocity >= 80) return 'Excelente'
  if (velocity >= 60) return 'Bueno'
  return 'Requiere foco'
})

const smartVelocityClass = computed(() => {
  const velocity = Number(smartVelocity.value)
  if (!Number.isFinite(velocity)) return 'neutral'
  if (velocity >= 80) return 'excellent'
  if (velocity >= 60) return 'good'
  return 'attention'
})

const calculateTimeLeft = (endDate) => {
  if (!endDate) return t('home.common.noDate')
  const now = new Date()
  const due = new Date(endDate)
  const diffMs = due - now
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffHours < 0) return t('home.common.overdue')
  if (diffHours < 24) return t('home.common.hoursLeft', { count: diffHours })
  if (diffDays === 1) return t('home.common.tomorrow')
  if (diffDays < 7) return t('home.common.daysLeft', { count: diffDays })
  return due.toLocaleDateString(locale.value === 'es' ? 'es-PE' : 'en-US', { month: 'short', day: 'numeric' })
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

const formatGeneratedAt = (generatedAt) => {
  if (!generatedAt) return t('home.common.justNow')
  const date = new Date(generatedAt)
  if (Number.isNaN(date.getTime())) return generatedAt
  return date.toLocaleString(locale.value === 'es' ? 'es-PE' : 'en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const selectBestTask = () => {
  if (!myTasks.value || myTasks.value.length === 0) {
    suggestedTask.value = null
    return
  }

  const now = new Date()

  // Filtrar tareas no completadas
  const activeTasks = myTasks.value.filter(t => normalizeStatus(t.status) !== 'DONE')

  if (activeTasks.length === 0) {
    suggestedTask.value = null
    return
  }

  // Ordenar según la lógica: vencidas primero, luego deadline cercana, luego HIGH priority
  const sortedTasks = activeTasks.sort((a, b) => {
    const deadlineA = getTaskDeadline(a)
    const deadlineB = getTaskDeadline(b)

    const dateA = deadlineA ? new Date(deadlineA) : null
    const dateB = deadlineB ? new Date(deadlineB) : null

    // Verificar si están vencidas
    const isAOverdue = dateA && dateA < now
    const isBOverdue = dateB && dateB < now

    // Las vencidas tienen más prioridad
    if (isAOverdue && !isBOverdue) return -1
    if (!isAOverdue && isBOverdue) return 1

    // Si ambas están vencidas o ambas no, ordenar por deadline más cercana
    if (dateA && dateB) {
      if (dateA !== dateB) return dateA - dateB
    } else if (dateA && !dateB) {
      return -1
    } else if (!dateA && dateB) {
      return 1
    }

    // Si tienen la misma deadline, prioridad HIGH primero
    const priorityA = a.priority === 'HIGH' ? 0 : 1
    const priorityB = b.priority === 'HIGH' ? 0 : 1
    return priorityA - priorityB
  })

  suggestedTask.value = sortedTasks[0] ? {
    id: sortedTasks[0].taskId,
    projectId: sortedTasks[0].projectId,
    title: sortedTasks[0].title || t('home.common.untitledTask'),
    priority: getPriorityFromTask(sortedTasks[0].priority),
    deadline: calculateTimeLeft(getTaskDeadline(sortedTasks[0]))
  } : null
}

const loadAiDashboard = async () => {
  try {
    const dashboard = await getMemberAiDashboard()
    const weeklySummary = dashboard?.weeklySummary || {}
    const velocity = Number(weeklySummary.smartVelocity)

    if (Number.isFinite(velocity)) {
      smartVelocity.value = velocity
    }

    aiSummary.value = weeklySummary.summary || ''
    delayWarning.value = weeklySummary.riskPrediction || ''
    riskPrediction.value = weeklySummary.riskPrediction || ''
    performanceSuggestions.value = Array.isArray(dashboard?.performanceSuggestions) && dashboard.performanceSuggestions.length > 0
      ? dashboard.performanceSuggestions
      : []
    performanceRecommendation.value = Array.isArray(dashboard?.performanceSuggestions) && dashboard.performanceSuggestions.length > 0
      ? dashboard.performanceSuggestions[0]
      : ''
    lastUpdated.value = formatGeneratedAt(weeklySummary.generatedAt)
  } catch (error) {
    console.error('Error loading AI member dashboard:', error.response?.data || error)
    smartVelocity.value = null
    aiSummary.value = ''
    delayWarning.value = ''
    riskPrediction.value = ''
    performanceSuggestions.value = []
    performanceRecommendation.value = ''
    lastUpdated.value = t('home.common.notGeneratedYet')
  }
}

const loadUsers = async () => {
  try {
    const response = await userService.getAllUsers()
    allUsers.value = Array.isArray(response) ? response : response?.data || []
  } catch (error) {
    console.error('Error loading users:', error.response?.data || error)
    allUsers.value = []
  }
}

const loadCurrentUser = async () => {
  try {
    const response = await userService.getMe()
    const user = response?.data || {}
    currentUser.value = {
      ...currentUser.value,
      ...user,
      name: user.fullName || `${user.name || ''} ${user.lastName || ''}`.trim() || currentUser.value?.name
    }
    localStorage.setItem('user', JSON.stringify(currentUser.value))
  } catch (error) {
    console.error('Error loading current user:', error.response?.data || error)
  }
}

const loadUserProjects = async () => {
  try {
    const projects = await getProjectsByMember()
    myProjects.value = Array.isArray(projects) ? projects : []
    await loadProjectsProgress(myProjects.value)
  } catch (error) {
    console.error('Error loading user projects:', error)
    myProjects.value = []
    projectProgressMap.value = {}
  }
}

const loadProjectsProgress = async (projects) => {
  try {
    const entries = await Promise.all((projects || []).map(async (project) => {
      const projectId = Number(project?.projectId)
      if (!projectId) return [project?.projectId, 0]
      const tasks = await getTasksByProjectId(projectId)
      const list = Array.isArray(tasks) ? tasks : []
      const total = list.length
      const completed = list.filter(t => normalizeStatus(t.status) === 'DONE').length
      const percentage = total > 0 ? Math.round((completed / total) * 100) : 0
      return [projectId, percentage]
    }))
    projectProgressMap.value = Object.fromEntries(entries)
  } catch (error) {
    console.error('Error loading project progress:', error)
    projectProgressMap.value = {}
  }
}

const loadUserTasks = async () => {
  try {
    const userId = currentUser.value?.id
    if (!userId) return

    const tasks = await getTasksByUserId(userId)
    myTasks.value = Array.isArray(tasks) ? tasks : []

    const active = myTasks.value.filter(t => ['TODO', 'TO_DO', 'IN_PROGRESS'].includes(normalizeStatus(t.status))).length
    activeTasksCount.value = active

    const upcoming = myTasks.value.filter(t => {
      if (normalizeStatus(t.status) === 'DONE') return false
      const deadline = getTaskDeadline(t)
      if (!deadline) return false
      const now = new Date()
      const due = new Date(deadline)
      if (Number.isNaN(due.getTime())) return false
      now.setHours(0, 0, 0, 0)
      due.setHours(0, 0, 0, 0)
      const daysLeft = (due - now) / (1000 * 60 * 60 * 24)
      return daysLeft <= deadlineWindowDays.value && daysLeft >= 0
    })

    upcoming.sort((a, b) => {
      const dateA = new Date(getTaskDeadline(a))
      const dateB = new Date(getTaskDeadline(b))
      const timeDiff = dateA - dateB
      if (timeDiff !== 0) return timeDiff
      const priorityRank = (task) => {
        const p = String(task?.priority || '').toUpperCase()
        if (p === 'HIGH') return 0
        if (p === 'MEDIUM') return 1
        return 2
      }
      return priorityRank(a) - priorityRank(b)
    })

    upcomingDeadlinesCount.value = upcoming.length

    const completed = myTasks.value.filter(t => t.status === 'DONE').length
    const total = myTasks.value.length
    completedTasksCount.value = completed
    totalTasksCount.value = total

    completionPercentage.value = total > 0 ? Math.round((completed / total) * 100) : 0

    upcomingTasks.value = upcoming.slice(0, 3).map(task => ({
      id: task.taskId,
      title: task.title || t('home.common.untitledTask'),
      description: task.description || t('home.common.noDescription'),
      timeLeft: calculateTimeLeft(getTaskDeadline(task)),
      urgency: getUrgencyFromDate(getTaskDeadline(task)),
      priority: getPriorityFromTask(task.priority)
    }))

    // Seleccionar la mejor tarea
    selectBestTask()

  } catch (error) {
    console.error('Error loading user tasks:', error)
    myTasks.value = []
    activeTasksCount.value = 0
    upcomingDeadlinesCount.value = 0
    completedTasksCount.value = 0
    totalTasksCount.value = 0
    completionPercentage.value = 0
    upcomingTasks.value = []
    suggestedTask.value = null
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
    case 'IN_PROGRESS': return t('home.status.inProgress')
    case 'PLANNED': return t('home.status.planning')
    case 'COMPLETED': return t('home.status.completed')
    default: return status || t('home.status.planning')
  }
}

const getUrgencyText = (urgency) => {
  switch (urgency) {
    case 'URGENT': return t('home.priority.urgent')
    case 'HIGH': return t('home.priority.high')
    default: return t('home.priority.normal')
  }
}

const getPriorityText = (priority) => {
  switch (priority) {
    case 'HIGH': return t('home.priority.high')
    case 'MEDIUM': return t('home.priority.medium')
    default: return t('home.priority.low')
  }
}

const getProjectMembers = (project) => {
  const projectId = Number(project?.projectId)
  if (!projectId) return []

  return allUsers.value
    .filter(user => {
      const projectIds = Array.isArray(user.projectIds) ? user.projectIds.map(Number) : []
      return projectIds.includes(projectId)
    })
    .map(user => ({
      id: user.id,
      name: `${user.name || ''} ${user.lastName || ''}`.trim() || user.email || t('home.member.fallbackName'),
      avatar: user.imageUrl || ''
    }))
}

const getMemberInitials = (member) => {
  return (member.name || t('home.member.fallbackName'))
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part.charAt(0).toUpperCase())
    .join('')
}

const getProjectProgress = (project) => {
  const projectId = Number(project?.projectId)
  return Number(projectProgressMap.value[projectId] || 0)
}

const goToCalendar = () => {
  router.push({ name: 'calendar' })
}

const goToTasks = () => {
  router.push({ path: '/tasks' })
}

const goToProjects = () => {
  router.push({ path: '/projects' })
}

const goToTask = (task) => {
  const projectId = task?.projectId
  const taskId = task?.id
  if (!projectId) {
    router.push({ path: '/projects' })
    return
  }
  router.push({
    name: 'projectTodo',
    params: { id: String(projectId) },
    query: taskId ? { taskId: String(taskId) } : {}
  })
}

const getRiskLevel = () => {
  if (!riskPrediction.value) return 'BAJO'
  const text = riskPrediction.value.toLowerCase()
  if (text.includes('alto') || text.includes('high') || text.includes('crítico') || text.includes('critical')) {
    return 'ALTO'
  }
  if (text.includes('medio') || text.includes('medium')) {
    return 'MEDIO'
  }
  return 'BAJO'
}

const getRiskLevelText = () => {
  const level = getRiskLevel()
  switch (level) {
    case 'ALTO': return 'Riesgo alto'
    case 'MEDIO': return 'Riesgo medio'
    default: return 'Bajo riesgo'
  }
}

const getRiskIconColor = () => {
  const level = getRiskLevel()
  switch (level) {
    case 'ALTO': return '#E24D4D'
    case 'MEDIO': return '#FBBF24'
    default: return '#34D399'
  }
}

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
  loadCurrentUser()
  loadUserProjects()
  loadUserTasks()
  loadAiDashboard()
  loadUsers()
})

onBeforeUnmount(() => {
  window.removeEventListener('theme-changed', syncTheme)
  window.removeEventListener('storage', syncTheme)
})
</script>

<template>
  <div class="member-dashboard" :class="{ 'dark-dashboard': isDarkTheme }">
    <div class="dashboard-grid">
      <div class="left-column">
        <div class="welcome-card">
          <div class="welcome-content">
            <div class="welcome-heading">
              <h1 class="welcome-title">¡Bienvenido de nuevo, <span>{{ userName }}</span>!</h1>
              <p class="welcome-subtitle">Ares esta aqui para ayudarte a ser mas productivo hoy.</p>
            </div>

            <div class="welcome-metrics">
              <div class="welcome-metric">
                <div class="welcome-metric-icon">
                  <i class="pi pi-clipboard"></i>
                </div>
                <div>
                  <span class="metric-number">{{ activeTasksCount }}</span>
                  <span class="metric-label">{{ $t('home.member.activeTasks') }}</span>
                  <span class="metric-helper">En progreso o por iniciar</span>
                </div>
              </div>

              <div class="metric-divider"></div>

              <div class="welcome-metric">
                <div class="welcome-metric-icon muted">
                  <i class="pi pi-calendar"></i>
                </div>
                <div>
                  <span class="metric-number">{{ upcomingDeadlinesCount }}</span>
                  <span class="metric-label">{{ $t('home.member.upcomingDeadlines') }}</span>
                  <span class="metric-helper">En los proximos 3 dias</span>
                </div>
              </div>
            </div>
          </div>

          <div class="smart-velocity-panel">
            <div class="progress-ring-container">
              <svg width="118" height="118" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r="50" fill="none" stroke="rgba(255, 255, 255, 0.13)" stroke-width="9"/>
                <circle cx="60" cy="60" r="50" fill="none" stroke="#E62E65" stroke-width="9"
                      :stroke-dasharray="2 * Math.PI * 50"
                      :stroke-dashoffset="(2 * Math.PI * 50) - ((smartVelocity || 0) / 100) * (2 * Math.PI * 50)"
                      transform="rotate(-90 60 60)" stroke-linecap="round"/>
              </svg>
              <div class="progress-percent">{{ smartVelocity ?? 'N/A' }}<span v-if="smartVelocity !== null">%</span></div>
            </div>

            <div class="smart-velocity-copy">
              <div class="velocity-label-row">
                <span>SMART VELOCITY</span>
                <i class="pi pi-info-circle"></i>
              </div>
              <span class="velocity-badge" :class="smartVelocityClass">{{ smartVelocityLabel }}</span>
              <span class="velocity-trend">+12% vs. semana pasada</span>
            </div>
          </div>
        </div>

       <div class="cards-row">
         <div class="priority-card">
           <div class="card-header">
             <div class="card-icon priority-icon">
               <i class="pi pi-star"></i>
             </div>
             <h3 class="card-title">{{ $t('home.member.suggestedPriority', 'Prioridad sugerida por Ares') }}</h3>
           </div>

           <div class="card-content" v-if="suggestedTask">
             <div class="priority-task-panel">
               <div class="priority-task-icon"><i class="pi pi-check-square"></i></div>
               <div>
                 <div class="task-name">{{ suggestedTask.title }}</div>
                 <div class="task-meta">
                   <span class="priority-badge" :class="{ 'priority-high': suggestedTask.priority === 'HIGH' }">{{ suggestedTask.priority || 'NORMAL' }}</span>
                   <span class="deadline-info">{{ suggestedTask.deadline }}</span>
                 </div>
               </div>
             </div>
             <p class="task-description">Completar esta tarea reducira el riesgo del proyecto.</p>
             <p class="task-insight">{{ suggestedTaskInsight }}</p>
             <button class="go-to-task-btn" @click="goToTask(suggestedTask)">
               {{ $t('home.common.goToTask', 'Ir a la tarea') }}
               <i class="pi pi-arrow-right"></i>
             </button>
           </div>

           <div v-else class="empty-task-state">{{ $t('home.common.noTasksAvailable', 'No hay tareas disponibles') }}</div>
         </div>

         <div class="risk-card">
           <div class="card-header">
             <div class="card-icon risk-icon">
               <i class="pi pi-shield"></i>
             </div>
             <h3 class="card-title">{{ $t('home.member.riskPrediction', 'Prediccion de riesgo') }}</h3>
           </div>

           <div class="card-content" v-if="riskPrediction">
             <div class="risk-main">
               <div class="risk-ring" :class="'risk-' + getRiskLevel().toLowerCase()">
                 <i class="pi pi-shield"></i>
               </div>
               <div class="risk-copy">
                 <div class="risk-text">{{ getRiskLevelText() }}</div>
                 <p class="risk-description">{{ riskPrediction }}</p>
               </div>
             </div>
           </div>

           <div v-else class="empty-risk-state">{{ $t('home.common.noDataAvailable', 'Sin datos disponibles') }}</div>
         </div>
       </div>

        <div class="ai-summary-card">
          <div class="ai-header">
            <div class="ai-title">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2L15 8.5L22 9.5L17 14.5L18 21.5L12 18L6 21.5L7 14.5L2 9.5L9 8.5L12 2Z" fill="#B70F4B" stroke="#B70F4B" stroke-width="1.5" stroke-linejoin="round"/>
              </svg>
              <span>{{ $t('home.member.weeklyAiSummary') }}</span>
            </div>
            <span class="last-updated">{{ $t('home.common.lastUpdated', { value: lastUpdated }) }}</span>
          </div>

          <div class="ai-content">
            <div class="ai-column left">
              <div class="smart-velocity">
                <div class="velocity-label">{{ $t('home.member.smartVelocity') }}</div>
                <div class="velocity-value">
                  <span class="big-number">{{ smartVelocity ?? 'N/A' }}</span>
                </div>
              </div>
              <p class="ai-summary-text">{{ aiSummary || $t('home.member.noAiSummary') }}</p>
              <div v-if="delayWarning" class="delay-warning">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 8V12M12 16H12.01M3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12Z" stroke="#E24D4D" stroke-width="1.5" stroke-linecap="round"/>
                </svg>
                <span>{{ delayWarning }}</span>
              </div>
            </div>

            <div class="ai-divider"></div>

            <div class="ai-column right">
              <div class="suggestions-title">{{ $t('home.member.performanceSuggestions') }}</div>
              <p v-if="performanceSuggestions.length === 0" class="empty-state">{{ $t('home.member.noPerformanceSuggestions') }}</p>
              <div v-for="(suggestion, index) in performanceSuggestions" :key="index" class="suggestion-item">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path v-if="index % 2 === 0" d="M12 6V12L16 14M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="#999999" stroke-width="1.5" stroke-linecap="round"/>
                  <path v-else d="M8 2V5M16 2V5M3 8H21M5 4H19C20.1046 4 21 4.89543 21 6V20C21 21.1046 20.1046 22 19 22H5C3.89543 22 3 21.1046 3 20V6C3 4.89543 3.89543 4 5 4Z" stroke="#999999" stroke-width="1.5" stroke-linecap="round"/>
                </svg>
                <span>{{ suggestion }}</span>
              </div>
            </div>
          </div>
         </div>

         <div class="weekly-progress-card">
           <div class="weekly-progress-header">
             <i class="pi pi-chart-bar"></i>
             <h3>Tu progreso esta semana</h3>
           </div>

           <div class="weekly-progress-metrics">
             <div class="weekly-metric">
               <div class="weekly-metric-icon done"><i class="pi pi-check"></i></div>
               <div class="weekly-metric-copy">
                 <span class="weekly-metric-value">{{ weeklyCompletedCount }}</span>
                 <span class="weekly-metric-label">Completadas</span>
                 <span class="weekly-metric-helper done">Buen avance esta semana</span>
               </div>
             </div>

             <div class="weekly-metric-divider"></div>

             <div class="weekly-metric">
               <div class="weekly-metric-icon pending"><i class="pi pi-clock"></i></div>
               <div class="weekly-metric-copy">
                 <span class="weekly-metric-value">{{ weeklyPendingCount }}</span>
                 <span class="weekly-metric-label">Pendientes</span>
                 <span class="weekly-metric-helper">Aun por resolver</span>
               </div>
             </div>

             <div class="weekly-metric-divider"></div>

             <div class="weekly-metric">
               <div class="weekly-metric-icon overdue"><i class="pi pi-exclamation-circle"></i></div>
               <div class="weekly-metric-copy">
                 <span class="weekly-metric-value">{{ weeklyOverdueCount }}</span>
                 <span class="weekly-metric-label">Vencidas</span>
                 <span class="weekly-metric-helper overdue">Requieren atencion hoy</span>
               </div>
             </div>
           </div>
         </div>

       </div>

       <div class="right-column">
         <div class="deadlines-card side-card">
          <div class="deadlines-header">
            <h3>{{ $t('home.member.upcomingDeadlinesTitle') }}</h3>
            <button class="view-all-btn" @click="goToTasks">{{ $t('home.common.viewAll') }}</button>
          </div>

          <div class="deadlines-list">
            <p v-if="upcomingTasks.length === 0" class="empty-state">{{ $t('home.member.noUpcomingDeadlines') }}</p>
            <div v-for="task in upcomingTasks" :key="task.id" class="deadline-item">
              <div class="deadline-main">
                <div class="deadline-left">
                  <div class="task-tags">
                    <span class="tag" :class="getUrgencyClass(task)">{{ getUrgencyText(task.urgency) }}</span>
                    <span class="tag" :class="getPriorityClass(task.priority)">{{ getPriorityText(task.priority) }}</span>
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

          <button class="calendar-link-btn" @click="goToCalendar">
            <i class="pi pi-calendar"></i>
            Ver calendario
          </button>
        </div>

        <div class="projects-side-card side-card">
          <div class="deadlines-header">
            <h3>{{ $t('home.member.activeProjects') }}</h3>
            <button class="view-all-btn" @click="goToProjects">Ver todos</button>
          </div>

          <div class="projects-side-list">
            <p v-if="myProjects.length === 0" class="empty-state">{{ $t('home.member.noActiveProjects') }}</p>

            <div v-for="project in myProjects.slice(0, 2)" :key="project.projectId" class="project-side-item">
              <div class="project-side-top">
                <div class="project-side-icon"><i class="pi pi-briefcase"></i></div>
                <div class="project-side-main">
                  <h4>{{ project.name }}</h4>
                  <span class="project-badge" :class="getProjectStatusClass(project.status)">{{ getProjectStatusText(project.status) }}</span>
                </div>
              </div>
              <div class="project-side-progress-row">
                <span>PROGRESO</span>
                <strong>{{ getProjectProgress(project) }}%</strong>
              </div>
              <div class="project-side-progress-track">
                <div class="project-side-progress-fill" :style="{ width: `${getProjectProgress(project)}%` }"></div>
              </div>
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
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.welcome-card {
  background:
    radial-gradient(circle at 82% 35%, rgba(230, 46, 101, 0.1), transparent 28%),
    linear-gradient(135deg, #FFFFFF 0%, #FFF7F9 58%, #F8FAFC 100%);
  border: 1px solid #FFCDCD;
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 18px 44px rgba(15, 23, 42, 0.18);
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 28px;
  overflow: hidden;
}

.welcome-content {
  flex: 1;
}

.welcome-heading {
  margin-bottom: 26px;
}

.welcome-title {
  font-size: 30px;
  font-weight: 800;
  color: #111827;
  margin: 0 0 8px 0;
  line-height: 1.15;
}

.welcome-title span {
  color: #F43F75;
}

.welcome-subtitle {
  font-size: 15px;
  font-weight: 500;
  color: #6B7280;
  margin: 0;
}

.welcome-metrics {
  display: flex;
  align-items: center;
  gap: 28px;
  flex-wrap: wrap;
}

.welcome-metric {
  display: flex;
  align-items: center;
  gap: 16px;
  min-width: 205px;
}

.welcome-metric-icon {
  width: 68px;
  height: 68px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(230, 46, 101, 0.14);
  color: #F43F75;
  box-shadow: inset 0 0 0 1px rgba(244, 63, 117, 0.12);
}

.welcome-metric-icon.muted {
  background: rgba(148, 163, 184, 0.12);
  color: #64748B;
}

.welcome-metric-icon i {
  font-size: 29px;
}

.metric-number {
  display: block;
  font-size: 34px;
  line-height: 1;
  font-weight: 800;
  color: #F43F75;
  margin-bottom: 6px;
}

.metric-label {
  display: block;
  font-size: 11px;
  font-weight: 800;
  color: #4B5563;
  letter-spacing: 0.5px;
  text-transform: uppercase;
}

.metric-helper {
  display: block;
  color: #8FE0A9;
  font-size: 13px;
  font-weight: 600;
  margin-top: 8px;
}

.metric-divider {
  width: 1px;
  height: 72px;
  background: rgba(148, 163, 184, 0.18);
}

.smart-velocity-panel {
  display: flex;
  align-items: center;
  gap: 22px;
  flex-shrink: 0;
}

.progress-ring-container {
  position: relative;
  width: 118px;
  height: 118px;
  flex-shrink: 0;
}

.progress-percent {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 27px;
  font-weight: 800;
  color: #111827;
}

.progress-percent span {
  font-size: 20px;
}

.smart-velocity-copy {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 10px;
  min-width: 170px;
}

.velocity-label-row {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #6B7280;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.5px;
}

.velocity-label-row i {
  font-size: 14px;
  color: #94A3B8;
}

.velocity-badge {
  border-radius: 999px;
  padding: 6px 12px;
  font-size: 12px;
  font-weight: 800;
  text-transform: uppercase;
}

.velocity-badge.excellent {
  background: rgba(16, 185, 129, 0.18);
  color: #34D399;
}

.velocity-badge.good {
  background: rgba(59, 130, 246, 0.18);
  color: #93C5FD;
}

.velocity-badge.attention {
  background: rgba(245, 158, 11, 0.18);
  color: #FBBF24;
}

.velocity-badge.neutral {
  background: rgba(148, 163, 184, 0.16);
  color: #64748B;
}

.velocity-trend {
  color: #34D399;
  font-size: 13px;
  font-weight: 700;
}

.ai-summary-card {
  background: #FFFFFF;
  border: 1px solid #FFCDCD;
  border-radius: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.03);
  overflow: hidden;
}

.weekly-progress-card {
  background:
    radial-gradient(circle at 12% 25%, rgba(59, 130, 246, 0.08), transparent 22%),
    radial-gradient(circle at 68% 18%, rgba(244, 63, 117, 0.08), transparent 25%),
    linear-gradient(135deg, #FFFFFF 0%, #FFF7F9 58%, #F8FAFC 100%);
  border: 1px solid #FFCDCD;
  border-radius: 16px;
  padding: 20px;
  box-shadow: 0 18px 44px rgba(15, 23, 42, 0.18);
}

.weekly-progress-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 18px;
}

.weekly-progress-header i {
  color: #F43F75;
  font-size: 22px;
}

.weekly-progress-header h3 {
  margin: 0;
  color: #111827;
  font-size: 30px;
  font-weight: 800;
  line-height: 1.2;
}

.weekly-progress-metrics {
  display: grid;
  grid-template-columns: 1fr auto 1fr auto 1fr;
  align-items: center;
  gap: 14px;
}

.weekly-metric {
  display: flex;
  align-items: center;
  gap: 14px;
}

.weekly-metric-icon {
  width: 58px;
  height: 58px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
}

.weekly-metric-icon.done {
  color: #4ADE80;
  background: rgba(34, 197, 94, 0.16);
}

.weekly-metric-icon.pending {
  color: #F59E0B;
  background: rgba(245, 158, 11, 0.16);
}

.weekly-metric-icon.overdue {
  color: #F43F75;
  background: rgba(244, 63, 117, 0.16);
}

.weekly-metric-copy {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.weekly-metric-value {
  color: #111827;
  font-size: 42px;
  font-weight: 800;
  line-height: 1;
}

.weekly-metric-label {
  color: #4B5563;
  font-size: 16px;
  font-weight: 600;
}

.weekly-metric-helper {
  color: #6B7280;
  font-size: 14px;
  font-weight: 500;
}

.weekly-metric-helper.done {
  color: #4ADE80;
}

.weekly-metric-helper.overdue {
  color: #34D399;
}

.weekly-metric-divider {
  width: 1px;
  height: 72px;
  background: rgba(148, 163, 184, 0.2);
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
  margin-bottom: 12px;
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

.ai-summary-text {
  font-size: 14px;
  font-weight: 400;
  color: #444444;
  line-height: 1.45;
  margin: 0 0 16px 0;
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

.empty-state {
  font-size: 14px;
  font-weight: 400;
  color: #777777;
  line-height: 1.4;
  margin: 0;
}

.deadlines-card {
  background:
    radial-gradient(circle at 12% 25%, rgba(59, 130, 246, 0.08), transparent 22%),
    radial-gradient(circle at 68% 18%, rgba(244, 63, 117, 0.08), transparent 25%),
    linear-gradient(135deg, #FFFFFF 0%, #FFF7F9 58%, #F8FAFC 100%);
  border: 1px solid #FFCDCD;
  border-radius: 16px;
  padding: 20px;
  box-shadow: 0 18px 44px rgba(15, 23, 42, 0.18);
  display: flex;
  flex-direction: column;
}

.side-card {
  color: #111827;
}

.deadlines-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.deadlines-header h3 {
  font-size: 18px;
  font-weight: 700;
  color: #111827;
  margin: 0;
}

.view-all-btn {
  background: none;
  border: none;
  color: #F43F75;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
}

.deadlines-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
  flex: 1;
}

.deadline-item {
  padding: 12px 4px;
  background: transparent;
  border: none;
  border-radius: 12px;
  transition: all 0.2s;
}

.deadline-item:hover {
  background: #FFF5F7;
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
  font-size: 27px;
  font-weight: 800;
  color: #111827;
  margin-bottom: 4px;
}

.task-description {
  font-size: 21px;
  font-weight: 600;
  color: #5A78D1;
  line-height: 1.4;
}

.calendar-link-btn {
  margin-top: 10px;
  width: 100%;
  background: none;
  border: none;
  border-top: 1px solid rgba(148, 163, 184, 0.2);
  color: #F43F75;
  font-size: 23px;
  font-weight: 700;
  padding: 16px 6px 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  cursor: pointer;
}

.projects-side-card {
  background:
    radial-gradient(circle at 12% 25%, rgba(59, 130, 246, 0.08), transparent 22%),
    radial-gradient(circle at 68% 18%, rgba(244, 63, 117, 0.08), transparent 25%),
    linear-gradient(135deg, #FFFFFF 0%, #FFF7F9 58%, #F8FAFC 100%);
  border: 1px solid #FFCDCD;
  border-radius: 16px;
  padding: 20px;
  box-shadow: 0 18px 44px rgba(15, 23, 42, 0.18);
}

.projects-side-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.project-side-item {
  border: 1px solid #F3D3D9;
  border-radius: 14px;
  padding: 12px;
  background: #FFFFFF;
}

.project-side-top {
  display: flex;
  align-items: center;
  gap: 10px;
}

.project-side-icon {
  width: 42px;
  height: 42px;
  border-radius: 10px;
  background: rgba(96, 165, 250, 0.2);
  color: #60A5FA;
  display: flex;
  align-items: center;
  justify-content: center;
}

.project-side-main {
  flex: 1;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
}

.project-side-main h4 {
  margin: 0;
  color: #111827;
  font-size: 23px;
  font-weight: 700;
}

.project-side-progress-row {
  margin-top: 10px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: #6B7280;
  font-size: 12px;
  font-weight: 700;
}

.project-side-progress-row strong {
  color: #F43F75;
  font-size: 31px;
}

.project-side-progress-track {
  margin-top: 8px;
  width: 100%;
  height: 8px;
  border-radius: 999px;
  background: rgba(148, 163, 184, 0.2);
  overflow: hidden;
}

.project-side-progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #D81B60, #F43F75);
  border-radius: inherit;
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

.member-initials {
  background: #FCEEEF;
  color: #B70F4B;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: 700;
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

.projects-empty {
  grid-column: 1 / -1;
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

  .weekly-progress-header h3 {
    font-size: 22px;
  }

  .weekly-progress-metrics {
    grid-template-columns: 1fr;
    gap: 12px;
  }

  .weekly-metric-divider {
    display: none;
  }

  .weekly-metric-label {
    font-size: 15px;
  }

  .weekly-metric-helper {
    font-size: 14px;
  }
}

.member-dashboard.dark-dashboard {
  background: #080b12;
  color: #eef2f8;
}

.dark-dashboard .welcome-card,
.dark-dashboard .ai-summary-card,
.dark-dashboard .deadlines-card,
.dark-dashboard .project-card,
.dark-dashboard .projects-side-card,
.dark-dashboard .project-side-item {
  background: linear-gradient(145deg, rgba(18, 23, 33, 0.98), rgba(10, 14, 22, 0.98));
  border-color: rgba(244, 63, 115, 0.28);
  box-shadow: 0 18px 45px rgba(0, 0, 0, 0.24);
}

.dark-dashboard .welcome-title,
.dark-dashboard .section-title,
.dark-dashboard .ai-title,
.dark-dashboard .deadlines-header h3,
.dark-dashboard .project-name,
.dark-dashboard .task-title,
.dark-dashboard .big-number,
.dark-dashboard .progress-percent,
.dark-dashboard .metric-number.dark {
  color: #f8fafc;
}

.dark-dashboard .welcome-subtitle,
.dark-dashboard .metric-label,
.dark-dashboard .metric-helper,
.dark-dashboard .velocity-label-row,
.dark-dashboard .velocity-label,
.dark-dashboard .suggestions-title,
.dark-dashboard .task-description,
.dark-dashboard .project-description,
.dark-dashboard .progress-label,
.dark-dashboard .small-number,
.dark-dashboard .ai-summary-text,
.dark-dashboard .empty-state,
.dark-dashboard .suggestion-item span {
  color: #a7b0bf;
}

.dark-dashboard .metric-number.red,
.dark-dashboard .last-updated,
.dark-dashboard .view-all-btn,
.dark-dashboard .progress-value,
.dark-dashboard .calendar-link-btn {
  color: #ff4f82;
}

.dark-dashboard .metric-divider,
.dark-dashboard .ai-divider {
  background: #252b38;
}

.dark-dashboard .progress-ring-container circle:first-child {
  stroke: #303746;
}

.dark-dashboard .progress-ring-container circle:nth-child(2) {
  stroke: #ff3f7a;
}

.dark-dashboard .ai-header {
  background: linear-gradient(
      90deg,
      rgba(16, 20, 29, 0.98) 0%,
      rgba(65, 22, 39, 0.96) 50%,
      rgba(16, 20, 29, 0.98) 100%
  );
  border-bottom: 1px solid rgba(244, 63, 115, 0.18);
}

.dark-dashboard .delay-warning {
  background: rgba(225, 29, 72, 0.12);
  border: 1px solid rgba(244, 63, 115, 0.18);
}

.dark-dashboard .delay-warning span {
  color: #ff8cae;
}

.dark-dashboard .deadline-item {
  background: rgba(15, 20, 30, 0.92);
  border-color: #242a36;
}

.dark-dashboard .deadline-item:hover,
.dark-dashboard .project-card:hover {
  border-color: rgba(244, 63, 115, 0.36);
  box-shadow: 0 18px 38px rgba(0, 0, 0, 0.28);
}

.dark-dashboard .tag-urgent,
.dark-dashboard .tag-high {
  background: rgba(225, 29, 72, 0.16);
  color: #ff6f99;
}

.dark-dashboard .tag-normal {
  background: #1b2230;
  color: #a7b0bf;
}

.dark-dashboard .tag-medium {
  background: rgba(59, 130, 246, 0.16);
  color: #79a9ff;
}

.dark-dashboard .tag-low,
.dark-dashboard .badge-completed {
  background: rgba(16, 185, 129, 0.14);
  color: #6ee7b7;
}

.dark-dashboard .badge-progress,
.dark-dashboard .badge-planning {
  background: rgba(225, 29, 72, 0.14);
  color: #ff8cae;
}

.dark-dashboard .member-avatar-small,
.dark-dashboard .extra-members {
  border-color: #10141d;
}

.dark-dashboard .extra-members {
  background: rgba(244, 63, 115, 0.14);
  color: #ff8cae;
}

.dark-dashboard .member-initials {
  background: rgba(244, 63, 115, 0.14);
  color: #ff8cae;
}

.dark-dashboard .weekly-progress-card {
  background:
    radial-gradient(circle at 12% 25%, rgba(59, 130, 246, 0.08), transparent 22%),
    radial-gradient(circle at 68% 18%, rgba(244, 63, 117, 0.08), transparent 25%),
    linear-gradient(135deg, #0B101B 0%, #090D16 58%, #111827 100%);
  border-color: rgba(244, 63, 115, 0.28);
  box-shadow: 0 18px 45px rgba(0, 0, 0, 0.24);
}

.dark-dashboard .weekly-progress-header h3,
.dark-dashboard .weekly-metric-value {
  color: #F8FAFC;
}

.dark-dashboard .weekly-metric-label {
  color: #E2E8F0;
}

.dark-dashboard .weekly-metric-helper {
  color: #94A3B8;
}

.dark-dashboard .project-side-main h4 {
  color: #F8FAFC;
}

.dark-dashboard .project-side-progress-row {
  color: #94A3B8;
}

.dark-dashboard .velocity-badge.neutral {
  color: #CBD5E1;
}

/* Nuevas cards de Prioridad y Riesgo */
.cards-row {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 16px;
  margin: 2px 0 16px;
}

.priority-card,
.risk-card {
  background: radial-gradient(circle at 75% 25%, rgba(255, 64, 129, 0.08), transparent 45%), #FFFFFF;
  border: 1px solid #FFCDCD;
  border-radius: 16px;
  padding: 20px;
  box-shadow: 0 18px 44px rgba(15, 23, 42, 0.18);
  transition: all 0.2s;
}

.priority-card:hover,
.risk-card:hover {
  border-color: rgba(244, 63, 117, 0.35);
  box-shadow: 0 12px 30px rgba(15, 23, 42, 0.08);
}

.card-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.card-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.priority-icon {
  background: rgba(244, 63, 117, 0.14);
  color: #FF4F82;
}

.risk-icon {
  background: rgba(244, 63, 117, 0.14);
  color: #FF4F82;
}

.card-title {
  font-size: 16px;
  font-weight: 700;
  color: #111827;
  margin: 0;
}

.card-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.priority-task-panel {
  background: #FFF7F9;
  border: 1px solid #F3D3D9;
  border-radius: 14px;
  padding: 14px;
  display: flex;
  align-items: center;
  gap: 12px;
}

.priority-task-icon {
  width: 56px;
  height: 56px;
  border-radius: 14px;
  background: rgba(244, 63, 117, 0.12);
  color: #FF4F82;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
}

.task-name {
  font-size: 34px;
  font-weight: 800;
  color: #111827;
  line-height: 1.15;
}

.task-meta {
  display: flex;
  align-items: center;
  gap: 12px;
}

.priority-badge {
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 600;
  background: rgba(244, 63, 117, 0.16);
  color: #FF6F99;
  width: fit-content;
}

.priority-badge.priority-high {
  background: rgba(244, 63, 117, 0.24);
  color: #FF8CAE;
}

.deadline-info {
  font-size: 13px;
  font-weight: 700;
  color: #FF6F99;
}

.task-description {
  font-size: 13px;
  font-weight: 400;
  color: #4B5563;
  line-height: 1.4;
  margin: 0;
}

.task-insight {
  margin: 0;
  font-size: 13px;
  color: #6B7280;
}

.go-to-task-btn {
  align-self: flex-start;
  background: linear-gradient(90deg, #D81B60, #F43F75);
  color: white;
  border: none;
  border-radius: 8px;
  padding: 8px 16px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.2s;
}

.go-to-task-btn:hover {
  background: linear-gradient(90deg, #C2185B, #E11D48);
  box-shadow: 0 4px 12px rgba(230, 46, 101, 0.24);
}

.risk-main {
  display: flex;
  align-items: center;
  gap: 10px;
}

.risk-ring {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid currentColor;
  font-size: 18px;
  box-shadow: inset 0 0 0 6px rgba(16, 185, 129, 0.12);
}

.risk-copy {
  flex: 1;
}

.risk-text {
  margin: 0 0 6px;
  font-size: 24px;
  font-weight: 800;
  line-height: 1.1;
}

.risk-level {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 15px;
  font-weight: 600;
}

.risk-level.risk-bajo {
  color: #10B981;
}

.risk-level.risk-medio {
  color: #FBBF24;
}

.risk-level.risk-alto {
  color: #E24D4D;
}

.risk-description {
  font-size: 12px;
  font-weight: 400;
  color: #4B5563;
  line-height: 1.4;
  margin: 0;
}

.empty-task-state,
.empty-risk-state {
  font-size: 13px;
  font-weight: 400;
  color: #999999;
  text-align: center;
  padding: 20px;
}

.dark-dashboard .priority-card,
.dark-dashboard .risk-card {
  background: radial-gradient(circle at 75% 25%, rgba(255, 64, 129, 0.08), transparent 45%), linear-gradient(145deg, rgba(18, 23, 33, 0.98), rgba(10, 14, 22, 0.98));
  border-color: rgba(244, 63, 115, 0.28);
}

.dark-dashboard .priority-card:hover,
.dark-dashboard .risk-card:hover {
  border-color: rgba(244, 63, 115, 0.36);
  box-shadow: 0 18px 38px rgba(0, 0, 0, 0.28);
}

.dark-dashboard .card-title,
.dark-dashboard .task-name {
  color: #f8fafc;
}

.dark-dashboard .priority-icon {
  background: rgba(244, 63, 115, 0.14);
  color: #ff8cae;
}

.dark-dashboard .risk-icon {
  background: rgba(16, 185, 129, 0.14);
  color: #6ee7b7;
}

.dark-dashboard .priority-badge {
  background: rgba(225, 29, 72, 0.16);
  color: #ff6f99;
}

.dark-dashboard .priority-badge.priority-high {
  background: rgba(225, 29, 72, 0.24);
  color: #ff8cae;
}

.dark-dashboard .deadline-info {
  color: #ff6f99;
}

.dark-dashboard .task-description,
.dark-dashboard .risk-description {
  color: #a7b0bf;
}

.dark-dashboard .task-insight {
  color: #7e8797;
}

.dark-dashboard .go-to-task-btn {
  background: #ff4f82;
}

.dark-dashboard .go-to-task-btn:hover {
  background: #ff3f7a;
}

.dark-dashboard .risk-level.risk-bajo {
  color: #6ee7b7;
}

.dark-dashboard .risk-level.risk-alto {
  color: #ff6f99;
}

.dark-dashboard .risk-level.risk-medio {
  color: #fbbf24;
}

.dark-dashboard .empty-task-state,
.dark-dashboard .empty-risk-state {
  color: #7e8797;
}

@media (max-width: 768px) {
  .cards-row {
    grid-template-columns: 1fr;
  }

  .task-name,
  .risk-text {
    font-size: 26px;
  }

  .risk-ring {
    width: 52px;
    height: 52px;
    font-size: 16px;
  }
}
</style>
