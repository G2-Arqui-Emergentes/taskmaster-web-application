<script setup>
import { computed } from 'vue'

const props = defineProps({
  modalType: {
    type: String,
    required: true
  }
})

const emit = defineEmits(['close'])

const modalInfo = {
  budget: {
    title: 'Budget Overview',
    description: 'Shows total project budget, current completion percentage based on tasks, and project status.',
    icon: 'pi pi-dollar'
  },
  workload: {
    title: 'Team Workload',
    description: 'Distribution of tasks across team members. Helps identify who has too many or too few assignments.',
    icon: 'pi pi-users'
  },
  health: {
    title: 'Project Health',
    description: 'Task status distribution (To-Do, In Progress, Done). Higher percentage of Done tasks means healthier project.',
    icon: 'pi pi-heart'
  },
  priority: {
    title: 'Priority Distribution',
    description: 'Percentage breakdown of tasks by priority (Low, Medium, High). Helps manage critical tasks.',
    icon: 'pi pi-chart-bar'
  },
  timeline: {
    title: 'Weekly Progress',
    description: 'Tracks number of tasks completed per week. Shows project momentum over time.',
    icon: 'pi pi-calendar'
  }
}

const modalTitle = computed(() => modalInfo[props.modalType]?.title || 'Information')
const modalDescription = computed(() => modalInfo[props.modalType]?.description || 'Data is automatically calculated from your project tasks and team members.')
const modalIcon = computed(() => modalInfo[props.modalType]?.icon || 'pi pi-info-circle')

const closeModal = () => {
  emit('close')
}
</script>

<template>
  <div class="modal-background" @click.self="closeModal">
    <div class="modal">
      <div class="modal-header">
        <h3>{{ modalTitle }}</h3>
        <i class="pi pi-times" @click="closeModal"></i>
      </div>
      <div class="modal-body">
        <p>{{ modalDescription }}</p>
        <div class="modal-icon">
          <i :class="modalIcon"></i>
        </div>
      </div>
      <div class="modal-buttons">
        <button @click="closeModal">Close</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-background {
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

.modal {
  background: white;
  border-radius: 16px;
  padding: 28px;
  width: 90%;
  max-width: 400px;
  text-align: center;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.modal-header h3 {
  margin: 0;
  color: #b22222;
  font-family: 'Lora', serif;
}

.modal-header i {
  cursor: pointer;
  font-size: 1.2rem;
  color: #6b7280;
  transition: color 0.2s;
}

.modal-header i:hover {
  color: #b22222;
}

.modal-body {
  margin-bottom: 24px;
}

.modal-body p {
  color: #4b5563;
  line-height: 1.5;
  margin-bottom: 20px;
}

.modal-icon i {
  font-size: 3rem;
  color: #b22222;
  opacity: 0.7;
}

.modal-buttons {
  display: flex;
  justify-content: center;
}

.modal-buttons button {
  padding: 10px 24px;
  background: #b22222;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  transition: background 0.2s;
}

.modal-buttons button:hover {
  background: #8f1c1c;
}
</style>