<script setup>
import { ref, onMounted, computed } from 'vue'
import TaskColumn from './TaskColumn.vue'
import { getTasksByProjectAndStatus, createTask as createTaskApi } from '@/services/task.service.js'
import { getProjectById } from '@/services/project.service.js'
import Button from 'primevue/button'
import { useStore } from 'vuex'
import { UserService } from '@/services/user.service.js'
import CreateTaskModal from './modals/CreateTaskModal.vue'

const props = defineProps({ id: { type: String, required: true } })

const store = useStore()
const userService = new UserService()
const currentUser = computed(() => store.state.user || JSON.parse(localStorage.getItem('user') || '{}'))
const isTeamMember = computed(() => {
  const roles = currentUser.value?.roles || []
  return roles.some(r => String(r).toUpperCase().includes('MEMBER'))
})
const isLeader = computed(() => {
  const roles = currentUser.value?.roles || []
  return roles.some(r => String(r).toUpperCase().includes('LEADER'))
})

const allTasks = ref([])
const loading = ref(false)
const projectDetails = ref(null)
const showCreateTaskModal = ref(false)
const projectMembers = ref([])
const activeMenuId = ref(null)

const project = computed(() => projectDetails.value || store.state.selectedProject)
const projectImageSrc = computed(() => {
  const image = project.value?.imageUrl
  return Array.isArray(image) ? image[0] : image
})

const backendToUiStatus = (s) => {
  if (!s) return 'To-Do'
  switch (s) {
    case 'TO_DO': return 'To-Do'
    case 'IN_PROGRESS': return 'In progress'
    case 'DONE': return 'Done'
    default: return s
  }
}

const fetchProjectMembers = async (projectId) => {
  try {
    const response = await userService.getAllUsers()
    const allUsers = Array.isArray(response) ? response : response?.data || []
    const members = allUsers.filter(user => {
      const roles = user.roles || []
      const isMember = roles.some(r => String(r).toUpperCase().includes('MEMBER'))
      const belongsToProject = user.projectIds?.includes(Number(projectId))
      return isMember && belongsToProject
    })
    projectMembers.value = members.map(m => ({
      id: m.id,
      name: `${m.name || ''} ${m.lastName || ''}`.trim() || m.email,
      imageUrl: m.imageUrl || null,
      email: m.email
    }))
  } catch (error) {
    console.error('Error fetching project members:', error)
    projectMembers.value = []
  }
}

const fetchTasks = async () => {
  loading.value = true
  try {
    const [todoTasks, inProgressTasks, doneTasks] = await Promise.all([
      getTasksByProjectAndStatus(props.id, 'TO_DO'),
      getTasksByProjectAndStatus(props.id, 'IN_PROGRESS'),
      getTasksByProjectAndStatus(props.id, 'DONE'),
    ])
    const mapTask = (t) => ({
      id: t.taskId,
      title: t.title,
      description: t.description,
      assigneeId: (Array.isArray(t.assignedUserIds) && t.assignedUserIds.length > 0) ? t.assignedUserIds[0] : null,
      assigneeName: null,
      due: t.endDate || t.dueDate || null,
      dueDate: t.endDate || t.dueDate || null,
      state: backendToUiStatus(t.status),
      raw: t
    })
    allTasks.value = [
      ...(Array.isArray(todoTasks) ? todoTasks.map(mapTask) : []),
      ...(Array.isArray(inProgressTasks) ? inProgressTasks.map(mapTask) : []),
      ...(Array.isArray(doneTasks) ? doneTasks.map(mapTask) : []),
    ]
  } catch (error) {
    console.error('Error fetching tasks:', error)
    allTasks.value = []
  } finally {
    loading.value = false
  }
}

const fetchProjectDetails = async () => {
  try {
    const data = await getProjectById(props.id)
    projectDetails.value = data
    if (store.state.selectedProject?.projectId === data?.projectId || store.state.selectedProject?.projectId === Number(props.id)) {
      store.commit('setSelectedProject', data)
    }
    await fetchProjectMembers(props.id)
  } catch (error) {
    console.error('Error loading project details:', error)
  }
}

const copyProjectCode = async (code) => {
  if (!code) return;
  await navigator.clipboard.writeText(String(code));
}

onMounted(async () => {
  await fetchProjectDetails()
  await fetchTasks()
})

const getTasksByState = (state) => {
  if (isTeamMember.value) {
    return allTasks.value.filter(task => task.state === state && task.assigneeId === currentUser.value.id)
  }
  return allTasks.value.filter(task => task.state === state)
}

const openCreateTaskModal = () => {
  showCreateTaskModal.value = true
}

const handleTaskCreated = () => {
  fetchTasks()
}

const handleUpdateAll = () => {
  fetchTasks()
}

const handleTaskMoved = (updatedTask) => {
  const index = allTasks.value.findIndex(t => t.id === updatedTask.id)
  if (index !== -1) {
    allTasks.value[index] = { ...allTasks.value[index], ...updatedTask }
  }
  allTasks.value = [...allTasks.value]
}

const handleOpenMenu = (taskId) => {
  activeMenuId.value = taskId
}

const handleCloseMenu = () => {
  activeMenuId.value = null
}
</script>

<template>
  <section class="board-bg">
    <div class="board-container">
      <header class="board-header">
        <div v-if="project" class="project-summary-card modern">
          <img v-if="projectImageSrc" :src="projectImageSrc" alt="Project image" class="project-summary-img" />
          <div class="project-summary-info">
            <div class="project-title-section">
              <h1 class="title-projects">{{ project.name }}</h1>
              <div v-if="isLeader" class="project-code-wrapper">
                <span class="code-label">Code:</span>
                <div class="code-box">
                  <span class="code-text">{{ project.key }}</span>
                  <button class="copy-btn" @click="copyProjectCode(project.key)">
                    <i class="pi pi-copy"></i>
                  </button>
                </div>
              </div>
            </div>
            <p class="project-summary-desc">{{ project.description }}</p>
          </div>
        </div>
        <div class="board-header-actions">
          <h3 class="subtitle">Tareas asignadas</h3>
          <Button v-if="isLeader" class="add-task modern" @click="openCreateTaskModal">
            <i class="pi pi-plus-circle" style="margin-right:0.5rem;"></i> Nueva tarea
          </Button>
        </div>
      </header>

      <CreateTaskModal
          v-model:visible="showCreateTaskModal"
          :projectId="Number(props.id)"
          :teamMembers="projectMembers"
          @taskCreated="handleTaskCreated"
      />

      <div v-if="loading" class="loader-modern">Cargando tareas...</div>
      <main v-else class="columns-board">
        <TaskColumn
            class="column-card"
            :tasks="getTasksByState('To-Do')"
            taskColumn="To-Do"
            :id="props.id"
            :reload="false"
            :teamMembers="projectMembers"
            :isLeader="isLeader"
            :currentUserId="currentUser.id"
            :activeMenuId="activeMenuId"
            @updAll="handleUpdateAll"
            @taskMoved="handleTaskMoved"
            @openMenu="handleOpenMenu"
            @closeMenu="handleCloseMenu"
        />
        <TaskColumn
            class="column-card"
            :tasks="getTasksByState('In progress')"
            taskColumn="In progress"
            :id="props.id"
            :reload="false"
            :teamMembers="projectMembers"
            :isLeader="isLeader"
            :currentUserId="currentUser.id"
            :activeMenuId="activeMenuId"
            @updAll="handleUpdateAll"
            @taskMoved="handleTaskMoved"
            @openMenu="handleOpenMenu"
            @closeMenu="handleCloseMenu"
        />
        <TaskColumn
            class="column-card"
            :tasks="getTasksByState('Done')"
            taskColumn="Done"
            :id="props.id"
            :reload="false"
            :teamMembers="projectMembers"
            :isLeader="isLeader"
            :currentUserId="currentUser.id"
            :activeMenuId="activeMenuId"
            @updAll="handleUpdateAll"
            @taskMoved="handleTaskMoved"
            @openMenu="handleOpenMenu"
            @closeMenu="handleCloseMenu"
        />
      </main>
    </div>
  </section>
</template>

<style scoped>
.board-bg {
  --brand-500: #b22222;
  --brand-600: #8f1c1c;
  min-height: 100vh;
  background: linear-gradient(120deg, #f8fafc 60%, #e6f7f1 100%);
}

.board-container {
  max-width: 1400px;
  margin: 0 auto;
}

.board-header {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  margin-bottom: 2.2rem;
}

.board-header-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 2rem;
  padding: 0 0.5rem;
}

.subtitle {
  font-family: 'Lora', serif;
  color: var(--brand-500);
  font-weight: 700;
  font-size: 1.35rem;
  margin: 0;
}

.project-summary-card.modern {
  display: flex;
  align-items: flex-start;
  gap: 2rem;
  background: #fff;
  border-radius: 1.5rem;
  box-shadow: 0 8px 32px 0 rgba(2,81,61,0.10);
  padding: 2rem 2.5rem 2rem 2rem;
  min-height: 180px;
  border: 1.5px solid #e3e8ee;
}

.project-summary-img {
  width: 120px;
  height: 120px;
  object-fit: cover;
  border-radius: 1.2rem;
  box-shadow: 0 2px 8px 0 rgba(2,81,61,0.10);
}

.project-summary-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.project-title-section {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 1rem;
}

.title-projects {
  font-family: 'Lora', serif !important;
  font-weight: 700 !important;
  letter-spacing: 1px;
  color: var(--brand-500);
  font-size: 2.2rem;
  margin-bottom: 0.2rem;
  margin: 0;
}

.project-summary-desc {
  color: #374151;
  font-size: 1.08rem;
  margin: 0.2rem 0 0.5rem 0;
}

.project-code-wrapper {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.code-label {
  font-weight: 600;
  color: #374151;
}

.code-box {
  display: inline-flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.35rem 0.6rem;
  border-radius: 20px;
  border: 2px solid #B80035;
  background: #fff;
}

.code-text {
  font-weight: 600;
  color: #374151;
}

.copy-btn {
  background: transparent;
  border: none;
  cursor: pointer;
  color: #B80035;
}

.add-task.modern {
  background: linear-gradient(135deg, var(--brand-500), #606e9bff);
  color: #fff;
  border-radius: 0.8rem;
  font-weight: 700;
  font-size: 1.08rem;
  padding: 0.7rem 1.7rem;
  border: none;
  cursor: pointer;
}

.columns-board {
  display: flex;
  justify-content: space-between;
  gap: 2.5rem;
  flex-wrap: wrap;
}

.column-card {
  flex: 1 1 0;
  min-width: 320px;
  max-width: 420px;
  background: #fff;
  border-radius: 1.2rem;
  box-shadow: 0 4px 16px 0 rgba(2,81,61,0.07);
  border: 1.5px solid #e3e8ee;
  padding: 1.2rem 1rem 1.5rem 1rem;
  min-height: 500px;
}

.loader-modern {
  text-align: center;
  margin: 2.5rem 0;
  color: var(--brand-600);
  font-size: 1.2rem;
  font-weight: 600;
}

@media (max-width: 1200px) {
  .columns-board {
    flex-direction: column;
    gap: 2rem;
  }

  .column-card {
    max-width: 98vw;
    min-width: 0;
  }
}

@media (max-width: 700px) {
  .project-summary-card.modern {
    flex-direction: column;
    align-items: center;
    padding: 1.2rem 0.7rem;
  }

  .project-summary-img {
    width: 90px;
    height: 90px;
  }

  .project-title-section {
    flex-direction: column;
    align-items: center;
    text-align: center;
  }
}
</style>