<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { getProjectsByLeader } from '@/services/project.service.js'
import { getTasksByProjectId } from '@/services/task.service.js'
import { NotificationService } from '@/services/notification.service.js'
import { UserService } from '@/services/user.service.js'

const router = useRouter()
const notificationService = new NotificationService()
const userService = new UserService()

const currentUser = ref(JSON.parse(localStorage.getItem('user') || '{}'))
const leaderName = computed(() => currentUser.value?.name || 'Leader')
const projects = ref([])
const allTasks = ref([])

const stats = ref({
  activeProjects: 0,
  newProjectsThisMonth: 0,
  pendingTasks: 0,
  overdueTasks: 0,
  avgTimePerTask: 4.2
})

const riskData = ref({
  probabilityOfDelay: 15,
  overallEfficiency: 88
})

const aiRecommendation = ref({
  text: 'A bottleneck has been detected in "Project 1". Consider reassigning two QA tasks to avoid delays in the final deployment.'
})

const teamPerformance = ref([
  { id: 1, name: 'Marcos Diaz', role: 'Tech Lead', avatar: 'https://randomuser.me/api/portraits/men/1.jpg', score: 94, performanceLabel: 'High Performance', performanceClass: 'high' },
  { id: 2, name: 'Ana Valdez', role: 'UX Designer', avatar: 'https://randomuser.me/api/portraits/women/2.jpg', score: 82, performanceLabel: 'Stable Performance', performanceClass: 'stable' },
  { id: 3, name: 'Roberto Gomez', role: 'Backend Developer', avatar: 'https://randomuser.me/api/portraits/men/3.jpg', score: 66, performanceLabel: 'Requires Review', performanceClass: 'low' }
])

const recentActivities = ref([])

const activeMembers = ref([
  { id: 1, name: 'Marcos Diaz', role: 'Tech Lead', avatar: 'https://randomuser.me/api/portraits/men/1.jpg', online: true },
  { id: 2, name: 'Ana Valdez', role: 'UX Designer', avatar: 'https://randomuser.me/api/portraits/women/2.jpg', online: true },
  { id: 3, name: 'Roberto Gomez', role: 'Backend Developer', avatar: 'https://randomuser.me/api/portraits/men/3.jpg', online: false }
])

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
    // Actividades de ejemplo con los datos que pediste
    recentActivities.value = [
      { id: 1, icon: 'pi pi-user-plus', iconClass: 'icon-info', text: 'El usuario Valentino Sandoval se unió al proyecto Proyecto 1', time: '4 days ago' },
      { id: 2, icon: 'pi pi-user-plus', iconClass: 'icon-info', text: 'El usuario Miembro Dos se unió al proyecto Proyecto 1', time: '4 days ago' },
      { id: 3, icon: 'pi pi-user-plus', iconClass: 'icon-info', text: 'El usuario Miembro Dos se unió al proyecto Proyecto 2', time: '4 days ago' },
      { id: 4, icon: 'pi pi-user-plus', iconClass: 'icon-info', text: 'El usuario Miembro Tres se unió al proyecto Proyecto 1', time: '3 days ago' },
      { id: 5, icon: 'pi pi-user-plus', iconClass: 'icon-info', text: 'El usuario Valentino Sandoval se unió al proyecto Proyecto 2', time: '1 hour ago' }
    ]
  }
}

const formatTimeAgo = (dateString) => {
  if (!dateString) return 'recently'
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now - date
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins} minutes ago`
  if (diffHours < 24) return `${diffHours} hours ago`
  return `${diffDays} days ago`
}

const goToTeam = () => {
  router.push({ name: 'team' })
}

onMounted(async () => {
  await loadProjects()
  await loadAllTasks()
  await loadNotifications()
})
</script>

<template>
  <div class="leader-dashboard">
    <div class="page-header">
      <h1 class="page-title">Welcome back, {{ leaderName }}!</h1>
      <p class="page-subtitle">AI-powered overview of your team's performance, risks and progress.</p>
    </div>

    <div class="kpi-grid">
      <div class="kpi-card">
        <div class="kpi-label">ACTIVE PROJECTS</div>
        <div class="kpi-value-wrapper">
          <span class="kpi-value">{{ stats.activeProjects }}</span>
          <span class="kpi-badge green">+{{ stats.newProjectsThisMonth }} this month</span>
        </div>
      </div>

      <div class="kpi-card">
        <div class="kpi-label">PENDING TASKS</div>
        <div class="kpi-value-wrapper">
          <span class="kpi-value">{{ stats.pendingTasks }}</span>
          <i class="pi pi-arrow-up trend-icon up"></i>
        </div>
      </div>

      <div class="kpi-card">
        <div class="kpi-label">OVERDUE TASKS</div>
        <div class="kpi-value-wrapper">
          <span class="kpi-value">{{ stats.overdueTasks }}</span>
          <span class="kpi-badge red">Action required</span>
        </div>
      </div>

      <div class="kpi-card">
        <div class="kpi-label">AVERAGE COMPLETION TIME</div>
        <div class="kpi-value-wrapper">
          <span class="kpi-value">{{ stats.avgTimePerTask }}d</span>
          <span class="kpi-suffix">per task</span>
        </div>
      </div>
    </div>

    <div class="analytics-section">
      <div class="analytics-header">
        <h2 class="analytics-title">Smart Analytics</h2>
        <div class="ai-badge">AI POWERED</div>
      </div>

      <div class="analytics-grid">
        <div class="section-card risk-card">
          <div class="card-header-row">
            <div class="card-title">
              <i class="pi pi-shield"></i>
              <span>AI Risk Assessment</span>
            </div>
            <button class="download-btn">
              <i class="pi pi-download"></i>
              Download Report
            </button>
          </div>
          <p class="card-description">Analysis of completed versus delayed tasks</p>

          <div class="metrics-row">
            <div class="metric">
              <div class="metric-label">PROBABILITY OF DELAY</div>
              <div class="metric-value red">{{ riskData.probabilityOfDelay }}%</div>
              <div class="progress-bar">
                <div class="progress-fill red" :style="{ width: riskData.probabilityOfDelay + '%' }"></div>
              </div>
            </div>
            <div class="metric">
              <div class="metric-label">OVERALL EFFICIENCY</div>
              <div class="metric-value green">{{ riskData.overallEfficiency }}%</div>
              <div class="progress-bar">
                <div class="progress-fill green" :style="{ width: riskData.overallEfficiency + '%' }"></div>
              </div>
            </div>
          </div>

          <div class="ai-recommendation">
            <i class="pi pi-microchip-ai"></i>
            <div class="recommendation-content">
              <div class="recommendation-title">AI Recommendation</div>
              <p class="recommendation-text">{{ aiRecommendation.text }}</p>
            </div>
          </div>
        </div>

        <div class="section-card performance-card">
          <div class="performance-header">
            <h3>Performance per Member</h3>
            <span class="performance-sub">Generate individual reports with AI suggestions</span>
          </div>

          <div class="members-list">
            <div v-for="member in teamPerformance" :key="member.id" class="member-row">
              <img :src="member.avatar" class="member-avatar" />
              <div class="member-info">
                <div class="member-name">{{ member.name }}</div>
                <div class="member-role">{{ member.role }}</div>
                <div class="member-performance" :class="member.performanceClass">
                  {{ member.performanceLabel }} ({{ member.score }}%)
                </div>
              </div>
              <button class="generate-report-btn">
                <i class="pi pi-chart-line"></i>
                Generate Report
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="bottom-grid">
      <div class="section-card activities-card">
        <div class="activities-header">
          <h3>Recent Activities</h3>
        </div>
        <div class="activities-grid">
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
          <h3>Active Team</h3>
          <div class="live-badge">{{ activeMembers.length }} LIVE</div>
          <button class="see-all-btn" @click="goToTeam">See all →</button>
        </div>
        <div class="active-members-list">
          <div v-for="member in activeMembers" :key="member.id" class="active-member-row">
            <div class="online-indicator"></div>
            <img :src="member.avatar" class="member-avatar-small" />
            <div class="member-details">
              <div class="member-name">{{ member.name }}</div>
              <div class="member-role">{{ member.role }}</div>
            </div>
            <button class="message-icon-btn">
              <i class="pi pi-comment"></i>
            </button>
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

.performance-header {
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

.members-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
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

  .generate-report-btn {
    width: 100%;
    justify-content: center;
  }
}
</style>