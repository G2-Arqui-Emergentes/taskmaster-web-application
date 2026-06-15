<script setup>
import { ref, computed, onMounted } from 'vue';
import Toast from 'primevue/toast';
import { useToast } from "primevue/usetoast";
import { UserService } from '@/services/user.service.js';
import TeamMemberCard from './TeamMemberCard.vue';

const props = defineProps({
  project: { type: Object, required: true }
});

const emit = defineEmits(['back']);

const toast = useToast();
const userService = new UserService();

const teamMembers = ref([]);
const currentUser = ref(JSON.parse(localStorage.getItem('user') || '{}'));
const isLeader = ref(false);
const defaultAvatar = 'https://static.vecteezy.com/system/resources/previews/009/292/244/non_2x/default-avatar-icon-of-social-media-user-vector.jpg';

const showContactModal = ref(false);
const showMessageModal = ref(false);
const showRemoveConfirm = ref(false);
const selectedUser = ref(null);
const userToRemove = ref(null);
const message = ref('');
const messageSent = ref(true);

const isSelectionMode = ref(false);
const selectedMemberIds = ref([]);

const currentUserId = computed(() => currentUser.value?.id);
const selectedCount = computed(() => selectedMemberIds.value.length);

const loadTeamMembers = async () => {
  try {
    const response = await userService.getAllUsers();
    const allUsers = Array.isArray(response) ? response : response?.data || [];

    isLeader.value = props.project.leaderId === currentUser.value.id;

    const members = allUsers.filter(user => {
      const userProjectIds = user.projectIds || [];
      return userProjectIds.includes(Number(props.project.projectId));
    });

    teamMembers.value = members;
    console.log('Team members loaded:', teamMembers.value.length);
  } catch (error) {
    console.error('Error loading team members:', error);
    teamMembers.value = [];
  }
};

const startSelectionMode = () => {
  isSelectionMode.value = true;
  selectedMemberIds.value = [];
  toast.add({ severity: 'info', summary: 'Meeting Mode', detail: 'Select members to meet with', life: 3000 });
};

const cancelSelectionMode = () => {
  isSelectionMode.value = false;
  selectedMemberIds.value = [];
};

const toggleSelection = (memberId) => {
  if (!isSelectionMode.value || memberId === currentUserId.value) return;

  if (selectedMemberIds.value.includes(memberId)) {
    selectedMemberIds.value = selectedMemberIds.value.filter(id => id !== memberId);
  } else {
    selectedMemberIds.value.push(memberId);
  }
};

const openContactModal = (member) => {
  selectedUser.value = member;
  showContactModal.value = true;
};

const closeContactModal = () => {
  showContactModal.value = false;
  selectedUser.value = null;
};

const openMessageModal = (member) => {
  selectedUser.value = member;
  showMessageModal.value = true;
  message.value = '';
  messageSent.value = true;
};

const closeMessageModal = () => {
  showMessageModal.value = false;
  selectedUser.value = null;
};

const sendMessage = () => {
  if (!message.value.trim()) {
    messageSent.value = false;
    return;
  }

  toast.add({
    severity: 'success',
    summary: 'Coming Soon',
    detail: `Message to ${selectedUser.value.name} would be sent here`,
    life: 3000
  });

  closeMessageModal();
};

const confirmRemoveMember = (member) => {
  if (!isLeader.value) return;
  userToRemove.value = member;
  showRemoveConfirm.value = true;
};

const closeRemoveConfirm = () => {
  showRemoveConfirm.value = false;
  userToRemove.value = null;
};

const confirmRemove = async () => {
  toast.add({
    severity: 'info',
    summary: 'Coming Soon',
    detail: `Remove member functionality coming soon`,
    life: 3000
  });
  closeRemoveConfirm();
};

const openTeamsMeeting = (user) => {
  if (!user?.email) {
    toast.add({ severity: 'warn', summary: 'No Email', detail: 'This user does not have an email address.', life: 3000 });
    return;
  }
  const subject = encodeURIComponent(`Meeting: ${props.project.name} - ${user.name}`);
  const teamsUrl = `https://teams.microsoft.com/l/meeting/new?subject=${subject}&attendees=${user.email}`;
  window.open(teamsUrl, '_blank');
};

const openGroupTeamsMeeting = () => {
  const selectedUsers = teamMembers.value.filter(m => selectedMemberIds.value.includes(m.id));
  const emails = selectedUsers.map(u => u.email).filter(email => email && email.trim() !== "");

  if (emails.length === 0) {
    toast.add({ severity: 'warn', summary: 'No Emails', detail: 'Selected users do not have valid emails.', life: 3000 });
    return;
  }

  const attendees = emails.join(',');
  const subject = encodeURIComponent(`Group Meeting: ${props.project.name}`);
  const teamsUrl = `https://teams.microsoft.com/l/meeting/new?subject=${subject}&attendees=${attendees}`;
  window.open(teamsUrl, '_blank');
  cancelSelectionMode();
};

onMounted(() => {
  loadTeamMembers();
});
</script>

<template>
  <div class="team-members-page">
    <div class="team__content-banner flex justify-content-center align-items-center flex-column gap-3">
      <h1 class="font-italic team__content-title text-6xl md:text-7xl xl:text-8xl m-0">
        {{ project.name }}'s Team
      </h1>

      <div class="action-toolbar mt-2">
        <transition name="fade" mode="out-in">
          <pv-button
              v-if="!isSelectionMode"
              class="plan-meeting-btn"
              @click="startSelectionMode"
          >
            <i class="pi pi-calendar-plus mr-2"></i>
            Plan Group Meeting
          </pv-button>

          <pv-button
              v-else
              class="cancel-meeting-btn"
              @click="cancelSelectionMode"
          >
            <i class="pi pi-times mr-2"></i>
            Cancel Selection
          </pv-button>
        </transition>
      </div>
    </div>

    <div class="back-button-container">
      <i class="pi pi-arrow-left back-icon" @click="$emit('back')"></i>
      <span class="back-text">Back to projects</span>
    </div>

    <div class="team-members-list">
      <TeamMemberCard
          v-for="member in teamMembers"
          :key="member.id"
          :member="member"
          :isLeader="isLeader"
          :currentUserId="currentUserId"
          :isSelectionMode="isSelectionMode"
          :isSelected="selectedMemberIds.includes(member.id)"
          @toggle-selection="toggleSelection"
          @view-contact="openContactModal"
          @send-message="openMessageModal"
          @remove-member="confirmRemoveMember"
      />
    </div>

    <transition name="fade">
      <div v-if="isSelectionMode && selectedCount > 0" class="floating-action-bar">
        <span class="selection-text">{{ selectedCount }} selected</span>
        <button class="group-meet-btn" @click="openGroupTeamsMeeting">
          <i class="pi pi-video mr-2"></i>
          Meet with Selected
        </button>
      </div>
    </transition>

    <div class="popup" v-if="showContactModal && selectedUser">
      <div class="popup__content bg-white shadow-1 border-round-2xl flex flex-column justify-content-center align-items-center p-6 relative">
        <i class="pi pi-times absolute cursor-pointer text-xl" style="top: 1rem; right: 1rem;" @click="closeContactModal"></i>
        <div class="popup__content-img">
          <img :src="selectedUser.imageUrl || defaultAvatar" width="150px" class="border-circle"/>
        </div>
        <h2 class="popup__content-title">{{ selectedUser.name }} {{ selectedUser.lastName || '' }}</h2>
        <div class="popup__content-description">
          <span class="popup__member-email">{{ selectedUser.email }}</span>
          <p class="popup__member-description">{{ selectedUser.description || 'No description provided' }}</p>
        </div>
        <div class="mt-3 w-full">
          <pv-button class="teams-btn justify-content-center p-2 border-none w-full text-white font-bold" @click="openTeamsMeeting(selectedUser)">
            <i class="pi pi-video mr-2"></i>
            Schedule Individual Meeting
          </pv-button>
        </div>
      </div>
    </div>

    <div class="popup" v-if="showMessageModal && selectedUser">
      <div class="popup__content bg-white shadow-1 border-round-2xl flex flex-column justify-content-center align-items-center p-6 relative">
        <i class="pi pi-times absolute cursor-pointer text-xl" style="top: 1rem; right: 1rem;" @click="closeMessageModal"></i>
        <h2 class="popup__content-title">Send message to {{ selectedUser.name }}</h2>
        <p class="popup__member-email">{{ selectedUser.email }}</p>
        <textarea class="message-textarea" placeholder="Write your message here..." v-model="message"></textarea>
        <p v-if="!messageSent" class="message-empty">Message cannot be empty</p>
        <div class="button bg-primary text-white border-round-2xl p-2 mt-4 cursor-pointer" @click="sendMessage">Send</div>
      </div>
    </div>

    <div class="popup" v-if="showRemoveConfirm && userToRemove">
      <div class="popup__content bg-white shadow-1 border-round-2xl flex flex-column justify-content-center align-items-center p-6 relative">
        <i class="pi pi-times absolute cursor-pointer text-xl" style="top: 1rem; right: 1rem;" @click="closeRemoveConfirm"></i>
        <div class="text-center">
          <i class="pi pi-exclamation-triangle text-red-500" style="font-size: 3rem;"></i>
          <h3 class="mt-3">Remove Team Member</h3>
          <p>Are you sure you want to remove <strong>{{ userToRemove.name }}</strong> from this project?</p>
          <p class="text-sm text-gray-500">This action cannot be undone.</p>
        </div>
        <div class="flex gap-3 mt-4 w-full">
          <pv-button class="flex-1 p-2 bg-gray-400 hover:bg-gray-500 border-none text-white" @click="closeRemoveConfirm">Cancel</pv-button>
          <pv-button class="flex-1 p-2 bg-red-600 hover:bg-red-700 border-none text-white" @click="confirmRemove">Remove</pv-button>
        </div>
      </div>
    </div>

    <Toast />
  </div>
</template>

<style scoped>
.team-members-page {
  max-width: 1400px;
  margin: 0 auto;
  padding: 1rem;
}

.team__content-banner {
  background-color: #ff9e9e;
  padding: 4rem 0;
  border-radius: 1rem;
  margin-bottom: 2rem;
}

.team__content-title {
  font-family: "Qwitcher Grypen", cursive;
  color: #fff;
  font-weight: 300;
}

.plan-meeting-btn {
  background-color: #b22222;
  border: none;
  padding: 0.6rem 1.5rem;
  color: white;
  font-weight: 600;
  border-radius: 25px;
  box-shadow: 0 4px 10px rgba(0,0,0,0.1);
  transition: transform 0.2s, background-color 0.2s;
}

.plan-meeting-btn:hover {
  background-color: #8f1c1c;
  transform: translateY(-2px);
}

.cancel-meeting-btn {
  background-color: #e74c3c;
  border: none;
  padding: 0.6rem 1.5rem;
  color: white;
  font-weight: 600;
  border-radius: 25px;
  box-shadow: 0 4px 10px rgba(0,0,0,0.1);
}

.back-button-container {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
  cursor: pointer;
  width: fit-content;
}

.back-icon {
  font-size: 1.2rem;
  color: #b22222;
  transition: transform 0.2s;
}

.back-icon:hover {
  transform: translateX(-3px);
}

.back-text {
  color: #6b7280;
  font-size: 0.9rem;
}

.back-button-container:hover .back-text {
  color: #b22222;
}

.team-members-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.floating-action-bar {
  position: fixed;
  bottom: 2rem;
  right: 2rem;
  background: white;
  padding: 1rem 1.5rem;
  border-radius: 50px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.15);
  display: flex;
  align-items: center;
  gap: 1rem;
  z-index: 900;
  animation: slideUp 0.3s ease-out;
}

@keyframes slideUp {
  from {
    transform: translateY(20px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.selection-text {
  font-weight: 600;
  color: #555;
}

.group-meet-btn {
  background-color: #464775;
  color: white;
  border: none;
  padding: 0.6rem 1.2rem;
  border-radius: 30px;
  font-weight: bold;
  cursor: pointer;
  display: flex;
  align-items: center;
  transition: background 0.2s;
}

.group-meet-btn:hover {
  background-color: #6264a7;
}

.popup {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.popup__content {
  max-width: 90%;
  width: 400px;
  max-height: 90vh;
  overflow-y: auto;
  border-radius: 16px;
}

.popup__content-title {
  font-family: 'Lora', serif;
  color: #b22222;
  margin: 0.5rem 0;
}

.popup__member-email {
  color: #6b7280;
  font-size: 0.9rem;
}

.popup__member-description {
  margin-top: 1rem;
  color: #4b5563;
}

.message-textarea {
  width: 100%;
  height: 100px;
  padding: 0.75rem;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  resize: none;
  font-family: inherit;
}

.message-empty {
  font-size: 0.75rem;
  color: #ef4444;
  margin-top: 0.25rem;
}

.button {
  transition: all 0.3s ease-in;
  text-transform: uppercase;
  cursor: pointer;
  text-align: center;
}

.button:hover {
  opacity: 0.9;
}

.teams-btn {
  background-color: #464775;
  color: white;
}

.teams-btn:hover {
  background-color: #6264a7;
}

.fade-enter-active, .fade-leave-active {
  transition: opacity 0.3s;
}
.fade-enter, .fade-leave-to {
  opacity: 0;
}

@media (max-width: 768px) {
  .team__content-banner {
    padding: 2rem 0;
  }

  .team__content-title {
    font-size: 2.5rem;
  }

  .floating-action-bar {
    bottom: 1rem;
    right: 1rem;
    left: 1rem;
    justify-content: space-between;
  }
}
</style>