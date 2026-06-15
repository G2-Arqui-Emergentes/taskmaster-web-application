<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from "vue"
import { deleteTask, updateTask } from "@/services/task.service.js"
import { useToast } from "primevue/usetoast"
import EditTaskModal from "./modals/EditTaskModal.vue"
import DeleteTaskModal from "./modals/DeleteTaskModal.vue"

const props = defineProps({
  projectId: { type: String, required: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  assigned: { type: String, required: true },
  assignedID: { type: Number, required: true },
  due: { type: String, required: true },
  id: { type: Number, required: true },
  state: { type: String, required: true },
  teamMembers: { type: Array, default: () => [] },
  isLeader: { type: Boolean, default: false },
  currentUserId: { type: Number, default: null },
  activeMenuId: { type: Number, default: null }
})

const toast = useToast()
const emits = defineEmits(["taskDel", "taskMoved", "openMenu", "closeMenu"])

const showEditModal = ref(false)
const showDeleteModal = ref(false)
const isUpdating = ref(false)
const isMenuOpen = ref(false)
const menuContainer = ref(null)

watch(() => props.activeMenuId, (newVal) => {
  if (newVal !== props.id && isMenuOpen.value) {
    isMenuOpen.value = false
  }
})

const displayAssignee = computed(() => {
  const found = props.teamMembers.find((m) => m.id === props.assignedID)
  return found?.name || props.assigned || "Unassigned"
})

const formattedDueDate = computed(() => {
  if (!props.due) return "No date"
  const date = new Date(props.due)
  return date.toLocaleDateString('es-ES', { year: 'numeric', month: '2-digit', day: '2-digit' })
})

const getNewStateFromCheckbox = (currentState, isChecked) => {
  if (isChecked) {
    switch (currentState) {
      case 'To-Do': return 'In progress'
      case 'In progress': return 'Done'
      default: return currentState
    }
  } else {
    if (currentState === 'Done') {
      return 'To-Do'
    }
    return currentState
  }
}

const uiToBackendStatus = (state) => {
  switch (state) {
    case 'To-Do': return 'TO_DO'
    case 'In progress': return 'IN_PROGRESS'
    case 'Done': return 'DONE'
    default: return 'TO_DO'
  }
}

const isChecked = computed(() => props.state === 'Done')

const toggleMenu = (e) => {
  e.stopPropagation()
  isMenuOpen.value = !isMenuOpen.value
  if (isMenuOpen.value) {
    emits('openMenu', props.id)
  } else {
    emits('closeMenu')
  }
}

const closeMenu = () => {
  isMenuOpen.value = false
  emits('closeMenu')
}

const handleClickOutside = (e) => {
  if (menuContainer.value && !menuContainer.value.contains(e.target)) {
    closeMenu()
  }
}

const handleCheckboxChange = async (event) => {
  if (isUpdating.value) return
  isUpdating.value = true

  const isChecked_now = event.target.checked
  const newState = getNewStateFromCheckbox(props.state, isChecked_now)

  if (newState === props.state) {
    isUpdating.value = false
    return
  }

  const newBackendStatus = uiToBackendStatus(newState)

  try {
    const payload = {
      title: props.title,
      description: props.description,
      endDate: props.due ? new Date(props.due).toISOString() : new Date().toISOString(),
      status: newBackendStatus,
      priority: 'MEDIUM',
      assignedUserIds: [props.assignedID]
    }
    await updateTask(props.id, payload)
    emits("taskMoved", { ...props, state: newState })
    toast.add({ severity: 'success', summary: 'Success', detail: `Task moved to ${newState}`, life: 2000 })
  } catch (error) {
    console.error('Error updating task status:', error)
    toast.add({ severity: 'error', summary: 'Error', detail: 'Could not update task status', life: 3000 })
  } finally {
    isUpdating.value = false
  }
}

const openEditModal = () => {
  closeMenu()
  showEditModal.value = true
}

const openDeleteModal = () => {
  closeMenu()
  showDeleteModal.value = true
}

const handleTaskUpdated = () => {
  emits("taskDel")
}

const handleTaskDeleted = () => {
  emits("taskDel")
}

onMounted(() => document.addEventListener('click', handleClickOutside))
onUnmounted(() => document.removeEventListener('click', handleClickOutside))
</script>

<template>
  <div class="task-card" :class="{ 'done-task': state === 'Done' }">
    <div class="task-content">
      <div class="task-info">
        <h3 class="task-title">{{ title }}</h3>
        <p class="task-description" v-if="description">{{ description }}</p>
        <div class="task-meta">
          <span class="assignee">
            <i class="pi pi-user"></i> {{ displayAssignee }}
          </span>
          <span class="due-date">
            <i class="pi pi-calendar"></i> {{ formattedDueDate }}
          </span>
        </div>
      </div>

      <div class="task-actions">
        <div v-if="isLeader" class="menu-container" ref="menuContainer">
          <button class="menu-btn" @click="toggleMenu" aria-label="Task options">
            <i class="pi pi-ellipsis-h"></i>
          </button>
          <div v-if="isMenuOpen" class="dropdown-menu">
            <button class="dropdown-item edit" @click="openEditModal">
              <i class="pi pi-pencil"></i>
              Edit
            </button>
            <button class="dropdown-item delete" @click="openDeleteModal">
              <i class="pi pi-trash"></i>
              Delete
            </button>
          </div>
        </div>

        <label v-else class="checkbox-wrapper">
          <input
              type="checkbox"
              :checked="isChecked"
              @change="handleCheckboxChange"
              :disabled="isUpdating"
          />
          <span class="checkmark"></span>
        </label>
      </div>
    </div>
  </div>

  <EditTaskModal
      v-model:visible="showEditModal"
      :task="{
      id: props.id,
      title: props.title,
      description: props.description,
      assignedID: props.assignedID,
      due: props.due,
      priority: 'MEDIUM',
      projectId: props.projectId
    }"
      :teamMembers="props.teamMembers"
      @taskUpdated="handleTaskUpdated"
  />

  <DeleteTaskModal
      v-model:visible="showDeleteModal"
      :taskId="props.id"
      @taskDeleted="handleTaskDeleted"
  />
</template>

<style scoped>
.task-card {
  background: transparent;
  padding: 0.75rem 0;
}

.task-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
}

.task-info {
  flex: 1;
}

.task-title {
  font-family: 'Lora', serif;
  font-weight: 600;
  font-size: 1rem;
  color: #1a1a2e;
  margin: 0 0 0.25rem 0;
  letter-spacing: 0.3px;
}

.task-description {
  font-size: 0.8rem;
  color: #6b7280;
  margin: 0 0 0.5rem 0;
  line-height: 1.4;
}

.task-meta {
  display: flex;
  gap: 1rem;
  font-size: 0.7rem;
  color: #9ca3af;
}

.task-meta i {
  font-size: 0.65rem;
  margin-right: 0.2rem;
}

.assignee, .due-date {
  display: flex;
  align-items: center;
  gap: 0.2rem;
}

.done-task .task-title {
  text-decoration: line-through;
  opacity: 0.6;
}

.task-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-shrink: 0;
}

.menu-container {
  position: relative;
}

.menu-btn {
  background: transparent;
  border: none;
  padding: 0.25rem;
  cursor: pointer;
  border-radius: 4px;
  transition: background 0.2s;
}

.menu-btn i {
  color: #6b7280;
  font-size: 1.1rem;
}

.menu-btn:hover {
  background: #f3f4f6;
}

.menu-btn:hover i {
  color: #b22222;
}

.dropdown-menu {
  position: absolute;
  top: 100%;
  right: 0;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  min-width: 140px;
  margin-top: 0.5rem;
  overflow: hidden;
  z-index: 10;
}

.dropdown-item {
  width: 100%;
  padding: 0.6rem 1rem;
  border: none;
  background: none;
  text-align: left;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.85rem;
  transition: background 0.2s;
}

.dropdown-item:hover {
  background: #f0f0f0;
}

.dropdown-item.delete {
  color: #b22222;
  border-top: 1px solid #e5e7eb;
}

.dropdown-item.delete:hover {
  background: #fff5f5;
}

.dropdown-item.edit {
  color: #4b5563;
}

.checkbox-wrapper {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  cursor: pointer;
}

.checkbox-wrapper input {
  position: absolute;
  opacity: 0;
  cursor: pointer;
  height: 0;
  width: 0;
}

.checkmark {
  position: absolute;
  top: 0;
  left: 0;
  height: 18px;
  width: 18px;
  background-color: transparent;
  border: 2px solid #d1d5db;
  border-radius: 5px;
  transition: all 0.2s ease;
}

.checkbox-wrapper:hover .checkmark {
  border-color: #b22222;
}

.checkbox-wrapper input:checked ~ .checkmark {
  background-color: #b22222;
  border-color: #b22222;
}

.checkmark:after {
  content: "";
  position: absolute;
  display: none;
}

.checkbox-wrapper input:checked ~ .checkmark:after {
  display: block;
}

.checkbox-wrapper .checkmark:after {
  left: 5px;
  top: 1px;
  width: 4px;
  height: 8px;
  border: solid white;
  border-width: 0 2px 2px 0;
  transform: rotate(45deg);
}
</style>