<script setup>
import { ref, computed, onMounted } from 'vue';
import Paginator from 'primevue/paginator';
import Toast from 'primevue/toast';
import TeamProjectCard from './TeamProjectCard.vue';
import { getProjectsByLeader, getProjectsByMember } from "@/services/project.service.js";

const emit = defineEmits(['project-selected']);

const projects = ref([]);
const currentUser = ref(JSON.parse(localStorage.getItem('user') || 'null'));

const isLeader = () => {
  const user = currentUser.value;
  if (!user) return false;
  const roles = user.roles || [];
  return roles.some(r => r === 'ROLE_LEADER');
};

const isMember = () => {
  const user = currentUser.value;
  if (!user) return false;
  const roles = user.roles || [];
  return roles.some(r => r === 'ROLE_MEMBER');
};

const pageSize = 8;
const first = ref(0);
const paginatedProjects = computed(() => projects.value.slice(first.value, first.value + pageSize));
const onPageChange = (event) => { first.value = event.first; };

const loadProjectsByRole = async () => {
  try {
    console.log('Cargando proyectos para usuario:', currentUser.value?.email);
    console.log('Roles del usuario:', currentUser.value?.roles);

    let data;

    if (isLeader()) {
      console.log('Es LÍDER, cargando getProjectsByLeader()');
      data = await getProjectsByLeader();
    } else if (isMember()) {
      console.log('Es MIEMBRO, cargando getProjectsByMember()');
      data = await getProjectsByMember();
    } else {
      console.log('Rol no reconocido, usando getProjectsByMember() por defecto');
      data = await getProjectsByMember();
    }

    projects.value = Array.isArray(data) ? data : [];
    console.log('Proyectos cargados:', projects.value.length);

    if (first.value >= projects.value.length) first.value = 0;
  } catch (error) {
    console.error('Error loading projects:', error);
    projects.value = [];
  }
};

onMounted(() => {
  loadProjectsByRole();
});
</script>

<template>
  <div class="team-projects-page">
    <div class="projects-header">
      <h1 class="title-projects">Team</h1>
      <p class="subtitle-header">Select a project to view its members</p>
    </div>

    <div class="projects-content">
      <div class="projects-stats">
        <h3 class="subtitle">Your Projects:</h3>
        <Paginator :rows="pageSize" :totalRecords="projects.length" :first="first" @page="onPageChange" template="PrevPageLink PageLinks NextPageLink" />
      </div>

      <div class="project-cards">
        <TeamProjectCard
            v-for="project in paginatedProjects"
            :key="project.projectId"
            :project="project"
            @click="$emit('project-selected', project)"
        />
      </div>
    </div>

    <Toast />
  </div>
</template>

<style scoped>
.team-projects-page {
  max-width: 1400px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  padding: 1rem;
}

.projects-header {
  margin-bottom: 0.5rem;
}

.title-projects {
  font-family: 'Lora', serif;
  color: #b22222;
  font-weight: 600;
  font-size: 28px;
  margin: 0 0 0.5rem 0;
  letter-spacing: 1.05px;
}

.subtitle-header {
  color: #6b7280;
  margin: 0;
  font-size: 1rem;
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

@media (max-width: 768px) {
  .project-cards {
    grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
    gap: 1rem;
  }

  .projects-header {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>