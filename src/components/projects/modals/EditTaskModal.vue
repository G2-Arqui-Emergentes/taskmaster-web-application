<script setup>
import { ref, watch, computed, nextTick, onMounted, onUnmounted } from 'vue'
import Calendar from 'primevue/calendar'
import { updateTask as updateTaskApi } from "@/services/task.service.js"
import { useToast } from "primevue/usetoast"

const props = defineProps({
  visible: { type: Boolean, default: false },
  task: Object,
  teamMembers: { type: Array, default: () => [] },
  onUpdated: Function
})
const emit = defineEmits(['update:visible', 'taskUpdated'])
const toast = useToast()

const defaultAvatar = 'https://static.vecteezy.com/system/resources/previews/009/292/244/non_2x/default-avatar-icon-of-social-media-user-vector.jpg'

const form = ref({
  title: '',
  description: '',
  priority: 'MEDIUM',
  endDate: null,
  assignedID: null
})

const errors = ref([])
const loading = ref(false)
const priorityDropdownOpen = ref(false)
const memberDropdownOpen = ref(false)
const titleInput = ref(null)

const priorityOptions = [
  { label: 'HIGH', value: 'HIGH' },
  { label: 'MEDIUM', value: 'MEDIUM' },
  { label: 'LOW', value: 'LOW' }
]

const selectedMember = computed(() => {
  if (!form.value.assignedID) return null
  return props.teamMembers.find(m => m.id === form.value.assignedID)
})

const getPriorityLabel = (value) => {
  const option = priorityOptions.find(o => o.value === value)
  return option ? option.label : 'Select priority'
}

const togglePriorityDropdown = () => {
  priorityDropdownOpen.value = !priorityDropdownOpen.value
  memberDropdownOpen.value = false
}

const toggleMemberDropdown = () => {
  memberDropdownOpen.value = !memberDropdownOpen.value
  priorityDropdownOpen.value = false
}

const selectPriority = (value) => {
  form.value.priority = value
  priorityDropdownOpen.value = false
}

const selectMember = (member) => {
  form.value.assignedID = member.id
  memberDropdownOpen.value = false
}

const closeDropdowns = () => {
  priorityDropdownOpen.value = false
  memberDropdownOpen.value = false
}

const onClose = () => {
  closeDropdowns()
  resetForm()
  emit('update:visible', false)
}

const validateForm = () => {
  errors.value = []
  if (!form.value.title?.trim()) errors.value.push('Title is required')
  if (!form.value.assignedID) errors.value.push('Please select a team member')
  if (!form.value.endDate) errors.value.push('End date is required')
  return errors.value.length === 0
}

const handleUpdateTask = async () => {
  if (!validateForm()) return

  loading.value = true
  try {
    const taskData = {
      title: form.value.title.trim(),
      description: form.value.description.trim(),
      endDate: new Date(form.value.endDate).toISOString(),
      status: 'TO_DO',
      priority: form.value.priority,
      assignedUserIds: [form.value.assignedID]
    }
    await updateTaskApi(props.task.id, taskData)
    toast.add({ severity: 'success', summary: 'Success', detail: 'Task updated successfully', life: 3000 })
    onClose()
    if (props.onUpdated) props.onUpdated()
    emit('taskUpdated')
  } catch (error) {
    console.error('Error updating task:', error)
    toast.add({ severity: 'error', summary: 'Error', detail: 'Could not update task', life: 3000 })
    errors.value = ['Error updating task. Please try again.']
  } finally {
    loading.value = false
  }
}

const resetForm = () => {
  form.value = {
    title: '',
    description: '',
    priority: 'MEDIUM',
    endDate: null,
    assignedID: null
  }
  errors.value = []
}

const handleClickOutside = (event) => {
  const prioritySelect = document.querySelector('.custom-select:has(.priority-dropdown)')
  const memberSelect = document.querySelector('.custom-select:has(.members-dropdown)')

  if (priorityDropdownOpen.value && prioritySelect && !prioritySelect.contains(event.target)) {
    priorityDropdownOpen.value = false
  }
  if (memberDropdownOpen.value && memberSelect && !memberSelect.contains(event.target)) {
    memberDropdownOpen.value = false
  }
}

const preventBodyScroll = (shouldPrevent) => {
  if (shouldPrevent) {
    document.body.style.overflow = 'hidden'
  } else {
    document.body.style.overflow = ''
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
  preventBodyScroll(false)
})

watch(() => props.visible, (val) => {
  if (val && props.task) {
    resetForm()
    preventBodyScroll(true)
    form.value = {
      title: props.task.title || '',
      description: props.task.description || '',
      priority: props.task.priority || 'MEDIUM',
      endDate: props.task.due ? new Date(props.task.due) : null,
      assignedID: props.task.assignedID || null
    }
    errors.value = []
    nextTick(() => {
      titleInput.value?.focus()
    })
  } else {
    closeDropdowns()
    preventBodyScroll(false)
  }
})
</script>

<template>
  <div v-if="visible" class="modal-overlay" @click.self="onClose">
    <div class="modal-box">
      <div class="modal-header">
        <h2 class="modal-title">Edit Task</h2>
        <button class="modal-close" @click="onClose"><i class="pi pi-times"></i></button>
      </div>

      <div class="modal-body">
        <div v-if="errors.length" class="error-list">
          <b>Please correct the following error(s):</b>
          <ul>
            <li v-for="error in errors" :key="error">{{ error }}</li>
          </ul>
        </div>

        <div class="form-group">
          <label class="form-label">Name <span class="required">*</span></label>
          <input
              type="text"
              ref="titleInput"
              class="form-input"
              v-model="form.title"
              placeholder="Enter task name"
          />
        </div>

        <div class="form-group">
          <label class="form-label">Description</label>
          <textarea
              class="form-input textarea"
              v-model="form.description"
              rows="3"
              placeholder="Describe your task..."
          ></textarea>
        </div>

        <div class="form-row">
          <div class="form-group half">
            <label class="form-label">Priority <span class="required">*</span></label>
            <div class="custom-select" @click="togglePriorityDropdown">
              <div class="select-trigger">
                <span>{{ getPriorityLabel(form.priority) }}</span>
                <i class="pi pi-chevron-down" :class="{ rotated: priorityDropdownOpen }"></i>
              </div>
              <div v-if="priorityDropdownOpen" class="select-dropdown priority-dropdown">
                <div
                    v-for="option in priorityOptions"
                    :key="option.value"
                    class="select-option"
                    :class="{ active: form.priority === option.value }"
                    @click.stop="selectPriority(option.value)"
                >
                  <span>{{ option.label }}</span>
                  <i v-if="form.priority === option.value" class="pi pi-check"></i>
                </div>
              </div>
            </div>
          </div>

          <div class="form-group half">
            <label class="form-label">End Date <span class="required">*</span></label>
            <div class="custom-date-wrapper">
              <Calendar
                  v-model="form.endDate"
                  class="form-input calendar-input"
                  showIcon
                  dateFormat="yy-mm-dd"
                  placeholder="Select end date"
                  :appendTo="'self'"
              />
            </div>
          </div>
        </div>

        <div class="form-group half-width">
          <label class="form-label">Assigned To <span class="required">*</span></label>
          <div class="custom-select" @click="toggleMemberDropdown">
            <div class="select-trigger">
              <div class="selected-member" v-if="selectedMember">
                <img :src="selectedMember.imageUrl || defaultAvatar" class="member-avatar-small" />
                <span>{{ selectedMember.name }}</span>
              </div>
              <span v-else>Select team member</span>
              <i class="pi pi-chevron-down" :class="{ rotated: memberDropdownOpen }"></i>
            </div>
            <div v-if="memberDropdownOpen" class="select-dropdown members-dropdown">
              <div
                  v-for="member in props.teamMembers"
                  :key="member.id"
                  class="select-option member-option"
                  :class="{ active: form.assignedID === member.id }"
                  @click.stop="selectMember(member)"
              >
                <img :src="member.imageUrl || defaultAvatar" class="member-avatar" />
                <span>{{ member.name }}</span>
                <i v-if="form.assignedID === member.id" class="pi pi-check"></i>
              </div>
              <div v-if="props.teamMembers.length === 0" class="select-option empty">
                <span>No team members available</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="modal-footer">
        <button type="button" class="btn-edit" @click="handleUpdateTask" :disabled="loading">
          <i v-if="loading" class="pi pi-spin pi-spinner"></i>
          <span v-else>Edit</span>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-box {
  background: #fff;
  border-radius: 18px;
  width: 90%;
  max-width: 560px;
  display: flex;
  flex-direction: column;
  overflow: visible;
}

.modal-header {
  padding: 1.5rem 1.5rem 0.75rem;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-shrink: 0;
}

.modal-title {
  font-family: 'Lora', serif;
  color: #000000;
  font-size: 1.5rem;
  font-weight: 700;
  margin: 0;
  text-align: center;
  flex: 1;
}

.modal-close {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 1.25rem;
  color: #b22222;
  transition: opacity 0.2s;
}

.modal-close:hover {
  opacity: 0.7;
}

.modal-body {
  padding: 1.25rem 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.875rem;
  position: relative;
}

.modal-footer {
  padding: 1rem 1.5rem 1.5rem;
  border-top: 1px solid #e5e7eb;
  display: flex;
  justify-content: center;
  flex-shrink: 0;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.form-group.half-width {
  width: calc(50% - 0.5rem);
}

.form-row {
  display: flex;
  gap: 1rem;
}

.half {
  flex: 1;
}

.form-label {
  font-weight: 600;
  color: #1a1a2e;
  font-size: 0.8rem;
}

.required {
  color: #b22222;
}

.form-input {
  border-radius: 8px;
  border: 1.5px solid #d1d5db;
  padding: 0.6rem 0.875rem;
  font-size: 0.875rem;
  outline: none;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.form-input:focus {
  border-color: #b22222;
  box-shadow: 0 0 0 2px rgba(178, 34, 34, 0.1);
}

.textarea {
  min-height: 70px;
  resize: vertical;
  font-family: inherit;
}

.custom-select {
  position: relative;
  width: 100%;
}

.select-trigger {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.6rem 0.875rem;
  border: 1.5px solid #d1d5db;
  border-radius: 8px;
  background: white;
  cursor: pointer;
  font-size: 0.875rem;
  transition: all 0.2s;
}

.select-trigger:hover {
  border-color: #b22222;
}

.select-trigger i {
  color: #9ca3af;
  transition: transform 0.2s;
}

.select-trigger i.rotated {
  transform: rotate(180deg);
}

.select-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  margin-top: 0.25rem;
  background: white;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  max-height: 180px;
  overflow-y: auto;
}

.priority-dropdown {
  max-height: 130px;
}

.members-dropdown {
  max-height: 200px;
}

.select-option {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.6rem 0.875rem;
  cursor: pointer;
  transition: background 0.2s;
  font-size: 0.875rem;
}

.select-option:hover {
  background: #fef5f5;
}

.select-option.active {
  background: #fef5f5;
  color: #b22222;
}

.select-option i {
  color: #b22222;
}

.select-option.empty {
  justify-content: center;
  color: #9ca3af;
  cursor: default;
}

.select-option.empty:hover {
  background: transparent;
}

.custom-date-wrapper {
  position: relative;
  width: 100%;
}

.calendar-input {
  width: 100%;
}

:deep(.calendar-input .p-inputtext) {
  width: 100%;
  border: none;
  padding: 0;
}

:deep(.calendar-input .p-datepicker-trigger) {
  color: #b22222;
}

:deep(.p-datepicker) {
  position: absolute !important;
  z-index: 1000 !important;
}

.selected-member {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.member-avatar-small {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  object-fit: cover;
}

.member-option {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.member-avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  object-fit: cover;
}

.error-list {
  color: #b91c1c;
  background: #fee2e2;
  border-radius: 8px;
  padding: 0.5rem 0.875rem;
  font-size: 0.8rem;
}

.error-list ul {
  margin: 0.25rem 0 0 1.25rem;
}

.btn-edit {
  padding: 0.6rem 1.75rem;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  background: #B80035;
  border: none;
  color: white;
  min-width: 100px;
}

.btn-edit:hover:not(:disabled) {
  background: #8f0028;
  transform: translateY(-1px);
}

.btn-edit:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

@media (max-width: 640px) {
  .modal-box {
    max-width: 95%;
  }

  .modal-header {
    padding: 1rem 1rem 0.5rem;
  }

  .modal-title {
    font-size: 1.25rem;
  }

  .modal-body {
    padding: 1rem;
  }

  .modal-footer {
    padding: 0.75rem 1rem 1rem;
  }

  .form-row {
    flex-direction: column;
    gap: 0.75rem;
  }

  .form-group.half-width {
    width: 100%;
  }
}
</style>