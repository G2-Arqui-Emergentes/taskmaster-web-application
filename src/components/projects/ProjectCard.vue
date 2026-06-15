<script setup>
import Button from "primevue/button";
import { ref, onMounted, onUnmounted, watch } from 'vue';
import router from "@/router/index.js";
import { useStore } from 'vuex';

const props = defineProps({
  project: { type: Object, required: true },
  activeMenuId: { type: Number, default: null },
  isLeader: { type: Boolean, default: false }
});

const emit = defineEmits(['edit', 'delete', 'closeMenu', 'openMenu']);
const store = useStore();
const menuContainer = ref(null);
const isMenuOpen = ref(false);

watch(() => props.activeMenuId, (newVal) => {
  if (newVal !== props.project.projectId && isMenuOpen.value) {
    isMenuOpen.value = false;
  }
});

const openTodo = () => {
  store.commit('setSelectedProject', props.project);
  router.push({ name: 'projectTodo', params: { id: props.project.projectId } });
};

const toggleMenu = (e) => {
  e.stopPropagation();
  isMenuOpen.value = !isMenuOpen.value;
  emit(isMenuOpen.value ? 'openMenu' : 'closeMenu', props.project.projectId);
};

const closeMenu = () => {
  isMenuOpen.value = false;
  emit('closeMenu');
};

const handleEdit = () => {
  closeMenu();
  emit('edit', props.project);
};

const handleDelete = () => {
  closeMenu();
  emit('delete', props.project);
};

const handleClickOutside = (e) => {
  if (menuContainer.value && !menuContainer.value.contains(e.target)) {
    closeMenu();
  }
};

onMounted(() => document.addEventListener('click', handleClickOutside));
onUnmounted(() => document.removeEventListener('click', handleClickOutside));
</script>

<template>
  <div class="project-card">
    <div class="card-header">
      <Button class="img-but" @click="openTodo">
        <img
            :src="project.imageUrl || 'https://developers.elementor.com/docs/assets/img/elementor-placeholder-image.png'"
            alt="Project Image"
            class="project-image"
        />
      </Button>
      <div v-if="isLeader" class="menu-container" ref="menuContainer">
        <button class="menu-btn" @click="toggleMenu" aria-label="Project options">
          <i class="pi pi-ellipsis-h"></i>
        </button>
        <div v-if="isMenuOpen" class="dropdown-menu">
          <button class="dropdown-item delete" @click="handleDelete">
            <i class="pi pi-trash"></i>
            Delete
          </button>
          <button class="dropdown-item edit" @click="handleEdit">
            <i class="pi pi-pencil"></i>
            Edit
          </button>
        </div>
      </div>
    </div>
    <div class="project-name">{{ project.name }}</div>
  </div>
</template>

<style scoped>
.project-card {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.card-header {
  position: relative;
  flex-shrink: 0;
}

.project-card img {
  width: 100%;
  height: 12rem;
  border-radius: 14px;
  object-fit: cover;
  display: block;
}

.img-but {
  width: 100%;
  padding: 0 !important;
  border: none !important;
  background: none !important;
  transition: transform 0.3s ease;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
  overflow: hidden;
  border-radius: 14px;
}

.img-but:hover {
  cursor: pointer;
  transform: scale(1.05);
}

.menu-container {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  z-index: 1;
}

.menu-btn {
  background: transparent;
  border: none;
  padding: 0.25rem;
  cursor: pointer;
}

.menu-btn i {
  color: #000;
  font-size: 1.2rem;
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
}

.dropdown-item {
  width: 100%;
  padding: 0.75rem 1rem;
  border: none;
  background: none;
  text-align: left;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.95rem;
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

.project-name {
  text-align: left;
  margin-top: 0.5rem;
  flex-grow: 1;
}

@media (max-width: 768px) {
  .project-card {
    width: 100%;
  }
}
</style>