<script setup>
import { ref, watch, nextTick, onMounted, onUnmounted } from 'vue';
import Calendar from 'primevue/calendar';
import { updateProject as updateProjectApi } from "@/services/project.service.js";
import { useToast } from "primevue/usetoast";

const props = defineProps({ visible: { type: Boolean, default: false }, project: Object, onUpdated: Function });
const emit = defineEmits(['update:visible']);
const toast = useToast();

const statusOptions = [
  { label: 'PLANNED', value: 'PLANNED' },
  { label: 'IN PROGRESS', value: 'IN_PROGRESS' },
  { label: 'COMPLETED', value: 'COMPLETED' },
  { label: 'CANCELLED', value: 'CANCELLED' }
];

const form = ref({
  projectId: null,
  name: '',
  description: '',
  imageUrl: '',
  budget: 0,
  status: 'PLANNED',
  endDate: null
});

const errors = ref([]);
const loading = ref(false);
const statusDropdownOpen = ref(false);
const nameInput = ref(null);

const getStatusLabel = (value) => {
  const option = statusOptions.find(o => o.value === value);
  return option ? option.label : 'Select status';
};

const toggleStatusDropdown = () => {
  statusDropdownOpen.value = !statusDropdownOpen.value;
};

const selectStatus = (value) => {
  form.value.status = value;
  statusDropdownOpen.value = false;
};

const closeDropdowns = () => {
  statusDropdownOpen.value = false;
};

const onClose = () => {
  closeDropdowns();
  emit('update:visible', false);
};

const validateForm = () => {
  errors.value = [];
  if (!form.value.name.trim()) errors.value.push('Project name is required');
  if (!form.value.description.trim()) errors.value.push('Description is required');
  if (!form.value.imageUrl.trim()) errors.value.push('Image URL is required');
  if (form.value.budget < 0) errors.value.push('Budget must be a positive number');
  if (!form.value.endDate) errors.value.push('End date is required');
  return errors.value.length === 0;
};

const checkForm = async () => {
  if (!validateForm()) return;
  await updateProject();
};

const updateProject = async () => {
  loading.value = true;
  try {
    const projectData = {
      name: form.value.name.trim(),
      description: form.value.description.trim(),
      imageUrl: form.value.imageUrl.trim(),
      budget: Number(form.value.budget) || 0,
      status: form.value.status,
      endDate: new Date(form.value.endDate).toISOString()
    };
    await updateProjectApi(form.value.projectId, projectData);
    toast.add({ severity: 'success', summary: 'Success', detail: 'Project updated successfully', life: 3000 });
    emit('update:visible', false);
    if (props.onUpdated) props.onUpdated();
  } catch (error) {
    console.error('Error updating project:', error);
    toast.add({ severity: 'error', summary: 'Error', detail: 'Could not update project', life: 3000 });
    errors.value = ['Error updating project. Please try again.'];
  } finally {
    loading.value = false;
  }
};

const handleClickOutside = (event) => {
  const statusSelect = document.querySelector('.custom-select:has(.status-dropdown)');
  if (statusDropdownOpen.value && statusSelect && !statusSelect.contains(event.target)) {
    statusDropdownOpen.value = false;
  }
};

const preventBodyScroll = (shouldPrevent) => {
  if (shouldPrevent) {
    document.body.style.overflow = 'hidden';
  } else {
    document.body.style.overflow = '';
  }
};

onMounted(() => {
  document.addEventListener('click', handleClickOutside);
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
  preventBodyScroll(false);
});

watch(() => props.visible, (val) => {
  if (val && props.project) {
    preventBodyScroll(true);
    form.value = {
      projectId: props.project.projectId,
      name: props.project.name || '',
      description: props.project.description || '',
      imageUrl: props.project.imageUrl || '',
      budget: props.project.budget || 0,
      status: props.project.status || 'PLANNED',
      endDate: props.project.endDate ? new Date(props.project.endDate) : null
    };
    errors.value = [];
    nextTick(() => {
      nameInput.value?.focus();
    });
  } else {
    closeDropdowns();
    preventBodyScroll(false);
  }
});
</script>

<template>
  <div v-if="visible" class="modal-overlay" @click.self="onClose">
    <div class="modal-box">
      <div class="modal-header">
        <h2 class="modal-title">Edit Project</h2>
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
          <label class="form-label">Project Name <span class="required">*</span></label>
          <input
              type="text"
              ref="nameInput"
              class="form-input"
              v-model="form.name"
              placeholder="Enter project name"
          />
        </div>

        <div class="form-group">
          <label class="form-label">Description <span class="required">*</span></label>
          <textarea
              class="form-input textarea"
              v-model="form.description"
              rows="3"
              placeholder="Describe your project..."
          ></textarea>
        </div>

        <div class="form-group">
          <label class="form-label">Image URL <span class="required">*</span></label>
          <input
              type="text"
              class="form-input"
              v-model="form.imageUrl"
              placeholder="https://..."
          />
        </div>

        <div class="form-row">
          <div class="form-group half">
            <label class="form-label">Budget <span class="required">*</span></label>
            <input
                type="number"
                min="0"
                class="form-input"
                v-model.number="form.budget"
                placeholder="0"
            />
          </div>

          <div class="form-group half">
            <label class="form-label">Status <span class="required">*</span></label>
            <div class="custom-select" @click="toggleStatusDropdown">
              <div class="select-trigger">
                <span>{{ getStatusLabel(form.status) }}</span>
                <i class="pi pi-chevron-down" :class="{ rotated: statusDropdownOpen }"></i>
              </div>
              <div v-if="statusDropdownOpen" class="select-dropdown status-dropdown">
                <div
                    v-for="option in statusOptions"
                    :key="option.value"
                    class="select-option"
                    :class="{ active: form.status === option.value }"
                    @click.stop="selectStatus(option.value)"
                >
                  <span>{{ option.label }}</span>
                  <i v-if="form.status === option.value" class="pi pi-check"></i>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="form-group">
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

      <div class="modal-footer">
        <button type="button" class="btn-edit" @click="checkForm" :disabled="loading">
          <i v-if="loading" class="pi pi-spin pi-spinner"></i>
          <span v-else>Save Changes</span>
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

.status-dropdown {
  max-height: 180px;
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
  min-width: 140px;
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
}
</style>