<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { getProjectsByLeader } from '@/services/project.service.js'
import { getTasksByProjectId, getTasksByUserId } from '@/services/task.service.js'
import { NotificationService } from '@/services/notification.service.js'
import { UserService } from '@/services/user.service.js'
import { getLeaderAiDashboard } from '@/services/ai-dashboard.service.js'

const router = useRouter()
const { t, locale } = useI18n()
const notificationService = new NotificationService()
const userService = new UserService()

const currentUser = ref(JSON.parse(localStorage.getItem('user') || '{}'))
const leaderName = computed(() => currentUser.value?.name || t('home.leader.fallbackName'))
const currentTheme = ref(document.documentElement.dataset.theme || localStorage.getItem('theme') || 'light')
const isDarkTheme = computed(() => currentTheme.value === 'dark')
const projects = ref([])
const allTasks = ref([])
const teamMembers = ref([])
const generatedAt = ref(t('home.common.notGeneratedYet'))
const topRiskProject = ref(null)
const recommendations = ref([])
const isReportModalOpen = ref(false)
const isReportLoading = ref(false)
const reportError = ref('')
const selectedMemberReport = ref(null)
const selectedPerformanceProjectId = ref('all')
const selectedRiskProjectId = ref('all')

const stats = ref({
  activeProjects: 0,
  newProjectsThisMonth: 0,
  pendingTasks: 0,
  overdueTasks: 0,
  avgTimePerTask: null,
  highRiskProjects: 0
})

const riskData = ref({
  probabilityOfDelay: 0,
  overallEfficiency: 0,
  riskLevel: ''
})

const aiMemberPerformances = ref([])

const recentActivities = ref([])

const getNewProjectsThisMonth = () => {
  const now = new Date()
  const currentMonth = now.getMonth()
  const currentYear = now.getFullYear()

  return projects.value.filter(p => {
    if (!p.startDate) return false
    const startDate = new Date(p.startDate)
    return startDate.getMonth() === currentMonth && startDate.getFullYear() === currentYear
  }).length
}

const formatGeneratedAt = (value) => {
  if (!value) return t('home.common.notGeneratedYet')
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString(locale.value === 'es' ? 'es-PE' : 'en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const getPerformanceClass = (level, score) => {
  const normalized = String(level || '').toUpperCase()
  if (normalized.includes('HIGH') || score >= 85) return 'high'
  if (normalized.includes('LOW') || normalized.includes('RISK') || score < 70) return 'low'
  return 'stable'
}

const getMemberInitials = (member) => {
  return (member.name || 'M')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part.charAt(0).toUpperCase())
    .join('')
}

const getMemberById = (userId) => {
  return teamMembers.value.find(member => Number(member.id) === Number(userId))
}

const normalizeStatus = (status) => String(status || '').toUpperCase()

const getAssignedUserIds = (task) => {
  if (Array.isArray(task.assignedUserIds)) return task.assignedUserIds.map(Number)
  if (Array.isArray(task.assignees)) return task.assignees.map(user => Number(user?.id || user))
  return [task.assignedUserId, task.userId, task.assignedID]
    .filter(value => value !== undefined && value !== null)
    .map(Number)
}

const isTaskAssignedToMember = (task, memberId) => {
  return getAssignedUserIds(task).includes(Number(memberId))
}

const getTaskDeadline = (task) => task.endDate || task.deadline || task.dueDate || null

const isTaskOverdue = (task) => {
  const status = normalizeStatus(task.status)
  const deadline = getTaskDeadline(task)
  if (!deadline || status === 'DONE') return false

  const deadlineDate = new Date(deadline)
  if (Number.isNaN(deadlineDate.getTime())) return false

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  deadlineDate.setHours(0, 0, 0, 0)
  return deadlineDate < today
}

const getDominantPriority = (tasks) => {
  const counts = tasks.reduce((acc, task) => {
    const priority = String(task.priority || '').toUpperCase()
    if (priority) acc[priority] = (acc[priority] || 0) + 1
    return acc
  }, {})

  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A'
}

const getTaskProjectName = (task) => {
  const project = projects.value.find(item => Number(item.projectId) === Number(task?.projectId))
  return project?.name || t('home.leader.unnamedProject')
}

const calculateRiskSnapshot = (tasks) => {
  const safeTasks = Array.isArray(tasks) ? tasks : []
  const totalTasks = safeTasks.length
  const completedTasks = safeTasks.filter(task => normalizeStatus(task.status) === 'DONE').length
  const activeTasks = safeTasks.filter(task => normalizeStatus(task.status) !== 'DONE')
  const overdueTasks = activeTasks.filter(isTaskOverdue).length
  const highPriorityOpenTasks = activeTasks.filter(task => String(task.priority || '').toUpperCase() === 'HIGH').length
  const probabilityOfDelay = totalTasks > 0
    ? Math.min(100, Math.round(((overdueTasks * 1.5 + highPriorityOpenTasks * 0.5) / totalTasks) * 100))
    : 0
  const overallEfficiency = totalTasks > 0
    ? Math.max(0, Math.round(((completedTasks - overdueTasks) / totalTasks) * 100))
    : 0

  let riskLevel = 'LOW'
  if (probabilityOfDelay >= 60 || overdueTasks >= 3) riskLevel = 'HIGH'
  else if (probabilityOfDelay >= 30 || overdueTasks > 0) riskLevel = 'MEDIUM'

  return {
    totalTasks,
    completedTasks,
    activeTasks: activeTasks.length,
    overdueTasks,
    highPriorityOpenTasks,
    probabilityOfDelay,
    overallEfficiency,
    riskLevel
  }
}

const formatPerformanceLevel = (level) => {
  const normalized = String(level || '').toLowerCase()
  if (!normalized) return t('home.leader.noPerformanceLevel')
  return normalized.charAt(0).toUpperCase() + normalized.slice(1)
}

const getCalculatedPerformanceLabel = (score, totalTasks) => {
  if (totalTasks === 0) return t('home.leader.noPerformanceLevel')
  if (score >= 85) return t('home.leader.highPerformance')
  if (score < 70) return t('home.leader.lowPerformance')
  return t('home.leader.stablePerformance')
}

const performanceProjectTabs = computed(() => [
  { id: 'all', name: t('home.leader.allProjects') },
  ...projects.value.map(project => ({
    id: Number(project.projectId),
    name: project.name || t('home.leader.unnamedProject')
  }))
])

const selectedProjectName = computed(() => {
  return performanceProjectTabs.value.find(project => project.id === selectedPerformanceProjectId.value)?.name
    || t('home.leader.allProjects')
})

const riskProjectTabs = computed(() => performanceProjectTabs.value)

const selectedRiskProjectName = computed(() => {
  return riskProjectTabs.value.find(project => project.id === selectedRiskProjectId.value)?.name
    || t('home.leader.allProjects')
})

const selectedRiskTasks = computed(() => {
  if (selectedRiskProjectId.value === 'all') return allTasks.value
  return allTasks.value.filter(task => Number(task.projectId) === Number(selectedRiskProjectId.value))
})

const selectedRiskSnapshot = computed(() => calculateRiskSnapshot(selectedRiskTasks.value))

const selectedRiskProject = computed(() => {
  if (selectedRiskProjectId.value === 'all') return topRiskProject.value
  const project = projects.value.find(item => Number(item.projectId) === Number(selectedRiskProjectId.value))
  const snapshot = selectedRiskSnapshot.value
  return project
    ? {
      name: project.name || t('home.leader.unnamedProject'),
      status: project.status || snapshot.riskLevel,
      delayRisk: snapshot.probabilityOfDelay,
      overallEfficiency: snapshot.overallEfficiency,
      riskLevel: snapshot.riskLevel
    }
    : null
})

const displayedRiskData = computed(() => {
  if (selectedRiskProjectId.value === 'all' && topRiskProject.value) {
    return riskData.value
  }
  const snapshot = selectedRiskSnapshot.value
  return {
    probabilityOfDelay: snapshot.probabilityOfDelay,
    overallEfficiency: snapshot.overallEfficiency,
    riskLevel: snapshot.riskLevel
  }
})

const displayedRecommendations = computed(() => {
  if (selectedRiskProjectId.value === 'all') return recommendations.value

  const snapshot = selectedRiskSnapshot.value
  const projectName = selectedRiskProjectName.value
  const localRecommendations = []

  if (snapshot.overdueTasks > 0) {
    localRecommendations.push(`Revisar ${snapshot.overdueTasks} tareas vencidas en ${projectName} y ajustar responsables o fechas limite.`)
  }
  if (snapshot.highPriorityOpenTasks > 0) {
    localRecommendations.push(`Priorizar ${snapshot.highPriorityOpenTasks} tareas de alta prioridad abiertas antes de abrir nuevo alcance.`)
  }
  if (snapshot.totalTasks > 0 && snapshot.overallEfficiency >= 80) {
    localRecommendations.push(`Mantener el ritmo de cierre actual en ${projectName}; la eficiencia esta sobre el umbral esperado.`)
  }
  if (localRecommendations.length === 0 && snapshot.totalTasks > 0) {
    localRecommendations.push(`No se detectan riesgos criticos en ${projectName}; continuar monitoreando fechas proximas.`)
  }

  return localRecommendations
})

const selectedProjectPerformance = computed(() => {
  const selectedProjectId = selectedPerformanceProjectId.value
  const projectIdNumber = Number(selectedProjectId)
  const isAllProjects = selectedProjectId === 'all'

  return teamMembers.value
    .filter(member => {
      if (isAllProjects) return true
      return member.projectIds.includes(projectIdNumber)
    })
    .map(member => {
      const memberTasks = allTasks.value.filter(task => {
        const belongsToProject = isAllProjects || Number(task.projectId) === projectIdNumber
        return belongsToProject && isTaskAssignedToMember(task, member.id)
      })
      const tasksCompleted = memberTasks.filter(task => normalizeStatus(task.status) === 'DONE').length
      const tasksDelayed = memberTasks.filter(isTaskOverdue).length
      const totalTasks = memberTasks.length
      const score = totalTasks > 0
        ? Math.max(0, Math.round(((tasksCompleted - tasksDelayed) / totalTasks) * 100))
        : 0
      const aiPerformance = aiMemberPerformances.value.find(item => Number(item.userId) === Number(member.id))
      const performanceLabel = isAllProjects && aiPerformance?.performanceLevel
        ? formatPerformanceLevel(aiPerformance.performanceLevel)
        : getCalculatedPerformanceLabel(score, totalTasks)
      const effectiveScore = isAllProjects && Number.isFinite(Number(aiPerformance?.score))
        ? Number(aiPerformance.score)
        : score

      return {
        id: member.id,
        name: member.name,
        email: member.email,
        avatar: member.avatar,
        score: effectiveScore,
        tasksCompleted: isAllProjects && Number.isFinite(Number(aiPerformance?.tasksCompleted))
          ? Number(aiPerformance.tasksCompleted)
          : tasksCompleted,
        tasksDelayed: isAllProjects && Number.isFinite(Number(aiPerformance?.tasksDelayed))
          ? Number(aiPerformance.tasksDelayed)
          : tasksDelayed,
        totalTasks,
        performanceLabel,
        performanceClass: getPerformanceClass(performanceLabel, effectiveScore)
      }
    })
})

const getUserRoleLabel = (user) => {
  const firstRole = Array.isArray(user.roles) ? user.roles[0] : user.roles
  const role = user.role || firstRole || user.position
  if (!role) return 'Miembro del equipo'
  if (typeof role === 'string') return role
  return role.name || role.roleName || role.authority || 'Miembro del equipo'
}

const getReportStatus = (score, delayedTasks, overdueTasks) => {
  if (score >= 85 && delayedTasks === 0 && overdueTasks === 0) return 'En buen estado'
  if (score < 70 || delayedTasks > 0 || overdueTasks > 0) return 'Requiere revisión'
  return 'Estable'
}

const getAresAnalysis = (report) => {
  if (!report) return ''
  if (report.score >= 85 && report.tasksDelayed === 0 && report.overdueTasks === 0) {
    return 'El miembro mantiene un rendimiento alto y no presenta retrasos relevantes. Puede asumir tareas de mayor impacto sin comprometer el avance del proyecto.'
  }
  if (report.score < 70) {
    return 'El miembro presenta un rendimiento bajo para el periodo evaluado. Es recomendable revisar bloqueos, carga asignada y fechas limite para evitar impacto en el Sprint.'
  }
  if (report.tasksDelayed > 0 || report.overdueTasks > 0) {
    return 'El miembro mantiene un rendimiento aceptable, pero presenta tareas retrasadas que podrian afectar el avance del Sprint.'
  }
  return 'El miembro mantiene un rendimiento estable. Conviene sostener el seguimiento de tareas en progreso y fechas limite proximas.'
}

const buildMemberRecommendations = (report, tasks) => {
  const safeTasks = Array.isArray(tasks) ? tasks : []
  const overdueTasks = safeTasks.filter(isTaskOverdue)
  const highPriorityOpenTasks = safeTasks.filter(task => {
    return normalizeStatus(task.status) !== 'DONE' && String(task.priority || '').toUpperCase() === 'HIGH'
  })
  const inProgressTasks = safeTasks.filter(task => normalizeStatus(task.status) === 'IN_PROGRESS')
  const recommendations = []

  if (overdueTasks.length > 0) {
    const taskNames = overdueTasks.slice(0, 2).map(task => `'${task.title || t('home.common.untitledTask')}'`).join(', ')
    recommendations.push(`Revisar con ${report.name} las tareas vencidas ${taskNames} y acordar una fecha realista de cierre.`)
  }

  if (highPriorityOpenTasks.length > 0) {
    const task = highPriorityOpenTasks[0]
    recommendations.push(`Priorizar '${task.title || t('home.common.untitledTask')}' en ${getTaskProjectName(task)} porque esta marcada como alta prioridad.`)
  }

  if (report.pendingTasks + report.inProgressTasks >= 5) {
    recommendations.push(`Reducir la carga activa de ${report.name}: tiene ${report.pendingTasks + report.inProgressTasks} tareas sin completar.`)
  }

  if (report.score >= 85 && report.overdueTasks === 0) {
    recommendations.push(`${report.name} mantiene buen rendimiento; puede apoyar tareas criticas del mismo proyecto si la carga se mantiene estable.`)
  }

  if (recommendations.length === 0) {
    recommendations.push(`Mantener seguimiento semanal con ${report.name} y revisar fechas limite proximas.`)
  }

  return recommendations
}

const buildMemberReport = (member, dashboard, tasks, userResponse, projectId = 'all') => {
  const performances = Array.isArray(dashboard?.memberPerformances) ? dashboard.memberPerformances : []
  const performance = performances.find(item => Number(item.userId) === Number(member.id)) || member
  const user = userResponse?.data || userResponse || {}
  const userName = `${user.name || ''} ${user.lastName || ''}`.trim()
  const safeTasks = Array.isArray(tasks) ? tasks : []
  const reportTasks = projectId === 'all'
    ? safeTasks
    : safeTasks.filter(task => Number(task.projectId) === Number(projectId))
  const pendingTasks = reportTasks.filter(task => ['TODO', 'TO_DO'].includes(normalizeStatus(task.status))).length
  const inProgressTasks = reportTasks.filter(task => normalizeStatus(task.status) === 'IN_PROGRESS').length
  const doneTasks = reportTasks.filter(task => normalizeStatus(task.status) === 'DONE').length
  const overdueTasks = reportTasks.filter(isTaskOverdue).length
  const totalReportTasks = reportTasks.length
  const calculatedScore = totalReportTasks > 0
    ? Math.max(0, Math.round(((doneTasks - overdueTasks) / totalReportTasks) * 100))
    : 0
  const useAiPerformance = projectId === 'all'
  const score = useAiPerformance && Number.isFinite(Number(performance.score))
    ? Number(performance.score)
    : calculatedScore
  const tasksDelayed = useAiPerformance && Number.isFinite(Number(performance.tasksDelayed))
    ? Number(performance.tasksDelayed)
    : overdueTasks

  const report = {
    userId: member.id,
    name: performance.userName || userName || member.name || t('home.member.fallbackName'),
    role: getUserRoleLabel(user),
    email: user.email || member.email || '',
    avatar: user.imageUrl || member.avatar || '',
    score,
    performanceLevel: useAiPerformance
      ? formatPerformanceLevel(performance.performanceLevel || member.performanceLabel)
      : getCalculatedPerformanceLabel(score, totalReportTasks),
    tasksCompleted: useAiPerformance && Number.isFinite(Number(performance.tasksCompleted))
      ? Number(performance.tasksCompleted)
      : doneTasks,
    tasksDelayed,
    pendingTasks,
    inProgressTasks,
    doneTasks,
    overdueTasks,
    dominantPriority: getDominantPriority(reportTasks),
    status: getReportStatus(score, tasksDelayed, overdueTasks),
    recommendations: []
  }

  report.analysis = getAresAnalysis(report)
  report.recommendations = buildMemberRecommendations(report, reportTasks)
  return report
}

const openMemberReport = async (member) => {
  isReportModalOpen.value = true
  isReportLoading.value = true
  reportError.value = ''
  selectedMemberReport.value = null

  try {
    const [dashboard, tasks, userResponse] = await Promise.all([
      getLeaderAiDashboard(),
      getTasksByUserId(member.id),
      userService.getUserById(member.id)
    ])

    selectedMemberReport.value = buildMemberReport(member, dashboard, tasks, userResponse, selectedPerformanceProjectId.value)
  } catch (error) {
    console.error('Error generating member report:', error.response?.data || error)
    reportError.value = 'No se pudo generar el reporte del miembro. Intenta nuevamente.'
  } finally {
    isReportLoading.value = false
  }
}

const closeMemberReport = () => {
  isReportModalOpen.value = false
  isReportLoading.value = false
  reportError.value = ''
  selectedMemberReport.value = null
}

const loadLeaderAiDashboard = async () => {
  try {
    const dashboard = await getLeaderAiDashboard()
    topRiskProject.value = dashboard?.topRiskProject || null
    recommendations.value = Array.isArray(dashboard?.recommendations) ? dashboard.recommendations : []
    generatedAt.value = formatGeneratedAt(dashboard?.generatedAt)

    stats.value.activeProjects = Number.isFinite(Number(dashboard?.totalProjects))
      ? Number(dashboard.totalProjects)
      : stats.value.activeProjects
    stats.value.highRiskProjects = Number.isFinite(Number(dashboard?.highRiskProjects))
      ? Number(dashboard.highRiskProjects)
      : 0

    riskData.value = {
      probabilityOfDelay: Number(topRiskProject.value?.delayRisk) || 0,
      overallEfficiency: Number(topRiskProject.value?.overallEfficiency) || 0,
      riskLevel: topRiskProject.value?.riskLevel || ''
    }

    aiMemberPerformances.value = Array.isArray(dashboard?.memberPerformances)
      ? dashboard.memberPerformances
      : []
  } catch (error) {
    console.error('Error loading AI leader dashboard:', error.response?.data || error)
    topRiskProject.value = null
    recommendations.value = []
    aiMemberPerformances.value = []
    generatedAt.value = t('home.common.notGeneratedYet')
    stats.value.highRiskProjects = 0
    riskData.value = {
      probabilityOfDelay: 0,
      overallEfficiency: 0,
      riskLevel: ''
    }
  }
}

const loadProjects = async () => {
  try {
    const data = await getProjectsByLeader()
    projects.value = Array.isArray(data) ? data : []
    stats.value.activeProjects = projects.value.length
    stats.value.newProjectsThisMonth = getNewProjectsThisMonth()
  } catch (error) {
    console.error('Error loading projects:', error)
    projects.value = []
  }
}

const loadTeamMembers = async () => {
  try {
    const response = await userService.getAllUsers()
    const users = Array.isArray(response) ? response : response?.data || []
    const leaderProjectIds = new Set(projects.value.map(project => Number(project.projectId)))

    teamMembers.value = users
      .filter(user => {
        const projectIds = Array.isArray(user.projectIds) ? user.projectIds.map(Number) : []
        return projectIds.some(projectId => leaderProjectIds.has(projectId))
      })
      .map(user => ({
        id: user.id,
        name: `${user.name || ''} ${user.lastName || ''}`.trim() || user.email || t('home.member.fallbackName'),
        email: user.email || '',
        avatar: user.imageUrl || '',
        projectIds: Array.isArray(user.projectIds) ? user.projectIds.map(Number) : []
      }))
  } catch (error) {
    console.error('Error loading team members:', error.response?.data || error)
    teamMembers.value = []
  }
}

const loadAllTasks = async () => {
  let tasks = []
  for (const project of projects.value) {
    try {
      const projectTasks = await getTasksByProjectId(project.projectId)
      if (Array.isArray(projectTasks)) {
        tasks.push(...projectTasks)
      }
    } catch (error) {
      console.error(`Error loading tasks for project ${project.projectId}:`, error)
    }
  }
  allTasks.value = tasks

  const pending = tasks.filter(t => t.status === 'TO_DO' || t.status === 'IN_PROGRESS').length
  const overdue = tasks.filter(t => {
    if (t.status === 'DONE') return false
    if (!t.endDate) return false
    return new Date(t.endDate) < new Date()
  }).length

  stats.value.pendingTasks = pending
  stats.value.overdueTasks = overdue

  const completedTasks = tasks.filter(t => t.status === 'DONE' && t.endDate && t.startDate)
  if (completedTasks.length > 0) {
    const totalDays = completedTasks.reduce((sum, task) => {
      const start = new Date(task.startDate)
      const end = new Date(task.endDate)
      const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24))
      return sum + days
    }, 0)
    stats.value.avgTimePerTask = (totalDays / completedTasks.length).toFixed(1)
  } else {
    stats.value.avgTimePerTask = null
  }
}
const loadNotifications = async () => {
  try {
    const notifications = await notificationService.getMyNotifications()
    recentActivities.value = notifications.slice(0, 6).map(n => ({
      id: n.id,
      icon: n.title.includes('asignada') ? 'pi pi-check-circle' : 'pi pi-pencil',
      iconClass: n.title.includes('asignada') ? 'icon-success' : 'icon-warning',
      text: n.message,
      time: formatTimeAgo(n.sentAt)
    }))
  } catch (error) {
    console.error('Error loading notifications:', error)
    recentActivities.value = []
  }
}

const formatTimeAgo = (dateString) => {
  if (!dateString) return t('home.common.recently')
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now - date
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return t('home.common.justNow')
  if (diffMins < 60) return t('home.common.minutesAgo', { count: diffMins })
  if (diffHours < 24) return t('home.common.hoursAgo', { count: diffHours })
  return t('home.common.daysAgo', { count: diffDays })
}

const goToTeam = () => {
  router.push('/team')
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

onMounted(async () => {
  currentTheme.value = document.documentElement.dataset.theme || resolveThemePreference()
  window.addEventListener('theme-changed', syncTheme)
  window.addEventListener('storage', syncTheme)
  await loadProjects()
  await loadTeamMembers()
  await loadAllTasks()
  await loadLeaderAiDashboard()
  await loadNotifications()
})

onBeforeUnmount(() => {
  window.removeEventListener('theme-changed', syncTheme)
  window.removeEventListener('storage', syncTheme)
})
</script>

<template>
  <div class="leader-dashboard" :class="{ 'dark-dashboard': isDarkTheme }">
    <div class="page-header">
      <h1 class="page-title">{{ $t('home.leader.welcome', { name: leaderName }) }}</h1>
      <p class="page-subtitle">{{ $t('home.leader.subtitle') }}</p>
    </div>

    <div class="kpi-grid">
      <div class="kpi-card">
        <div class="kpi-label">{{ $t('home.leader.activeProjects') }}</div>
        <div class="kpi-value-wrapper">
          <span class="kpi-value">{{ stats.activeProjects }}</span>
          <span class="kpi-badge green">{{ $t('home.leader.thisMonth', { count: stats.newProjectsThisMonth }) }}</span>
        </div>
      </div>

      <div class="kpi-card">
        <div class="kpi-label">{{ $t('home.leader.pendingTasks') }}</div>
        <div class="kpi-value-wrapper">
          <span class="kpi-value">{{ stats.pendingTasks }}</span>
          <i class="pi pi-arrow-up trend-icon up"></i>
        </div>
      </div>

      <div class="kpi-card">
        <div class="kpi-label">{{ $t('home.leader.overdueTasks') }}</div>
        <div class="kpi-value-wrapper">
          <span class="kpi-value">{{ stats.overdueTasks }}</span>
          <span class="kpi-badge red">{{ $t('home.leader.highRisk', { count: stats.highRiskProjects }) }}</span>
        </div>
      </div>

      <div class="kpi-card">
        <div class="kpi-label">{{ $t('home.leader.averageCompletionTime') }}</div>
        <div class="kpi-value-wrapper">
          <span class="kpi-value">{{ stats.avgTimePerTask ?? 'N/A' }}<template v-if="stats.avgTimePerTask">d</template></span>
          <span class="kpi-suffix">{{ $t('home.leader.perTask') }}</span>
        </div>
      </div>
    </div>

    <div class="analytics-section">
      <div class="analytics-header">
        <h2 class="analytics-title">{{ $t('home.leader.smartAnalytics') }}</h2>
        <div class="ai-badge">{{ $t('home.leader.aiPowered') }}</div>
      </div>

      <div class="analytics-grid">
        <div class="section-card risk-card">
          <div class="card-header-row">
            <div class="card-title">
              <i class="pi pi-shield"></i>
              <span>{{ $t('home.leader.aiRiskAssessment') }}</span>
            </div>
            <button class="download-btn">
              <i class="pi pi-download"></i>
              {{ $t('home.leader.downloadReport') }}
            </button>
          </div>
          <div class="project-tabs risk-project-tabs" role="tablist" :aria-label="$t('home.leader.riskProjectTabs')">
            <button
              v-for="project in riskProjectTabs"
              :key="project.id"
              type="button"
              class="project-tab"
              :class="{ active: selectedRiskProjectId === project.id }"
              role="tab"
              :aria-selected="selectedRiskProjectId === project.id"
              @click="selectedRiskProjectId = project.id"
            >
              {{ project.name }}
            </button>
          </div>
          <p class="card-description">
            <span v-if="selectedRiskProject">{{ $t('home.leader.topRisk', { name: selectedRiskProject.name, status: selectedRiskProject.status }) }}</span>
            <span v-else>{{ $t('home.leader.noRiskAssessment') }}</span>
          </p>

          <div class="metrics-row">
            <div class="metric">
              <div class="metric-label">{{ $t('home.leader.probabilityOfDelay') }}</div>
              <div class="metric-value red">{{ displayedRiskData.probabilityOfDelay }}%</div>
              <div class="progress-bar">
                <div class="progress-fill red" :style="{ width: displayedRiskData.probabilityOfDelay + '%' }"></div>
              </div>
            </div>
            <div class="metric">
              <div class="metric-label">{{ $t('home.leader.overallEfficiency') }}</div>
              <div class="metric-value green">{{ displayedRiskData.overallEfficiency }}%</div>
              <div class="progress-bar">
                <div class="progress-fill green" :style="{ width: displayedRiskData.overallEfficiency + '%' }"></div>
              </div>
            </div>
          </div>

          <div class="ai-recommendation">
            <i class="pi pi-microchip-ai"></i>
            <div class="recommendation-content">
              <div class="recommendation-title">{{ $t('home.leader.aiRecommendations') }}</div>
              <p class="recommendation-meta">{{ $t('home.common.lastGenerated', { value: generatedAt }) }}</p>
              <p v-if="displayedRecommendations.length === 0" class="recommendation-text">{{ $t('home.leader.noRecommendations') }}</p>
              <ul v-else class="recommendations-list">
                <li v-for="(recommendation, index) in displayedRecommendations" :key="index">{{ recommendation }}</li>
              </ul>
            </div>
          </div>
        </div>

        <div class="section-card performance-card">
          <div class="performance-header">
            <div>
              <h3>{{ $t('home.leader.performancePerMember') }}</h3>
              <span class="performance-sub">{{ $t('home.leader.performanceSubtitle') }}</span>
            </div>
            <span class="performance-project-name">{{ selectedProjectName }}</span>
          </div>

          <div class="project-tabs" role="tablist" :aria-label="$t('home.leader.performanceProjectTabs')">
            <button
              v-for="project in performanceProjectTabs"
              :key="project.id"
              type="button"
              class="project-tab"
              :class="{ active: selectedPerformanceProjectId === project.id }"
              role="tab"
              :aria-selected="selectedPerformanceProjectId === project.id"
              @click="selectedPerformanceProjectId = project.id"
            >
              {{ project.name }}
            </button>
          </div>

          <div class="members-list">
            <p v-if="selectedProjectPerformance.length === 0" class="empty-state">{{ $t('home.leader.noMemberPerformance') }}</p>
            <div v-for="member in selectedProjectPerformance" :key="member.id" class="member-row">
              <img v-if="member.avatar" :src="member.avatar" class="member-avatar" />
              <div v-else class="member-avatar member-initials">{{ getMemberInitials(member) }}</div>
              <div class="member-info">
                <div class="member-name">{{ member.name }}</div>
                <div class="member-role">{{ $t('home.leader.memberTaskStats', { completed: member.tasksCompleted, delayed: member.tasksDelayed }) }}</div>
                <div class="member-performance" :class="member.performanceClass">
                  {{ member.performanceLabel }} ({{ member.score }}%)
                </div>
              </div>
              <button class="generate-report-btn" @click="openMemberReport(member)">
                <i class="pi pi-chart-line"></i>
                {{ $t('home.leader.generateReport') }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="bottom-grid">
      <div class="section-card activities-card">
        <div class="activities-header">
          <h3>{{ $t('home.leader.recentActivities') }}</h3>
        </div>
        <div class="activities-grid">
          <p v-if="recentActivities.length === 0" class="empty-state activities-empty">{{ $t('home.leader.noRecentActivities') }}</p>
          <div v-for="activity in recentActivities.slice(0, 4)" :key="activity.id" class="activity-item">
            <div class="activity-icon" :class="activity.iconClass">
              <i :class="activity.icon"></i>
            </div>
            <div class="activity-content">
              <p class="activity-text">{{ activity.text }}</p>
              <span class="activity-time">{{ activity.time }}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="section-card team-card">
        <div class="team-header">
          <h3>{{ $t('home.leader.teamMembers') }}</h3>
          <div class="live-badge">{{ $t('home.leader.membersCount', { count: teamMembers.length }) }}</div>
          <button class="see-all-btn" @click="goToTeam">{{ $t('home.common.seeAll') }}</button>
        </div>
        <div class="active-members-list">
          <p v-if="teamMembers.length === 0" class="empty-state">{{ $t('home.leader.noTeamMembers') }}</p>
          <div v-for="member in teamMembers.slice(0, 5)" :key="member.id" class="active-member-row">
            <img v-if="member.avatar" :src="member.avatar" class="member-avatar-small" />
            <div v-else class="member-avatar-small member-initials">{{ getMemberInitials(member) }}</div>
            <div class="member-details">
              <div class="member-name">{{ member.name }}</div>
              <div class="member-role">{{ member.email || $t('home.common.noEmail') }}</div>
            </div>
            <button class="message-icon-btn">
              <i class="pi pi-comment"></i>
            </button>
          </div>
        </div>
      </div>
    </div>

    <div v-if="isReportModalOpen" class="report-modal-overlay" @click.self="closeMemberReport">
      <div class="report-modal" role="dialog" aria-modal="true" aria-labelledby="member-report-title">
        <button class="report-close-btn" aria-label="Cerrar reporte" @click="closeMemberReport">
          <i class="pi pi-times"></i>
        </button>

        <div class="report-modal-header">
          <div>
            <p class="report-kicker">Reporte de rendimiento</p>
            <h2 id="member-report-title">Reporte de rendimiento</h2>
          </div>
        </div>

        <div v-if="isReportLoading" class="report-loading">
          <i class="pi pi-spin pi-spinner"></i>
          <span>Generando reporte...</span>
        </div>

        <p v-else-if="reportError" class="report-error">{{ reportError }}</p>

        <div v-else-if="selectedMemberReport" class="report-content">
          <div class="report-member-summary">
            <img v-if="selectedMemberReport.avatar" :src="selectedMemberReport.avatar" class="report-avatar" />
            <div v-else class="report-avatar report-initials">{{ getMemberInitials(selectedMemberReport) }}</div>
            <div>
              <h3>{{ selectedMemberReport.name }}</h3>
              <p>{{ selectedMemberReport.role }}</p>
              <span v-if="selectedMemberReport.email">{{ selectedMemberReport.email }}</span>
            </div>
          </div>

          <div class="report-score-panel">
            <div>
              <span class="report-section-label">Performance Score</span>
              <strong>{{ selectedMemberReport.score }} / 100</strong>
            </div>
            <span class="report-level" :class="getPerformanceClass(selectedMemberReport.performanceLevel, selectedMemberReport.score)">
              {{ selectedMemberReport.performanceLevel }}
            </span>
          </div>

          <div class="report-metrics">
            <h4>Metricas</h4>
            <div class="report-metrics-grid">
              <div class="report-metric">
                <i class="pi pi-check-circle"></i>
                <span>{{ selectedMemberReport.tasksCompleted }} tareas completadas</span>
              </div>
              <div class="report-metric">
                <i class="pi pi-clock"></i>
                <span>{{ selectedMemberReport.tasksDelayed }} tareas retrasadas</span>
              </div>
              <div class="report-metric">
                <i class="pi pi-bookmark"></i>
                <span>{{ selectedMemberReport.pendingTasks }} pendientes</span>
              </div>
              <div class="report-metric">
                <i class="pi pi-bolt"></i>
                <span>{{ selectedMemberReport.inProgressTasks }} en progreso</span>
              </div>
              <div class="report-metric">
                <i class="pi pi-exclamation-triangle"></i>
                <span>{{ selectedMemberReport.overdueTasks }} vencidas</span>
              </div>
              <div class="report-metric">
                <i class="pi pi-flag"></i>
                <span>Prioridad dominante: {{ selectedMemberReport.dominantPriority }}</span>
              </div>
            </div>
          </div>

          <div class="report-block">
            <span class="report-section-label">Estado</span>
            <p>{{ selectedMemberReport.status }}</p>
          </div>

          <div class="report-block">
            <span class="report-section-label">Analisis de Ares</span>
            <p>{{ selectedMemberReport.analysis }}</p>
          </div>

          <div class="report-block">
            <span class="report-section-label">Recomendaciones</span>
            <ul v-if="selectedMemberReport.recommendations.length" class="report-recommendations">
              <li v-for="(recommendation, index) in selectedMemberReport.recommendations" :key="index">
                <i class="pi pi-check"></i>
                <span>{{ recommendation }}</span>
              </li>
            </ul>
            <p v-else>No hay recomendaciones disponibles para este reporte.</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.leader-dashboard {
  max-width: 1440px;
  margin: 0 auto;
  padding: 24px;
  background: #FAFAFA;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

.page-header {
  margin-bottom: 32px;
}

.page-title {
  font-size: 28px;
  font-weight: 600;
  color: #1A1A1A;
  margin: 0 0 8px 0;
}

.page-subtitle {
  font-size: 15px;
  font-weight: 400;
  color: #6B7280;
  margin: 0;
}

.kpi-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 24px;
  margin-bottom: 32px;
}

.kpi-card {
  background: #FFFFFF;
  border: 1px solid #FFCDCD;
  border-left: 4px solid #C2185B;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.03);
  transition: all 0.2s ease;
}

.kpi-card:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.05);
}

.kpi-label {
  font-size: 12px;
  font-weight: 500;
  color: #6B7280;
  letter-spacing: 0.5px;
  margin-bottom: 12px;
}

.kpi-value-wrapper {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px;
}

.kpi-value {
  font-size: 36px;
  font-weight: 700;
  color: #1A1A1A;
}

.kpi-badge {
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
}

.kpi-badge.green {
  background: #E8F5E9;
  color: #0E9F6E;
}

.kpi-badge.red {
  background: #FEF2F2;
  color: #EF4444;
}

.kpi-suffix {
  font-size: 14px;
  font-weight: 400;
  color: #6B7280;
}

.trend-icon {
  font-size: 14px;
}

.trend-icon.up {
  color: #0E9F6E;
}

.analytics-section {
  margin-bottom: 32px;
}

.analytics-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.analytics-title {
  font-size: 20px;
  font-weight: 600;
  color: #1A1A1A;
  margin: 0;
}

.ai-badge {
  background: linear-gradient(135deg, #0E9F6E, #10B981);
  padding: 6px 14px;
  border-radius: 30px;
  font-size: 11px;
  font-weight: 700;
  color: white;
  letter-spacing: 0.5px;
}

.analytics-grid {
  display: flex;
  gap: 24px;
}

.section-card {
  background: #FFFFFF;
  border: 1px solid #FFCDCD;
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.03);
  transition: box-shadow 0.2s;
}

.section-card:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.05);
}

.risk-card {
  flex: 1;
}

.performance-card {
  flex: 1;
}

.card-header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.card-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 600;
  color: #1A1A1A;
}

.card-title i {
  font-size: 18px;
  color: #C2185B;
}

.download-btn {
  background: transparent;
  border: 1px solid #C2185B;
  color: #C2185B;
  padding: 6px 12px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all 0.2s;
}

.download-btn:hover {
  background: #C2185B;
  color: white;
}

.card-description {
  font-size: 13px;
  color: #6B7280;
  margin-bottom: 20px;
}

.metrics-row {
  display: flex;
  gap: 24px;
  margin-bottom: 24px;
}

.metric {
  flex: 1;
}

.metric-label {
  font-size: 11px;
  font-weight: 500;
  color: #6B7280;
  letter-spacing: 0.5px;
  margin-bottom: 8px;
}

.metric-value {
  font-size: 28px;
  font-weight: 700;
  margin-bottom: 12px;
}

.metric-value.red {
  color: #EF4444;
}

.metric-value.green {
  color: #0E9F6E;
}

.progress-bar {
  height: 6px;
  background: #ECECEC;
  border-radius: 3px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  border-radius: 3px;
  transition: width 0.3s;
}

.progress-fill.red {
  background: #EF4444;
}

.progress-fill.green {
  background: #0E9F6E;
}

.ai-recommendation {
  background: #F5F3FF;
  border-radius: 12px;
  padding: 16px;
  display: flex;
  gap: 12px;
}

.ai-recommendation i {
  font-size: 20px;
  color: #C2185B;
}

.recommendation-content {
  flex: 1;
}

.recommendation-title {
  font-size: 13px;
  font-weight: 600;
  color: #1A1A1A;
  margin-bottom: 4px;
}

.recommendation-text {
  font-size: 13px;
  color: #4B5563;
  margin: 0;
  line-height: 1.5;
}

.recommendation-meta {
  font-size: 11px;
  color: #6B7280;
  margin: 0 0 8px 0;
}

.recommendations-list {
  margin: 0;
  padding-left: 18px;
  color: #4B5563;
  font-size: 13px;
  line-height: 1.5;
}

.recommendations-list li {
  margin-bottom: 6px;
}

.performance-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 20px;
}

.performance-header h3 {
  font-size: 16px;
  font-weight: 600;
  color: #1A1A1A;
  margin: 0 0 4px 0;
}

.performance-sub {
  font-size: 12px;
  color: #6B7280;
}

.performance-project-name {
  max-width: 180px;
  color: #C2185B;
  font-size: 12px;
  font-weight: 700;
  text-align: right;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.project-tabs {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 8px;
  margin-bottom: 16px;
}

.project-tab {
  flex: 0 0 auto;
  max-width: 180px;
  border: 1px solid #F3D3D9;
  background: #FFFFFF;
  color: #6B7280;
  border-radius: 999px;
  padding: 7px 12px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  transition: all 0.2s;
}

.project-tab:hover {
  border-color: #C2185B;
  color: #C2185B;
}

.project-tab.active {
  background: #C2185B;
  border-color: #C2185B;
  color: #FFFFFF;
}

.members-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.empty-state {
  color: #6B7280;
  font-size: 13px;
  line-height: 1.4;
  margin: 0;
}

.member-row {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px;
  background: #FAFAFA;
  border-radius: 12px;
  transition: background 0.2s;
}

.member-row:hover {
  background: #F5F5F5;
}

.member-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  object-fit: cover;
}

.member-initials {
  background: #FCEEEF;
  color: #B70F4B;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
}

.member-info {
  flex: 1;
}

.member-name {
  font-weight: 600;
  color: #1A1A1A;
  font-size: 14px;
}

.member-role {
  font-size: 12px;
  color: #6B7280;
  margin-top: 2px;
}

.member-performance {
  font-size: 12px;
  margin-top: 4px;
}

.member-performance.high {
  color: #0E9F6E;
}

.member-performance.stable {
  color: #3B82F6;
}

.member-performance.low {
  color: #EF4444;
}

.generate-report-btn {
  background: #E0F2FE;
  border: none;
  color: #1A1A1A;
  padding: 8px 14px;
  border-radius: 30px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.2s;
}

.generate-report-btn:hover {
  background: #BAE6FD;
}

.bottom-grid {
  display: flex;
  gap: 24px;
}

.activities-card {
  flex: 1.5;
}

.activities-header h3 {
  font-size: 16px;
  font-weight: 600;
  color: #1A1A1A;
  margin: 0 0 20px 0;
}

.activities-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

.activity-item {
  display: flex;
  gap: 12px;
  align-items: flex-start;
}

.activity-icon {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.activity-icon i {
  font-size: 16px;
}

.icon-success {
  background: #E8F5E9;
  color: #0E9F6E;
}

.icon-warning {
  background: #FEF3C7;
  color: #F59E0B;
}

.icon-info {
  background: #E0F2FE;
  color: #3B82F6;
}

.activity-content {
  flex: 1;
}

.activity-text {
  font-size: 13px;
  color: #1A1A1A;
  margin: 0 0 6px 0;
  line-height: 1.4;
}

.activity-time {
  font-size: 11px;
  color: #9CA3AF;
}

.activities-empty {
  grid-column: 1 / -1;
}

/* Team Card */
.team-card {
  flex: 1;
}

.team-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
}

.team-header h3 {
  font-size: 16px;
  font-weight: 600;
  color: #1A1A1A;
  margin: 0;
}

.live-badge {
  background: #0E9F6E;
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 600;
  color: white;
}

.see-all-btn {
  margin-left: auto;
  background: transparent;
  border: none;
  color: #C2185B;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: opacity 0.2s;
}

.see-all-btn:hover {
  opacity: 0.8;
}

.active-members-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.active-member-row {
  display: flex;
  align-items: center;
  gap: 12px;
  position: relative;
}

.online-indicator {
  width: 8px;
  height: 8px;
  background: #0E9F6E;
  border-radius: 50%;
  position: absolute;
  left: 28px;
  top: 28px;
  border: 2px solid white;
}

.member-avatar-small {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  object-fit: cover;
}

.member-details {
  flex: 1;
}

.member-details .member-name {
  font-size: 14px;
  font-weight: 600;
  color: #1A1A1A;
}

.member-details .member-role {
  font-size: 12px;
  color: #6B7280;
  margin-top: 2px;
}

.message-icon-btn {
  background: transparent;
  border: none;
  color: #9CA3AF;
  cursor: pointer;
  padding: 8px;
  border-radius: 50%;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.message-icon-btn:hover {
  color: #C2185B;
  background: #FEE2E2;
}

.message-icon-btn i {
  font-size: 16px;
}

.report-modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 1000;
  background: rgba(17, 24, 39, 0.58);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.report-modal {
  width: min(760px, 100%);
  max-height: min(88vh, 860px);
  overflow-y: auto;
  position: relative;
  background: #FFFFFF;
  border: 1px solid #FFCDCD;
  border-radius: 16px;
  box-shadow: 0 24px 70px rgba(15, 23, 42, 0.28);
  padding: 28px;
}

.report-close-btn {
  position: absolute;
  top: 18px;
  right: 18px;
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 50%;
  background: #F3F4F6;
  color: #374151;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.report-close-btn:hover {
  background: #FEE2E2;
  color: #C2185B;
}

.report-modal-header {
  border-bottom: 1px solid #F3D3D9;
  padding-right: 44px;
  padding-bottom: 18px;
  margin-bottom: 20px;
}

.report-kicker,
.report-section-label {
  display: block;
  font-size: 12px;
  font-weight: 700;
  color: #C2185B;
  letter-spacing: 0.5px;
  text-transform: uppercase;
}

.report-kicker {
  margin: 0 0 6px 0;
}

.report-modal-header h2 {
  color: #1A1A1A;
  font-size: 22px;
  font-weight: 700;
  margin: 0;
}

.report-loading,
.report-error {
  min-height: 220px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  color: #4B5563;
  font-size: 14px;
}

.report-error {
  color: #EF4444;
  text-align: center;
}

.report-content {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.report-member-summary {
  display: flex;
  align-items: center;
  gap: 14px;
}

.report-avatar {
  width: 58px;
  height: 58px;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
}

.report-initials {
  background: #FCEEEF;
  color: #B70F4B;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
}

.report-member-summary h3 {
  color: #1A1A1A;
  font-size: 18px;
  font-weight: 700;
  margin: 0 0 4px 0;
}

.report-member-summary p,
.report-member-summary span {
  display: block;
  color: #6B7280;
  font-size: 13px;
  margin: 0;
}

.report-score-panel {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: center;
  background: #FAFAFA;
  border: 1px solid #F3D3D9;
  border-radius: 12px;
  padding: 18px;
}

.report-score-panel strong {
  display: block;
  color: #1A1A1A;
  font-size: 34px;
  line-height: 1.1;
  margin-top: 6px;
}

.report-level {
  border-radius: 30px;
  padding: 8px 14px;
  font-size: 13px;
  font-weight: 700;
  white-space: nowrap;
}

.report-level.high {
  background: #E8F5E9;
  color: #0E9F6E;
}

.report-level.stable {
  background: #E0F2FE;
  color: #2563EB;
}

.report-level.low {
  background: #FEF2F2;
  color: #EF4444;
}

.report-metrics,
.report-block {
  border-top: 1px solid #F3D3D9;
  padding-top: 18px;
}

.report-metrics h4 {
  color: #1A1A1A;
  font-size: 15px;
  font-weight: 700;
  margin: 0 0 14px 0;
}

.report-metrics-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.report-metric {
  min-height: 42px;
  display: flex;
  align-items: center;
  gap: 10px;
  color: #374151;
  font-size: 13px;
  background: #FAFAFA;
  border-radius: 10px;
  padding: 10px 12px;
}

.report-metric i {
  color: #C2185B;
  font-size: 15px;
}

.report-block p {
  color: #374151;
  font-size: 14px;
  line-height: 1.6;
  margin: 8px 0 0 0;
}

.report-recommendations {
  display: flex;
  flex-direction: column;
  gap: 10px;
  list-style: none;
  padding: 0;
  margin: 10px 0 0 0;
}

.report-recommendations li {
  display: flex;
  gap: 10px;
  color: #374151;
  font-size: 14px;
  line-height: 1.5;
}

.report-recommendations i {
  color: #0E9F6E;
  margin-top: 3px;
}

@media (max-width: 1200px) {
  .kpi-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .analytics-grid {
    flex-direction: column;
  }

  .risk-card, .performance-card {
    flex: 1;
  }

  .bottom-grid {
    flex-direction: column;
  }

  .activities-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .leader-dashboard {
    padding: 16px;
  }

  .kpi-grid {
    grid-template-columns: 1fr;
  }

  .metrics-row {
    flex-direction: column;
    gap: 16px;
  }

  .member-row {
    flex-wrap: wrap;
  }

  .performance-header {
    flex-direction: column;
  }

  .performance-project-name {
    max-width: 100%;
    text-align: left;
  }

  .generate-report-btn {
    width: 100%;
    justify-content: center;
  }

  .report-modal-overlay {
    padding: 12px;
    align-items: flex-end;
  }

  .report-modal {
    max-height: 92vh;
    padding: 22px;
  }

  .report-score-panel,
  .report-member-summary {
    align-items: flex-start;
  }

  .report-score-panel {
    flex-direction: column;
  }

  .report-metrics-grid {
    grid-template-columns: 1fr;
  }
}

.leader-dashboard.dark-dashboard {
  background: #080b12;
  color: #eef2f8;
}

.dark-dashboard .page-title,
.dark-dashboard .analytics-title,
.dark-dashboard .card-title,
.dark-dashboard .kpi-value,
.dark-dashboard .recommendation-title,
.dark-dashboard .performance-header h3,
.dark-dashboard .activities-header h3,
.dark-dashboard .team-header h3,
.dark-dashboard .member-name,
.dark-dashboard .member-details .member-name,
.dark-dashboard .activity-text {
  color: #f8fafc;
}

.dark-dashboard .page-subtitle,
.dark-dashboard .kpi-label,
.dark-dashboard .kpi-suffix,
.dark-dashboard .card-description,
.dark-dashboard .recommendation-text,
.dark-dashboard .recommendation-meta,
.dark-dashboard .recommendations-list,
.dark-dashboard .performance-sub,
.dark-dashboard .member-role,
.dark-dashboard .member-details .member-role,
.dark-dashboard .activity-time,
.dark-dashboard .empty-state,
.dark-dashboard .metric-label {
  color: #a7b0bf;
}

.dark-dashboard .kpi-card,
.dark-dashboard .section-card {
  background: linear-gradient(145deg, rgba(18, 23, 33, 0.98), rgba(10, 14, 22, 0.98));
  border-color: rgba(244, 63, 115, 0.26);
  box-shadow: 0 18px 45px rgba(0, 0, 0, 0.24);
}

.dark-dashboard .kpi-card {
  border-left-color: #ff4f82;
}

.dark-dashboard .section-card:hover,
.dark-dashboard .kpi-card:hover {
  box-shadow: 0 18px 38px rgba(0, 0, 0, 0.28);
}

.dark-dashboard .member-row {
  background: rgba(15, 20, 30, 0.92);
}

.dark-dashboard .project-tab {
  background: rgba(15, 20, 30, 0.92);
  border-color: rgba(244, 63, 115, 0.22);
  color: #a7b0bf;
}

.dark-dashboard .project-tab:hover {
  border-color: rgba(244, 63, 115, 0.5);
  color: #ff8cae;
}

.dark-dashboard .project-tab.active {
  background: #e11d48;
  border-color: #e11d48;
  color: #ffffff;
}

.dark-dashboard .performance-project-name {
  color: #ff8cae;
}

.dark-dashboard .member-row:hover {
  background: rgba(24, 30, 42, 0.98);
}

.dark-dashboard .progress-bar {
  background: #252b38;
}

.dark-dashboard .ai-recommendation {
  background: rgba(225, 29, 72, 0.12);
  border: 1px solid rgba(244, 63, 115, 0.18);
}

.dark-dashboard .generate-report-btn {
  background: rgba(59, 130, 246, 0.16);
  color: #dbeafe;
}

.dark-dashboard .generate-report-btn:hover {
  background: rgba(59, 130, 246, 0.24);
}

.dark-dashboard .online-indicator {
  border-color: #10141d;
}

.dark-dashboard .member-initials {
  background: rgba(244, 63, 115, 0.14);
  color: #ff8cae;
}

.dark-dashboard .message-icon-btn:hover {
  background: rgba(225, 29, 72, 0.14);
}

.dark-dashboard .report-modal {
  background: linear-gradient(145deg, rgba(18, 23, 33, 0.98), rgba(10, 14, 22, 0.98));
  border-color: rgba(244, 63, 115, 0.28);
  box-shadow: 0 24px 70px rgba(0, 0, 0, 0.48);
}

.dark-dashboard .report-modal-header,
.dark-dashboard .report-metrics,
.dark-dashboard .report-block {
  border-color: rgba(244, 63, 115, 0.2);
}

.dark-dashboard .report-modal-header h2,
.dark-dashboard .report-member-summary h3,
.dark-dashboard .report-score-panel strong,
.dark-dashboard .report-metrics h4 {
  color: #F8FAFC;
}

.dark-dashboard .report-member-summary p,
.dark-dashboard .report-member-summary span,
.dark-dashboard .report-loading,
.dark-dashboard .report-metric,
.dark-dashboard .report-block p,
.dark-dashboard .report-recommendations li {
  color: #CBD5E1;
}

.dark-dashboard .report-close-btn,
.dark-dashboard .report-score-panel,
.dark-dashboard .report-metric {
  background: rgba(15, 20, 30, 0.92);
  border-color: rgba(244, 63, 115, 0.18);
}

.dark-dashboard .report-close-btn {
  color: #CBD5E1;
}

.dark-dashboard .report-close-btn:hover {
  background: rgba(225, 29, 72, 0.18);
  color: #FF8CAE;
}
</style>
