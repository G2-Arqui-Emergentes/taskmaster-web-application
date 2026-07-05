<script setup>
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { deleteTask } from "@/services/task.service.js"
import { useToast } from "primevue/usetoast"

const props = defineProps({
  visible: { type: Boolean, default: false },
  taskId: Number,
  onDeleted: Function
})
const emit = defineEmits(['update:visible', 'taskDeleted'])
const toast = useToast()
const { t } = useI18n()
const loading = ref(false)

const onClose = () => { emit('update:visible', false) }

const confirmDelete = async () => {
  loading.value = true
  try {
    await deleteTask(props.taskId)
    toast.add({ severity: 'success', summary: t('projects.toast.success'), detail: t('projects.toast.taskDeleted'), life: 3000 })
    emit('update:visible', false)
    if (props.onDeleted) props.onDeleted()
    emit('taskDeleted')
  } catch (error) {
    toast.add({ severity: 'error', summary: t('projects.toast.error'), detail: t('projects.toast.couldNotDeleteTask'), life: 3000 })
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div v-if="visible" class="modal-overlay" @click.self="onClose">
    <div class="modal-box delete-box">
      <div class="delete-content">
        <h2 class="delete-title">{{ $t('projects.deleteTaskQuestion') }}</h2>
        <p class="delete-message">{{ $t('projects.deleteTaskMessage') }}</p>
      </div>
      <div class="delete-footer">
        <button class="cancel-btn" @click="onClose">{{ $t('projects.cancel') }}</button>
        <button class="delete-btn" @click="confirmDelete" :disabled="loading">
          <i v-if="loading" class="pi pi-spin pi-spinner"></i>
          <span v-else>{{ $t('projects.delete') }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-overlay {
  position: fixed; top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.5);
  display: flex; align-items: center; justify-content: center;
  z-index: 1000;
}

.modal-box {
  background: #fff;
  border-radius: 18px;
  max-width: 400px;
  width: 90%;
  display: flex;
  flex-direction: column;
}

.delete-content {
  padding: 2rem;
  text-align: center;
}

.delete-title {
  font-family: 'Lora', serif;
  color: #b22222;
  font-size: 1.6rem;
  font-weight: 700;
  margin: 0 0 0.75rem 0;
}

.delete-message {
  color: #4b5563;
  font-size: 0.9rem;
  margin: 0;
}

.delete-footer {
  padding: 1.5rem 2rem;
  border-top: 1px solid #e5e7eb;
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
}

.cancel-btn {
  background: #e5e7eb;
  color: #4b5563;
  border-radius: 10px;
  padding: 0.6rem 1.8rem;
  border: none;
  cursor: pointer;
}

.delete-btn {
  background: #b22222;
  color: #fff;
  border-radius: 10px;
  padding: 0.6rem 1.8rem;
  border: none;
  cursor: pointer;
}

.delete-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
