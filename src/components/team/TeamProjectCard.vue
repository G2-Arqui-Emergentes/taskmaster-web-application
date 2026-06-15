<script setup>
import { ref, onMounted } from 'vue';
import { UserService } from '@/services/user.service.js';

const props = defineProps({
  project: { type: Object, required: true }
});

const emit = defineEmits(['click']);

const projectLeader = ref('');

const loadProjectLeader = async () => {
  if (props.project.leaderId) {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`https://backend-taskmaster-1.onrender.com/api/v1/users/${props.project.leaderId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const leader = await response.json();
        if (leader) {
          projectLeader.value = `${leader.name || ''} ${leader.lastName || ''}`.trim() || leader.email;
        }
      }
    } catch (error) {
      console.error('Error loading project leader:', error);
      projectLeader.value = 'Unknown';
    }
  }
};

onMounted(() => {
  loadProjectLeader();
});
</script>

<template>
  <div class="team-project-card" @click="$emit('click')">
    <div class="card-header">
      <img
          :src="project.imageUrl || 'https://developers.elementor.com/docs/assets/img/elementor-placeholder-image.png'"
          alt="Project Image"
          class="project-image"
      />
      <div class="project-overlay">
        <div class="project-icon">
          <i class="pi pi-users"></i>
        </div>
      </div>
    </div>
    <div class="project-info">
      <h3 class="project-name">{{ project.name }}</h3>
      <div class="project-leader" v-if="projectLeader">
        <i class="pi pi-user"></i>
        <span>Leader: {{ projectLeader }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.team-project-card {
  background: white;
  border-radius: 16px;
  overflow: hidden;
  cursor: pointer;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.team-project-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 8px 24px rgba(178, 34, 34, 0.2);
}

.card-header {
  position: relative;
  height: 180px;
  overflow: hidden;
}

.project-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s ease;
}

.team-project-card:hover .project-image {
  transform: scale(1.05);
}

.project-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(178, 34, 34, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.team-project-card:hover .project-overlay {
  opacity: 1;
}

.project-icon i {
  font-size: 3rem;
  color: white;
}

.project-info {
  padding: 1rem;
}

.project-name {
  font-family: 'Lora', serif;
  font-weight: 600;
  font-size: 1.1rem;
  color: #1f2937;
  margin: 0 0 0.5rem 0;
}

.project-leader {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.8rem;
  color: #6b7280;
}

.project-leader i {
  font-size: 0.7rem;
}

@media (max-width: 768px) {
  .card-header {
    height: 160px;
  }
}
</style>