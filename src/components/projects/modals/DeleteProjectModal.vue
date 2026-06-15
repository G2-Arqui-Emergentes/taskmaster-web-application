<script setup>
import { ref, watch } from 'vue';
import Button from 'primevue/button';
import { deleteProject as deleteProjectApi } from "@/services/project.service.js";
import { useToast } from "primevue/usetoast";

const props = defineProps({ visible: { type: Boolean, default: false }, project: Object, onDeleted: Function });
const emit = defineEmits(['update:visible']);
const toast = useToast();
const deleteData = ref(null);

const onClose = () => { emit('update:visible', false); };

const confirmDelete = async () => {
  if (!deleteData.value) return;
  try {
    await deleteProjectApi(deleteData.value.projectId);
    toast.add({ severity: 'success', summary: 'Success', detail: 'Project Deleted Successfully', life: 3000 });
    emit('update:visible', false);
    if (props.onDeleted) props.onDeleted();
  } catch (error) {
    toast.add({ severity: 'error', summary: 'Error', detail: 'Could not delete project', life: 3000 });
  }
};

watch(() => props.visible, (val) => {
  if (val && props.project) deleteData.value = { ...props.project };
});
</script>

<template>
  <div v-if="visible" class="modal-overlay" @click.self="onClose">
    <div class="modal-box delete-box">
      <div class="delete-content">
        <h2 class="delete-title">Delete Project?</h2>
        <p class="delete-message">Deleting the project will permanently erase all data.</p>
      </div>
      <div class="delete-footer">
        <Button label="Cancel" @click="onClose" class="cancel-btn" />
        <Button label="Delete" @click="confirmDelete" class="delete-btn" />
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
  font-size: 1.8rem;
  font-weight: 700;
  margin: 0 0 1rem 0;
}

.delete-message {
  color: #4b5563;
  font-size: 1rem;
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
  padding: 0.75rem 2rem;
  border: none;
  cursor: pointer;
}

.delete-btn {
  background: #b22222;
  color: #fff;
  border-radius: 10px;
  padding: 0.75rem 2rem;
  border: none;
  cursor: pointer;
}
</style>