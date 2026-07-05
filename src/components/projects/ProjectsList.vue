<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import { useI18n } from 'vue-i18n';
import Paginator from 'primevue/paginator';
import Toast from 'primevue/toast';
import { useToast } from "primevue/usetoast";
import ProjectCard from './ProjectCard.vue';
import CreateProjectModal from './modals/CreateProjectModal.vue';
import EditProjectModal from './modals/EditProjectModal.vue';
import DeleteProjectModal from './modals/DeleteProjectModal.vue';
import { getProjectsByLeader, getProjectsByMember, joinProjectByCode } from "@/services/project.service.js";

const toast = useToast();
const { t } = useI18n();
const visible = ref(false);
const visibleEdit = ref(false);
const visibleDelete = ref(false);
const projects = ref([]);
const editProjectData = ref(null);
const deleteProjectData = ref(null);
const activeMenuId = ref(null);
const currentUser = ref(JSON.parse(localStorage.getItem('user') || 'null'));
const currentTheme = ref(document.documentElement.dataset.theme || localStorage.getItem('theme') || 'light');
const isDarkTheme = computed(() => currentTheme.value === 'dark');

const isLeader = computed(() => {
  const u = currentUser.value || {};
  const roles = u.roles || [];
  return Array.isArray(roles) && roles.some(r => String(r).toUpperCase().includes('LEADER'));
});

const joinCode = ref('');
const joining = ref(false);

const joinProject = async () => {
  const code = String(joinCode.value || '').trim();
  if (!code) {
    toast.add({ severity: 'warn', summary: t('projects.toast.warning'), detail: t('projects.toast.enterProjectCode'), life: 3000 });
    return;
  }
  joining.value = true;
  try {
    const token = localStorage.getItem('token');
    const response = await fetch(`https://backend-taskmaster-1.onrender.com/api/v1/projects/join/${code}`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    toast.add({ severity: 'success', summary: t('projects.toast.joined'), detail: t('projects.toast.joinedProject', { name: data.name || t('projects.theProject') }), life: 3000 });
    joinCode.value = '';
    await loadProjectsByRole();
  } catch (error) {
    toast.add({ severity: 'error', summary: t('projects.toast.error'), detail: error.message || t('projects.toast.couldNotJoinProject'), life: 4000 });
  } finally {
    joining.value = false;
  }
};

const getCurrentRole = () => {
  const roles = currentUser.value?.roles;
  if (Array.isArray(roles) && roles.length > 0) return String(roles[0]);
  return String(currentUser.value?.role || '').trim();
};

const pageSize = 8;
const first = ref(0);
const paginatedProjects = computed(() => projects.value.slice(first.value, first.value + pageSize));
const onPageChange = (event) => { first.value = event.first; };

const loadProjectsByRole = async () => {
  try {
    const role = getCurrentRole().toLowerCase();
    let data;
    if (role.includes('leader')) data = await getProjectsByLeader();
    else if (role.includes('member')) data = await getProjectsByMember();
    else data = await getProjectsByLeader();
    projects.value = Array.isArray(data) ? data : [];
    if (first.value >= projects.value.length) first.value = 0;
  } catch (error) {
    console.error('Error loading projects:', error);
    projects.value = [];
  }
};

const showAddProjectDialog = () => { visible.value = true; };
const handleProjectCreated = () => { loadProjectsByRole(); };
const handleEditProject = (project) => {
  editProjectData.value = { ...project };
  visibleEdit.value = true;
};
const handleProjectUpdated = () => { loadProjectsByRole(); };
const handleDeleteProject = (project) => {
  deleteProjectData.value = { ...project };
  visibleDelete.value = true;
};
const handleProjectDeleted = () => { loadProjectsByRole(); };

const resolveThemePreference = () => {
  const preference = localStorage.getItem('theme') || 'light';
  if (preference === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return preference;
};

const syncTheme = (event) => {
  currentTheme.value = event?.detail?.theme || document.documentElement.dataset.theme || resolveThemePreference();
};

onMounted(() => {
  currentTheme.value = document.documentElement.dataset.theme || resolveThemePreference();
  window.addEventListener('theme-changed', syncTheme);
  window.addEventListener('storage', syncTheme);
  loadProjectsByRole();
});

onBeforeUnmount(() => {
  window.removeEventListener('theme-changed', syncTheme);
  window.removeEventListener('storage', syncTheme);
});
</script>

<template>
  <div class="projects-page" :class="{ 'dark-projects': isDarkTheme }">
    <div class="projects-header">
      <h1 class="title-projects">{{ $t('projects.projects') }}</h1>
      <div class="projects-actions">
        <div v-if="!isLeader" class="join-project">
          <div class="join-container">
            <div class="join-input-wrapper">
              <i class="pi pi-lock join-icon"></i>
              <input
                  v-model="joinCode"
                  @keyup.enter="joinProject"
                  class="join-input"
                  :placeholder="$t('projects.enterProjectCode')"
              />
            </div>
            <button
                type="button"
                :disabled="joining"
                @click="joinProject"
                class="join-button"
                :class="{ 'join-button-loading': joining }"
            >
              <i v-if="!joining" class="pi pi-plus-circle join-btn-icon"></i>
              <span>{{ $t('projects.joinProject') }}</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <div class="projects-content">
      <div class="projects-stats">
        <h3 class="subtitle">{{ $t('projects.currentprojects') }}:</h3>
        <Paginator :rows="pageSize" :totalRecords="projects.length" :first="first" @page="onPageChange" template="PrevPageLink PageLinks NextPageLink" />
      </div>

      <div class="project-cards">
        <ProjectCard v-for="(project, index) in paginatedProjects" :key="project.projectId || index" :project="project" :activeMenuId="activeMenuId" :isLeader="isLeader" @edit="handleEditProject" @delete="handleDeleteProject" @openMenu="(id) => activeMenuId = id" @closeMenu="() => activeMenuId = null" />
        <div v-if="isLeader" class="add-project">
          <button type="button" class="addBut" @click="showAddProjectDialog">
            <i class="pi pi-plus"></i>
            <span>{{ $t('projects.addProject') }}</span>
          </button>
        </div>
      </div>
    </div>

    <CreateProjectModal v-model:visible="visible" :onCreated="handleProjectCreated" />
    <EditProjectModal v-model:visible="visibleEdit" :project="editProjectData" :onUpdated="handleProjectUpdated" />
    <DeleteProjectModal v-model:visible="visibleDelete" :project="deleteProjectData" :onDeleted="handleProjectDeleted" />
    <Toast />
  </div>
</template>

<style scoped>
.projects-page {
  width: 100%;
  max-width: none;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  min-height: 100%;
  padding: 1.5rem;
  background: #ffffff;
  transition: background 0.2s ease, color 0.2s ease;
}

.projects-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
  width: 100%;
}

.title-projects {
  font-family: 'Lora', serif;
  color: #b22222;
  font-weight: 600;
  font-size: 28px;
  margin: 0;
  letter-spacing: 1.05px;
}

.projects-actions {
  display: flex;
  align-items: center;
}

.join-project {
  display: flex;
  align-items: center;
}

.join-container {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  background: #f8fafc;
  padding: 0.25rem 0.25rem 0.25rem 0.75rem;
  border-radius: 48px;
  border: 1px solid #e2e8f0;
  transition: all 0.2s ease;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.join-container:focus-within {
  border-color: #b22222;
  box-shadow: 0 0 0 3px rgba(178, 34, 34, 0.1);
}

.join-input-wrapper {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.join-icon {
  color: #94a3b8;
  font-size: 0.9rem;
}

.join-input {
  border: none;
  padding: 0.5rem 0;
  font-size: 0.9rem;
  width: 160px;
  background: transparent;
  outline: none;
  color: #1e293b;
}

.join-input::placeholder {
  color: #94a3b8;
  font-weight: 400;
}

.join-button {
  background: linear-gradient(135deg, #b22222 0%, #8f1c1c 100%);
  border: none;
  border-radius: 40px;
  padding: 0.5rem 1.25rem;
  color: white;
  font-weight: 600;
  font-size: 0.85rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.join-button:focus,
.join-button:focus-visible,
.addBut:focus,
.addBut:focus-visible {
  outline: none;
}

.join-button:hover:not(:disabled) {
  background: linear-gradient(135deg, #9a1e1e 0%, #7a1616 100%);
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(178, 34, 34, 0.3);
}

.join-button:active:not(:disabled) {
  transform: translateY(0);
}

.join-button-loading {
  opacity: 0.8;
  cursor: wait;
}

.join-btn-icon {
  font-size: 0.9rem;
}

@media (max-width: 640px) {
  .join-container {
    width: 100%;
    justify-content: space-between;
  }

  .join-input {
    width: 120px;
  }

  .join-button span {
    display: none;
  }

  .join-button {
    padding: 0.5rem 1rem;
  }

  .join-button i {
    margin: 0;
  }
}

.projects-content {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  width: 100%;
}

.projects-stats {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
  width: 100%;
}

.subtitle {
  font-family: 'Lora', serif;
  color: #b22222;
  font-weight: bold;
  font-size: 1.2rem;
  margin: 0;
}

.project-cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1.5rem;
  width: 100%;
}

.add-project {
  transition: transform 0.3s ease;
}

.add-project:hover {
  cursor: pointer;
  transform: scale(1.02);
}

.addBut {
  width: 100%;
  min-height: 12rem;
  padding: 1.4rem 1.2rem;
  background: linear-gradient(180deg, #fff 0%, #fafafa 100%);
  color: #b22222;
  border: 1px solid rgba(178, 34, 34, 0.18) !important;
  border-radius: 18px !important;
  font-size: 1rem !important;
  font-weight: 600 !important;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.6rem;
}

.projects-page.dark-projects {
  background: #080b12;
  color: #eef2f8;
}

:global(.dark-projects .p-ink),
:global(.dark-projects .p-ink-active),
:global(.dark-projects .p-ripple .p-ink),
:global(.dark-projects .p-ripple .p-ink-active),
:global(.dark-projects .p-button::before),
:global(.dark-projects .p-button::after),
:global(.dark-projects .p-paginator-element::before),
:global(.dark-projects .p-paginator-element::after) {
  display: none !important;
  width: 0 !important;
  height: 0 !important;
  opacity: 0 !important;
  background: transparent !important;
  border: 0 !important;
  border-color: transparent !important;
  outline: 0 !important;
  box-shadow: none !important;
  content: none !important;
  transform: none !important;
}

:global(.dark-projects .p-button),
:global(.dark-projects .p-button:focus),
:global(.dark-projects .p-button:focus-visible),
:global(.dark-projects .p-paginator-element),
:global(.dark-projects .p-paginator-element:focus),
:global(.dark-projects .p-paginator-element:focus-visible) {
  outline: 0 !important;
  box-shadow: none !important;
}

.dark-projects .title-projects,
.dark-projects .subtitle {
  color: #ff4f82;
}

.dark-projects .join-container {
  background: #10141d;
  border-color: #242a36;
  box-shadow: 0 14px 32px rgba(0, 0, 0, 0.22);
}

.dark-projects .join-container:focus-within {
  border-color: #2f3747;
  box-shadow: 0 14px 32px rgba(0, 0, 0, 0.22);
}

.dark-projects .join-icon {
  color: #a7b0bf;
}

.dark-projects .join-input {
  color: #f8fafc;
}

.dark-projects .join-input::placeholder {
  color: #7d8798;
}

.dark-projects .join-button {
  background: linear-gradient(135deg, #e11d48 0%, #9f1239 100%);
  box-shadow: 0 10px 24px rgba(225, 29, 72, 0.2);
}

.dark-projects .join-button:hover:not(:disabled) {
  background: linear-gradient(135deg, #f43f5e 0%, #be123c 100%);
}

.dark-projects .addBut {
  background:
      linear-gradient(145deg, rgba(18, 23, 33, 0.98), rgba(10, 14, 22, 0.98)) !important;
  color: #ff4f82 !important;
  border-color: rgba(244, 63, 115, 0.3) !important;
  box-shadow: 0 18px 45px rgba(0, 0, 0, 0.24);
}

.dark-projects :deep(.p-paginator) {
  background: transparent;
  color: #a7b0bf;
  border: 0;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: flex-end;
  gap: 0.35rem;
  width: auto;
}

.dark-projects :deep(.p-paginator .p-paginator-page),
.dark-projects :deep(.p-paginator .p-paginator-prev),
.dark-projects :deep(.p-paginator .p-paginator-next) {
  width: 2.5rem;
  min-width: 2.5rem;
  height: 2.5rem;
  background: #10141d;
  border: 1px solid #242a36;
  color: #a7b0bf;
  border-radius: 8px;
  margin: 0;
}

.dark-projects :deep(.p-paginator .p-highlight) {
  background: #e11d48;
  border-color: #e11d48;
  color: #ffffff;
}

@media (max-width: 768px) {
  .project-cards {
    grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
    gap: 1rem;
  }

  .addBut {
    min-height: 5.5rem;
  }

  .projects-header {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
