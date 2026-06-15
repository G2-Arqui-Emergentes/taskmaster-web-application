<script setup>
import { ref, computed, onMounted } from 'vue'

const props = defineProps({
  project: { type: Object, required: true }
})

const statusText = computed(() => {
  switch (props.project.status) {
    case 'PLANNED': return 'To Do'
    case 'IN_PROGRESS': return 'In Progress'
    case 'COMPLETED': return 'Done'
    default: return props.project.status || 'Planned'
  }
})

const statusClass = computed(() => {
  switch (props.project.status) {
    case 'PLANNED': return 'status-todo'
    case 'IN_PROGRESS': return 'status-progress'
    case 'COMPLETED': return 'status-done'
    default: return 'status-todo'
  }
})

const completionPercentage = computed(() => {
  return Math.floor(Math.random() * 100)
})

const projectMembers = ref([
  { id: 1, name: 'Member 1', avatar: 'https://randomuser.me/api/portraits/men/1.jpg' },
  { id: 2, name: 'Member 2', avatar: 'https://randomuser.me/api/portraits/women/2.jpg' },
  { id: 3, name: 'Member 3', avatar: 'https://randomuser.me/api/portraits/men/3.jpg' },
  { id: 4, name: 'Member 4', avatar: 'https://randomuser.me/api/portraits/women/4.jpg' }
])

const displayedMembers = computed(() => projectMembers.value.slice(0, 3))
const extraMembersCount = computed(() => projectMembers.value.length - 3)
</script>

<template>
  <div class="project-mini-card">
    <div class="card-header">
      <h4 class="project-name">{{ project.name }}</h4>
      <span class="status-tag" :class="statusClass">{{ statusText }}</span>
    </div>
    <p class="project-description">{{ project.description || 'No description available' }}</p>
    <div class="card-footer">
      <div class="members-avatars">
        <img
            v-for="(member, idx) in displayedMembers"
            :key="member.id"
            :src="member.avatar"
            class="member-avatar-small"
            :style="{ zIndex: displayedMembers.length - idx }"
        />
        <div v-if="extraMembersCount > 0" class="extra-members">
          +{{ extraMembersCount }}
        </div>
      </div>
      <div class="project-progress">
        <span class="progress-label">PROCESS:</span>
        <span class="progress-value">{{ completionPercentage }}%</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.project-mini-card {
  background: white;
  border-radius: 16px;
  padding: 1rem;
  border: 1px solid #e5e7eb;
  transition: all 0.2s;
}

.project-mini-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.project-name {
  font-size: 0.9rem;
  font-weight: 600;
  color: #1f2937;
  margin: 0;
}

.status-tag {
  padding: 0.125rem 0.5rem;
  border-radius: 12px;
  font-size: 0.6rem;
  font-weight: 600;
}

.status-todo {
  background: #fef3c7;
  color: #d97706;
}

.status-progress {
  background: #dbeafe;
  color: #2563eb;
}

.status-done {
  background: #d1fae5;
  color: #059669;
}

.project-description {
  font-size: 0.7rem;
  color: #6b7280;
  margin: 0 0 1rem 0;
  line-height: 1.4;
}

.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.members-avatars {
  display: flex;
  align-items: center;
}

.member-avatar-small {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid white;
  margin-left: -8px;
}

.member-avatar-small:first-child {
  margin-left: 0;
}

.extra-members {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: #e5e7eb;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.6rem;
  font-weight: 600;
  color: #6b7280;
  margin-left: -8px;
  border: 2px solid white;
}

.project-progress {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.progress-label {
  font-size: 0.6rem;
  font-weight: 600;
  color: #6b7280;
}

.progress-value {
  font-size: 0.8rem;
  font-weight: 700;
  color: #b22222;
}
</style>