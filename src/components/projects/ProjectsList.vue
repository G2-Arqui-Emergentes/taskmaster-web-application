<script setup>
import { ref, computed, onMounted } from 'vue';
import Button from 'primevue/button';
import Paginator from 'primevue/paginator';
import Toast from 'primevue/toast';
import { useToast } from "primevue/usetoast";
import ProjectCard from './ProjectCard.vue';
import CreateProjectModal from './modals/CreateProjectModal.vue';
import EditProjectModal from './modals/EditProjectModal.vue';
import DeleteProjectModal from './modals/DeleteProjectModal.vue';
import { getProjectsByLeader, getProjectsByMember, joinProjectByCode } from "@/services/project.service.js";

const toast = useToast();
const visible = ref(false);
const visibleEdit = ref(false);
const visibleDelete = ref(false);
const projects = ref([]);
const editProjectData = ref(null);
const deleteProjectData = ref(null);
const activeMenuId = ref(null);
const currentUser = ref(JSON.parse(localStorage.getItem('user') || 'null'));

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
    toast.add({ severity: 'warn', summary: 'Warning', detail: 'Enter a project code', life: 3000 });
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
    toast.add({ severity: 'success', summary: 'Joined!', detail: `You have joined ${data.name || 'the project'}`, life: 3000 });
    joinCode.value = '';
    await loadProjectsByRole();
  } catch (error) {
    toast.add({ severity: 'error', summary: 'Error', detail: error.message || 'Could not join project', life: 4000 });
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

onMounted(() => { loadProjectsByRole(); });
</script>

<template>
  <div class="projects-page">
    <div class="projects-header">
      <h1 class="title-projects">Projects</h1>
      <div class="projects-actions">
        <div v-if="!isLeader" class="join-project">
          <div class="join-container">
            <div class="join-input-wrapper">
              <i class="pi pi-lock join-icon"></i>
              <input
                  v-model="joinCode"
                  @keyup.enter="joinProject"
                  class="join-input"
                  placeholder="Enter project code"
              />
            </div>
            <Button
                :loading="joining"
                @click="joinProject"
                class="join-button"
                :class="{ 'join-button-loading': joining }"
            >
              <i v-if="!joining" class="pi pi-plus-circle join-btn-icon"></i>
              <span>Join Project</span>
            </Button>
          </div>
        </div>
      </div>
    </div>

    <div class="projects-content">
      <div class="projects-stats">
        <h3 class="subtitle">Current Projects:</h3>
        <Paginator :rows="pageSize" :totalRecords="projects.length" :first="first" @page="onPageChange" template="PrevPageLink PageLinks NextPageLink" />
      </div>

      <div class="project-cards">
        <ProjectCard v-for="(project, index) in paginatedProjects" :key="project.projectId || index" :project="project" :activeMenuId="activeMenuId" :isLeader="isLeader" @edit="handleEditProject" @delete="handleDeleteProject" @openMenu="(id) => activeMenuId = id" @closeMenu="() => activeMenuId = null" />
        <div v-if="isLeader" class="add-project">
          <Button label="Add project" icon="pi pi-plus" iconPos="left" class="addBut" @click="showAddProjectDialog" />
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
  max-width: 1400px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.projects-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
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
}

.projects-stats {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
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