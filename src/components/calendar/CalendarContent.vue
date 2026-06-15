<script>
import { getTasksByUserId, getTasksByProjectId } from '@/services/task.service.js'
import { getProjectsByMember, getProjectsByLeader, getProjectById } from '@/services/project.service.js'
import { UserService } from '@/services/user.service.js'

export default {
  name: 'CalendarContent',
  data() {
    return {
      currentDate: new Date(),
      selectedDateObj: new Date(),
      monthNames: [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
      ],
      dayNames: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
      allTasks: [],
      allProjects: [],
      allUsers: [],
      loading: false,
      userService: new UserService()
    }
  },
  async mounted() {
    this.selectedDateObj = new Date()
    await this.loadAllData()
  },
  computed: {
    user() {
      return this.$store.state.user || JSON.parse(localStorage.getItem('user') || '{}')
    },

    isLeader() {
      const roles = this.user.roles || []
      return roles.some(r => r === 'ROLE_LEADER')
    },

    currentMonthYear() {
      return `${this.monthNames[this.currentDate.getMonth()]} ${this.currentDate.getFullYear()}`
    },

    selectedDate() {
      return {
        day: this.selectedDateObj.getDate(),
        monthYear: `${this.monthNames[this.selectedDateObj.getMonth()]} ${this.selectedDateObj.getFullYear()}`,
        dayName: this.dayNames[this.selectedDateObj.getDay()]
      }
    },

    calendarWeeks() {
      const year = this.currentDate.getFullYear()
      const month = this.currentDate.getMonth()
      const firstDay = new Date(year, month, 1)
      const startDate = new Date(firstDay)
      startDate.setDate(startDate.getDate() - firstDay.getDay())

      const weeks = []
      let currentWeek = []
      let weekNumber = this.getWeekNumber(startDate)

      for (let i = 0; i < 42; i++) {
        const date = new Date(startDate)
        date.setDate(startDate.getDate() + i)

        currentWeek.push({
          date: date.toISOString().split('T')[0],
          day: date.getDate(),
          isCurrentMonth: date.getMonth() === month,
          fullDate: new Date(date)
        })

        if (currentWeek.length === 7) {
          weeks.push({
            weekNumber: weekNumber,
            days: currentWeek
          })
          currentWeek = []
          weekNumber++
        }
      }

      return weeks.slice(0, 6)
    },

    formatSelectedDate() {
      const date = this.selectedDateObj
      const dayName = this.dayNames[date.getDay()]
      const monthName = this.monthNames[date.getMonth()]
      const day = date.getDate()
      const year = date.getFullYear()
      const ordinal = this.getDayOrdinal(day)

      return `${dayName}, ${monthName} ${day}${ordinal}, ${year}`
    },

    selectedDateTasks() {
      const selectedDate = this.selectedDateObj.toISOString().split('T')[0]

      return this.allTasks.filter(task => {
        if (!task.endDate) return false
        const taskDate = task.endDate.split('T')[0]
        return taskDate === selectedDate
      })
    }
  },
  methods: {
    async loadAllData() {
      this.loading = true
      try {
        await this.loadAllUsers()

        await this.loadUserProjects()

        await this.loadTasksByRole()

        console.log('Calendario cargado:', {
          role: this.isLeader ? 'LEADER' : 'MEMBER',
          projects: this.allProjects.length,
          tasks: this.allTasks.length
        })
      } catch (error) {
        console.error('Error loading calendar data:', error)
      } finally {
        this.loading = false
      }
    },

    async loadAllUsers() {
      try {
        const response = await this.userService.getAllUsers()
        this.allUsers = Array.isArray(response) ? response : response?.data || []
        console.log('Usuarios cargados:', this.allUsers.length)
      } catch (error) {
        console.error('Error loading users:', error)
        this.allUsers = []
      }
    },

    async loadUserProjects() {
      try {
        const user = this.user
        const roles = user.roles || []
        const isLeader = roles.some(r => r === 'ROLE_LEADER')

        let projects = []
        if (isLeader) {
          projects = await getProjectsByLeader()
        } else {
          projects = await getProjectsByMember()
        }

        this.allProjects = Array.isArray(projects) ? projects : []
        console.log('Proyectos cargados:', this.allProjects.length)
      } catch (error) {
        console.error('Error loading projects:', error)
        this.allProjects = []
      }
    },

    async loadTasksByRole() {
      const isLeader = this.isLeader
      const userId = this.user.id

      if (!userId) {
        console.warn('No user ID found')
        this.allTasks = []
        return
      }

      try {
        let tasks = []

        if (isLeader) {
          console.log('Cargando tareas como LÍDER...')

          for (const project of this.allProjects) {
            try {
              const projectTasks = await getTasksByProjectId(project.projectId)
              if (Array.isArray(projectTasks)) {
                tasks.push(...projectTasks)
              }
            } catch (error) {
              console.error(`Error loading tasks for project ${project.projectId}:`, error)
            }
          }
        } else {
          console.log('Cargando tareas como MIEMBRO...')
          tasks = await getTasksByUserId(userId)
        }

        this.allTasks = Array.isArray(tasks) ? tasks : []
        console.log(`Tareas cargadas (${isLeader ? 'LÍDER' : 'MIEMBRO'}):`, this.allTasks.length)
      } catch (error) {
        console.error('Error loading tasks by role:', error)
        this.allTasks = []
      }
    },

    getProjectName(projectId) {
      if (!projectId) return 'Unknown'
      const project = this.allProjects.find(p => p.projectId === projectId)
      return project ? project.name : `Project ${projectId}`
    },

    getAssigneeName(assignedUserIds) {
      if (!assignedUserIds || assignedUserIds.length === 0) {
        return 'Unassigned'
      }

      const userId = assignedUserIds[0]
      const user = this.allUsers.find(u => u.id === userId)

      if (user) {
        const name = `${user.name || ''} ${user.lastName || ''}`.trim()
        return name || user.email || `User ${userId}`
      }

      return `User ${userId}`
    },

    hasTasksOnDate(date) {
      return this.allTasks.some(task => {
        if (!task.endDate) return false
        const taskDate = task.endDate.split('T')[0]
        return taskDate === date
      })
    },

    previousMonth() {
      this.currentDate = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth() - 1, 1)
    },

    nextMonth() {
      this.currentDate = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth() + 1, 1)
    },

    selectDate(day) {
      this.selectedDateObj = new Date(day.fullDate)
      console.log('Selected date:', this.selectedDateObj.toISOString().split('T')[0])
      console.log('Tasks for this date:', this.selectedDateTasks.length)
    },

    isSelected(day) {
      return day.date === this.selectedDateObj.toISOString().split('T')[0]
    },

    isToday(day) {
      const today = new Date().toISOString().split('T')[0]
      return day.date === today
    },

    getWeekNumber(date) {
      const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
      const dayNum = d.getUTCDay() || 7
      d.setUTCDate(d.getUTCDate() + 4 - dayNum)
      const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
      return Math.ceil((((d - yearStart) / 86400000) + 1) / 7)
    },

    getDayOrdinal(day) {
      if (day > 3 && day < 21) return 'th'
      switch (day % 10) {
        case 1: return 'st'
        case 2: return 'nd'
        case 3: return 'rd'
        default: return 'th'
      }
    },

    getTaskStateClass(status) {
      const stateClasses = {
        'TO_DO': 'task-todo',
        'IN_PROGRESS': 'task-inprogress',
        'DONE': 'task-done'
      }
      return stateClasses[status] || 'task-default'
    },

    getStatusColorClass(status) {
      const colorClasses = {
        'TO_DO': 'status-todo',
        'IN_PROGRESS': 'status-inprogress',
        'DONE': 'status-done'
      }
      return colorClasses[status] || 'status-default'
    },

    getStatusText(status) {
      const statusTexts = {
        'TO_DO': 'To Do',
        'IN_PROGRESS': 'In Progress',
        'DONE': 'Done'
      }
      return statusTexts[status] || status
    },

    formatTaskDate(dateString) {
      if (!dateString) return 'No date'
      const date = new Date(dateString)
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      })
    }
  }
}
</script>

<template>
  <div class="calendar-page">

    <div class="page-header">
      <h1 class="title-projects text-4xl font-medium">Calendar</h1>
      <p class="calendar-subtitle">Manage your tasks deadlines</p>
    </div>

    <div class="calendar-container">
      <div class="calendar-section">
        <div class="calendar-widget">
          <div class="calendar-navigation">
            <button class="nav-button" @click="previousMonth">&lt;</button>
            <h2 class="month-year">{{ currentMonthYear }}</h2>
            <button class="nav-button" @click="nextMonth">&gt;</button>
          </div>

          <div class="calendar-grid">
            <div class="weekdays">
              <div class="weekday">Wk</div>
              <div class="weekday">Su</div>
              <div class="weekday">Mo</div>
              <div class="weekday">Tu</div>
              <div class="weekday">We</div>
              <div class="weekday">Th</div>
              <div class="weekday">Fr</div>
              <div class="weekday">Sa</div>
            </div>

            <div class="calendar-body">
              <div v-for="week in calendarWeeks" :key="week.weekNumber" class="calendar-week">
                <div class="week-number">{{ week.weekNumber }}</div>
                <div v-for="day in week.days" :key="day.date" class="calendar-day" :class="{
                  'selected': isSelected(day),
                  'today': isToday(day),
                  'other-month': !day.isCurrentMonth,
                  'has-tasks': hasTasksOnDate(day.date)
                }" @click="selectDate(day)">
                  {{ day.day }}
                  <div v-if="hasTasksOnDate(day.date)" class="task-indicator">
                    <span class="task-dot"></span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="events-section mt-4">
          <div class="events-header">
            <h3 class="events-title">Tasks for {{ formatSelectedDate }}</h3>
          </div>

          <div v-if="selectedDateTasks.length > 0" class="tasks-list">
            <div v-for="task in selectedDateTasks" :key="task.taskId" class="task-card"
                 :class="getTaskStateClass(task.status)">
              <div class="task-header">
                <div class="task-status" :class="getStatusColorClass(task.status)">
                  {{ getStatusText(task.status) }}
                </div>
                <div class="task-date">
                  Due: {{ formatTaskDate(task.endDate) }}
                </div>
              </div>

              <div class="task-content">
                <h4 class="task-title">{{ task.title }}</h4>
                <p class="task-description">{{ task.description || 'No description' }}</p>

                <div class="task-project">
                  <i class="pi pi-folder"></i>
                  <span>Project: {{ getProjectName(task.projectId) }}</span>
                </div>

                <div v-if="isLeader" class="task-assignee">
                  <i class="pi pi-user"></i>
                  <span>Assigned to: {{ getAssigneeName(task.assignedUserIds) }}</span>
                </div>
              </div>
            </div>
          </div>

          <div v-else class="no-events">
            <span class="no-events-icon">📋</span>
            <p>No tasks scheduled for this date</p>
          </div>
        </div>
      </div>

      <div class="sidebar">
        <div class="selected-date-card">
          <h3 class="card-title">Selected Date</h3>
          <div class="selected-date-info">
            <div class="date-number">{{ selectedDate.day }}</div>
            <div class="date-details">
              <div class="month-year-text">{{ selectedDate.monthYear }}</div>
              <div class="day-name">{{ selectedDate.dayName }}</div>
            </div>
          </div>
        </div>

        <div class="quick-actions-section">
          <div class="quick-actions-header">
            <h3 class="quick-actions-title">Quick information</h3>
          </div>
          <div class="task-info-content">
            <div class="info-item">
              <div class="info-icon">
                <i class="pi pi-eye" style="color: #6b7280; font-size: 1.125rem;"></i>
              </div>
              <p>You can view tasks directly on the calendar</p>
            </div>
            <div class="info-item">
              <div class="info-icon">
                <i class="pi pi-circle-fill" style="color: #dc2626; font-size: 1rem;"></i>
              </div>
              <p>Red dots indicate dates with tasks deadlines</p>
            </div>
            <div class="info-item">
              <div class="info-icon">
                <i class="pi pi-calendar" style="color: #6b7280; font-size: 1.125rem;"></i>
              </div>
              <p>Navigate between dates to view pending tasks</p>
            </div>
            <div class="info-item">
              <div class="info-icon">
                <i class="pi pi-info-circle" style="color: #6b7280; font-size: 1.125rem;"></i>
              </div>
              <p>Click on any date to see tasks due that day</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.title-projects {
  font-family: 'Lora', serif;
  color: #b22222;
  font-weight: 600 !important;
  letter-spacing: 1.05px;
  margin-bottom: 16px;
}

.calendar-page {
  --brand-500: #b22222;
  --brand-600: #8f1c1c;
  --brand-100: rgba(178, 34, 34, 0.1);
  --brand-50: rgba(178, 34, 34, 0.05);
  min-height: 100vh;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.page-header {
  margin-bottom: 2rem;
}

.calendar-subtitle {
  color: var(--brand-600);
  opacity: 0.7;
  margin: 0;
  font-size: 1.1rem;
}

.calendar-container {
  display: flex;
  gap: 2rem;
  align-items: flex-start;
}

.calendar-section {
  flex: 1;
}

.calendar-widget {
  background: white;
  border-radius: 1rem;
  padding: 1.5rem;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  border: 1px solid #e5e7eb;
}

.calendar-navigation {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid #e5e7eb;
}

.nav-button {
  background: #f3f4f6;
  border: 1px solid #d1d5db;
  color: #374151;
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 0.5rem;
  cursor: pointer;
  font-size: 1rem;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.nav-button:hover {
  background: #e5e7eb;
  border-color: #9ca3af;
}

.month-year {
  font-size: 1.5rem;
  font-weight: 600;
  margin: 0;
  color: #1f2937;
}

.calendar-grid {
  width: 100%;
}

.weekdays {
  display: grid;
  grid-template-columns: 2.5rem repeat(7, 1fr);
  gap: 0.25rem;
  margin-bottom: 0.5rem;
}

.weekday {
  text-align: center;
  font-weight: 500;
  padding: 0.5rem 0.25rem;
  font-size: 0.875rem;
  color: #6b7280;
}

.calendar-body {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.calendar-week {
  display: grid;
  grid-template-columns: 2.5rem repeat(7, 1fr);
  gap: 0.25rem;
}

.week-number {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  color: #9ca3af;
  font-weight: 500;
}

.calendar-day {
  height: 2.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 0.375rem;
  cursor: pointer;
  transition: all 0.2s;
  font-weight: 500;
  color: #374151;
  font-size: 0.875rem;
  position: relative;
}

.calendar-day:hover {
  background: #f3f4f6;
}

.calendar-day.other-month {
  color: #d1d5db;
}

.calendar-day.selected {
  background: var(--brand-500);
  color: white;
  font-weight: 600;
}

.calendar-day.today {
  background: var(--brand-600);
  color: white;
  font-weight: 600;
}

.calendar-day.has-tasks {
  font-weight: 600;
}

.task-indicator {
  position: absolute;
  bottom: 2px;
  right: 2px;
}

.task-dot {
  width: 6px;
  height: 6px;
  background-color: #dc2626 !important;
  border-radius: 50%;
  display: block;
  box-shadow: 0 0 0 1px white;
}

.calendar-day.selected .task-dot,
.calendar-day.today .task-dot {
  background-color: #fbbf24;
  box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.8);
}

.sidebar {
  min-width: 400px;
  width: 400px;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.selected-date-card {
  background: linear-gradient(135deg, var(--brand-500), #606e9bff);
  border-radius: 1rem;
  padding: 1.5rem;
  color: white;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
}

.card-title {
  font-size: 1.1rem;
  font-weight: 600;
  margin: 0 0 1rem 0;
  opacity: 0.9;
}

.selected-date-info {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.date-number {
  font-size: 3rem;
  font-weight: bold;
  line-height: 1;
}

.date-details {
  flex: 1;
}

.month-year-text {
  font-size: 1.1rem;
  font-weight: 600;
  margin-bottom: 0.25rem;
}

.day-name {
  font-size: 0.9rem;
  opacity: 0.8;
}

.events-section {
  background: white;
  border-radius: 1rem;
  padding: 1.5rem;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  border: 1px solid #e5e7eb;
}

.events-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
}

.events-title {
  font-size: 1.1rem;
  font-weight: 600;
  margin: 0;
  color: #374151;
}

.no-events {
  text-align: center;
  padding: 1.5rem 0;
  color: #9ca3af;
}

.no-events-icon {
  font-size: 2.5rem;
  margin-bottom: 0.75rem;
  opacity: 0.5;
}

.no-events p {
  margin: 0;
  font-size: 0.9rem;
}

.quick-actions-section {
  background: white;
  border-radius: 1rem;
  padding: 1.5rem;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  border: 1px solid #e5e7eb;
}

.quick-actions-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 1.25rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid #f3f4f6;
}

.quick-actions-title {
  font-size: 1.1rem;
  font-weight: 600;
  margin: 0;
  color: #374151;
}

.task-info-content {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.info-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.75rem;
  transition: background-color 0.2s ease;
}

.info-item:hover {
  background-color: #f9fafb;
}

.info-icon {
  font-size: 1.125rem;
  flex-shrink: 0;
  margin-top: 0.125rem;
  align-self: flex-start;
}

.info-item p {
  margin: 0;
  font-size: 0.875rem;
  color: #6b7280;
  line-height: 1.5;
  font-weight: 400;
}

.tasks-list {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  margin-bottom: 1.5rem;
  max-height: 400px;
  overflow-y: auto;
}

.task-card {
  flex: 1 1 calc(33.333% - 1rem);
  background: white;
  border-radius: 0.75rem;
  padding: 1.25rem;
  border-left: 4px solid;
  transition: all 0.2s ease;
  border: 1px solid #e5e7eb;
}

.task-todo {
  border-left-color: #f59e0b;
  background: linear-gradient(to right, #fef3c7, rgb(255, 235, 125));
}

.task-inprogress {
  border-left-color: #3b82f6;
  background: linear-gradient(to right, #dbeafe, #bfdbfe);
}

.task-done {
  border-left-color: #10b981;
  background: linear-gradient(to right, #d1fae5, white);
}

.task-default {
  border-left-color: #6b7280;
  background: linear-gradient(to right, #f3f4f6, white);
}

.task-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.task-status {
  padding: 0.25rem 0.75rem;
  border-radius: 1rem;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.status-todo {
  background: #fef3c7;
  color: #92400e;
}

.status-inprogress {
  background: #dbeafe;
  color: #1e40af;
}

.status-done {
  background: #d1fae5;
  color: #065f46;
}

.status-default {
  background: #f3f4f6;
  color: #374151;
}

.task-date {
  font-size: 0.875rem;
  color: #6b7280;
  font-weight: 500;
}

.task-title {
  font-size: 1.125rem;
  font-weight: 600;
  color: #1f2937;
  margin: 0 0 0.5rem 0;
  line-height: 1.4;
}

.task-description {
  font-size: 0.875rem;
  color: #6b7280;
  margin: 0 0 0.75rem 0;
  line-height: 1.5;
}

.task-project {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.75rem;
  color: #6b7280;
  padding-top: 0.5rem;
  border-top: 1px solid rgba(0, 0, 0, 0.05);
}

.task-assignee {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.75rem;
  color: #6b7280;
  margin-top: 0.5rem;
}

.task-project i,
.task-assignee i {
  font-size: 0.7rem;
}

.tasks-list::-webkit-scrollbar {
  width: 4px;
}

.tasks-list::-webkit-scrollbar-track {
  background: #f1f5f9;
  border-radius: 2px;
}

.tasks-list::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 2px;
}

@media (max-width: 1024px) {
  .calendar-container {
    flex-direction: column;
  }

  .sidebar {
    min-width: unset;
    width: 100%;
  }

  .calendar-page {
    padding: 1rem;
  }
}

@media (max-width: 768px) {
  .task-card {
    padding: 1rem;
  }

  .task-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }
}
</style>