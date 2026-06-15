<script setup>
import { computed } from 'vue';

const props = defineProps({
  member: { type: Object, required: true },
  isLeader: { type: Boolean, default: false },
  currentUserId: { type: Number, default: null },
  isSelectionMode: { type: Boolean, default: false },
  isSelected: { type: Boolean, default: false }
});

const emit = defineEmits(['toggle-selection', 'view-contact', 'send-message', 'remove-member']);

const defaultAvatar = 'https://static.vecteezy.com/system/resources/previews/009/292/244/non_2x/default-avatar-icon-of-social-media-user-vector.jpg';

const isLeaderOfProject = computed(() => {
  return props.member.roles && props.member.roles.some(r => r === 'ROLE_LEADER');
});

const handleCardClick = () => {
  if (props.isSelectionMode && props.member.id !== props.currentUserId) {
    emit('toggle-selection', props.member.id);
  }
};
</script>

<template>
  <div
      class="team-member-card"
      :class="{ 'selection-mode': isSelectionMode && member.id !== currentUserId }"
      @click="handleCardClick"
  >
    <div v-if="isSelectionMode && member.id !== currentUserId" class="selection-checkbox">
      <input
          type="checkbox"
          :checked="isSelected"
          @change="$emit('toggle-selection', member.id)"
          class="custom-checkbox"
      />
    </div>

    <div class="member-info">
      <img
          :src="member.imageUrl || defaultAvatar"
          alt="User Avatar"
          class="member-avatar"
      />
      <div class="member-details">
        <span class="member-name">{{ member.name }} {{ member.lastName || '' }}</span>
        <span v-if="member.id === currentUserId" class="you-badge">(You)</span>
        <span v-if="isLeaderOfProject" class="leader-badge">Leader</span>
      </div>
    </div>

    <div class="member-actions" v-if="!isSelectionMode">
      <i class="pi pi-user action-icon" @click.stop="$emit('view-contact', member)" title="View Contact"></i>
      <i class="pi pi-envelope action-icon" @click.stop="$emit('send-message', member)" title="Send Message"></i>
      <i v-if="isLeader && member.id !== currentUserId" class="pi pi-trash action-icon delete-icon" @click.stop="$emit('remove-member', member)" title="Remove Member"></i>
    </div>
  </div>
</template>

<style scoped>
.team-member-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem;
  background: white;
  border-radius: 12px;
  border: 1px solid #e5e7eb;
  transition: all 0.2s ease;
  position: relative;
}

.team-member-card.selection-mode {
  cursor: pointer;
}

.team-member-card.selection-mode:hover {
  background-color: rgba(178, 34, 34, 0.05);
}

.selection-checkbox {
  position: absolute;
  left: 0.5rem;
  top: 50%;
  transform: translateY(-50%);
}

.custom-checkbox {
  width: 18px;
  height: 18px;
  accent-color: #b22222;
  cursor: pointer;
}

.member-info {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex: 1;
  margin-left: 0.5rem;
}

.member-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  object-fit: cover;
}

.member-details {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.member-name {
  font-weight: 600;
  color: #1f2937;
  font-size: 1rem;
}

.you-badge {
  font-size: 0.7rem;
  color: #6b7280;
  font-style: italic;
  margin-left: 0.5rem;
}

.leader-badge {
  font-size: 0.7rem;
  background-color: #fef3c7;
  color: #d97706;
  padding: 0.125rem 0.5rem;
  border-radius: 12px;
  font-weight: 600;
}

.member-actions {
  display: flex;
  gap: 1rem;
  align-items: center;
}

.action-icon {
  font-size: 1.2rem;
  color: #6b7280;
  cursor: pointer;
  transition: color 0.2s, transform 0.2s;
}

.action-icon:hover {
  color: #b22222;
  transform: scale(1.1);
}

.delete-icon:hover {
  color: #dc2626;
}

@media (max-width: 768px) {
  .member-info {
    gap: 0.75rem;
  }

  .member-avatar {
    width: 40px;
    height: 40px;
  }

  .member-name {
    font-size: 0.9rem;
  }

  .action-icon {
    font-size: 1rem;
  }
}
</style>