<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import { useI18n } from 'vue-i18n';
import Toast from 'primevue/toast';
import { useToast } from "primevue/usetoast";
import { UserService } from '@/services/user.service.js';
import { removeUserFromProject } from '@/services/project.service.js';
import {
  createMeeting,
  deleteMeeting,
  getMeetingById,
  getMeetings,
  updateMeeting
} from '@/services/meeting.service.js';
import TeamMemberCard from './TeamMemberCard.vue';

const props = defineProps({
  project: { type: Object, required: true }
});

const emit = defineEmits(['back']);

const toast = useToast();
const { t } = useI18n();
const userService = new UserService();

const teamMembers = ref([]);
const currentUser = ref(JSON.parse(localStorage.getItem('user') || '{}'));
const isLeader = ref(false);
const currentTheme = ref(document.documentElement.dataset.theme || localStorage.getItem('theme') || 'light');
const defaultAvatar = 'https://static.vecteezy.com/system/resources/previews/009/292/244/non_2x/default-avatar-icon-of-social-media-user-vector.jpg';

const showContactModal = ref(false);
const showMessageModal = ref(false);
const showRemoveConfirm = ref(false);
const selectedUser = ref(null);
const userToRemove = ref(null);
const removingMember = ref(false);
const message = ref('');
const messageSent = ref(true);

const isSelectionMode = ref(false);
const selectedMemberIds = ref([]);
const showMeetingsModal = ref(false);
const meetings = ref([]);
const meetingsLoading = ref(false);
const savingMeeting = ref(false);
const editingMeetingId = ref(null);
const selectedMeeting = ref(null);
const meetingForm = ref({
  title: '',
  description: '',
  startTime: '',
  endTime: '',
  participantIds: []
});

const currentUserId = computed(() => currentUser.value?.id);
const selectedCount = computed(() => selectedMemberIds.value.length);
const isDarkTheme = computed(() => currentTheme.value === 'dark');
const participantOptions = computed(() => {
  return teamMembers.value
      .filter(member => member.id !== currentUserId.value)
      .map(member => ({
        id: member.id,
        name: `${member.name || ''} ${member.lastName || ''}`.trim() || member.email,
        email: member.email
      }));
});

const loadTeamMembers = async () => {
  try {
    const response = await userService.getAllUsers();
    const allUsers = Array.isArray(response) ? response : response?.data || [];

    isLeader.value = props.project.leaderId === currentUser.value.id;

    const members = allUsers.filter(user => {
      const userProjectIds = Array.isArray(user.projectIds) ? user.projectIds.map(Number) : [];
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
  openMeetingsModal();
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
    summary: t('team.toast.comingSoon'),
    detail: t('team.toast.messageWouldBeSent', { name: selectedUser.value.name }),
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
  if (removingMember.value) return;
  showRemoveConfirm.value = false;
  userToRemove.value = null;
};

const confirmRemove = async () => {
  if (!userToRemove.value || removingMember.value) return;

  removingMember.value = true;
  try {
    await removeUserFromProject(props.project.projectId, userToRemove.value.id);
    teamMembers.value = teamMembers.value.filter(member => member.id !== userToRemove.value.id);
    selectedMemberIds.value = selectedMemberIds.value.filter(id => id !== userToRemove.value.id);

    toast.add({
      severity: 'success',
      summary: t('team.toast.memberRemoved'),
      detail: t('team.toast.memberRemovedDetail', { name: userToRemove.value.name, project: props.project.name }),
      life: 3000
    });

    showRemoveConfirm.value = false;
    userToRemove.value = null;
  } catch (error) {
    const detail = error.response?.data?.message
        || error.response?.data
        || t('team.toast.couldNotRemoveMember');
    toast.add({
      severity: 'error',
      summary: t('team.toast.error'),
      detail,
      life: 4000
    });
  } finally {
    removingMember.value = false;
  }
};

const openTeamsMeeting = (user) => {
  const participantIds = user?.id ? [user.id] : [];
  closeContactModal();
  openMeetingsModal(participantIds);
};

const openGroupTeamsMeeting = () => {
  openMeetingsModal(selectedMemberIds.value);
  cancelSelectionMode();
};

const resetMeetingForm = (participantIds = []) => {
  const allowedIds = participantOptions.value.map(member => Number(member.id));
  meetingForm.value = {
    title: '',
    description: '',
    startTime: '',
    endTime: '',
    participantIds: participantIds.map(Number).filter(id => allowedIds.includes(id))
  };
  editingMeetingId.value = null;
};

const toDatetimeLocal = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
};

const toIsoString = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

const normalizeMeetings = (data) => {
  const list = Array.isArray(data) ? data : data?.data || [];
  const projectMemberIds = new Set(teamMembers.value.map(member => Number(member.id)));
  projectMemberIds.add(Number(currentUserId.value));

  return list.filter(meeting => {
    const participantIds = Array.isArray(meeting.participantIds)
        ? meeting.participantIds.map(Number)
        : [];
    const belongsToProjectLeader = Number(meeting.leaderId) === Number(props.project.leaderId);
    const hasProjectParticipant = participantIds.some(id => projectMemberIds.has(id));
    const currentUserAssigned = participantIds.includes(Number(currentUserId.value));
    const currentUserLeads = Number(meeting.leaderId) === Number(currentUserId.value);

    return hasProjectParticipant && (belongsToProjectLeader || currentUserAssigned || currentUserLeads);
  }).sort((a, b) => new Date(a.startTime || 0) - new Date(b.startTime || 0));
};

const loadMeetings = async () => {
  meetingsLoading.value = true;
  try {
    const data = await getMeetings();
    meetings.value = normalizeMeetings(data);
  } catch (error) {
    console.error('Error loading meetings:', error);
    meetings.value = [];
    toast.add({ severity: 'error', summary: t('team.toast.error'), detail: t('team.toast.couldNotLoadMeetings'), life: 4000 });
  } finally {
    meetingsLoading.value = false;
  }
};

const openMeetingsModal = async (participantIds = []) => {
  showMeetingsModal.value = true;
  selectedMeeting.value = null;
  resetMeetingForm(participantIds);
  await loadMeetings();
};

const closeMeetingsModal = () => {
  if (savingMeeting.value) return;
  showMeetingsModal.value = false;
  selectedMeeting.value = null;
  resetMeetingForm();
};

const validateMeetingForm = () => {
  if (!meetingForm.value.title.trim()) return t('team.toast.meetingTitleRequired');
  if (!meetingForm.value.startTime || !meetingForm.value.endTime) return t('team.toast.meetingTimeRequired');

  const start = new Date(meetingForm.value.startTime);
  const end = new Date(meetingForm.value.endTime);
  if (end <= start) return t('team.toast.meetingEndAfterStart');
  if (meetingForm.value.participantIds.length === 0) return t('team.toast.meetingParticipantsRequired');

  const allowedIds = new Set(participantOptions.value.map(member => Number(member.id)));
  const hasInvalidParticipant = meetingForm.value.participantIds.some(id => !allowedIds.has(Number(id)));
  if (hasInvalidParticipant) return t('team.toast.onlyProjectMembers');

  return '';
};

const saveMeeting = async () => {
  if (!isLeader.value || savingMeeting.value) return;

  const validationMessage = validateMeetingForm();
  if (validationMessage) {
    toast.add({ severity: 'warn', summary: t('team.toast.checkMeeting'), detail: validationMessage, life: 3500 });
    return;
  }

  savingMeeting.value = true;
  const payload = {
    title: meetingForm.value.title.trim(),
    description: meetingForm.value.description.trim(),
    startTime: toIsoString(meetingForm.value.startTime),
    endTime: toIsoString(meetingForm.value.endTime),
    participantIds: meetingForm.value.participantIds.map(Number)
  };

  try {
    if (editingMeetingId.value) {
      await updateMeeting(editingMeetingId.value, payload);
      toast.add({ severity: 'success', summary: t('team.toast.meetingUpdated'), life: 3000 });
    } else {
      await createMeeting(payload);
      toast.add({ severity: 'success', summary: t('team.toast.meetingCreated'), life: 3000 });
    }

    resetMeetingForm();
    await loadMeetings();
  } catch (error) {
    console.error('Error saving meeting:', error);
    const detail = error.response?.data?.message || error.response?.data || t('team.toast.couldNotSaveMeeting');
    toast.add({ severity: 'error', summary: t('team.toast.error'), detail, life: 4000 });
  } finally {
    savingMeeting.value = false;
  }
};

const editMeeting = (meeting) => {
  editingMeetingId.value = meeting.meetingId;
  selectedMeeting.value = null;
  meetingForm.value = {
    title: meeting.title || '',
    description: meeting.description || '',
    startTime: toDatetimeLocal(meeting.startTime),
    endTime: toDatetimeLocal(meeting.endTime),
    participantIds: Array.isArray(meeting.participantIds) ? meeting.participantIds.map(Number) : []
  };
};

const viewMeeting = async (meetingId) => {
  try {
    selectedMeeting.value = await getMeetingById(meetingId);
  } catch (error) {
    console.error('Error loading meeting detail:', error);
    toast.add({ severity: 'error', summary: t('team.toast.error'), detail: t('team.toast.couldNotLoadMeeting'), life: 4000 });
  }
};

const removeMeeting = async (meetingId) => {
  try {
    await deleteMeeting(meetingId);
    if (editingMeetingId.value === meetingId) resetMeetingForm();
    if (selectedMeeting.value?.meetingId === meetingId) selectedMeeting.value = null;
    meetings.value = meetings.value.filter(meeting => meeting.meetingId !== meetingId);
    toast.add({ severity: 'success', summary: t('team.toast.meetingDeleted'), life: 3000 });
  } catch (error) {
    console.error('Error deleting meeting:', error);
    const detail = error.response?.data?.message || error.response?.data || t('team.toast.couldNotDeleteMeeting');
    toast.add({ severity: 'error', summary: t('team.toast.error'), detail, life: 4000 });
  }
};

const getParticipantName = (participantId) => {
  const member = teamMembers.value.find(item => Number(item.id) === Number(participantId));
  return member ? `${member.name || ''} ${member.lastName || ''}`.trim() || member.email : `#${participantId}`;
};

const formatMeetingDate = (startTime, endTime) => {
  if (!startTime || !endTime) return t('team.meetingDatePending');

  const start = new Date(startTime);
  const end = new Date(endTime);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return t('team.meetingDatePending');

  const today = new Date();
  const isToday = start.toDateString() === today.toDateString();
  const dayLabel = isToday
      ? t('team.today')
      : start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  const startLabel = start.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  const endLabel = end.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });

  return `${dayLabel} · ${startLabel} - ${endLabel}`;
};

const goBackToProjects = () => {
  emit('back');
};

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
  loadTeamMembers();
});

onBeforeUnmount(() => {
  window.removeEventListener('theme-changed', syncTheme);
  window.removeEventListener('storage', syncTheme);
});
</script>

<template>
  <div class="team-members-page" :class="{ 'dark-team-members': isDarkTheme }">
    <div class="team__content-banner flex justify-content-center align-items-center flex-column gap-3">
      <h1 class="font-italic team__content-title text-6xl md:text-7xl xl:text-8xl m-0">
        {{ $t('team.projectTeam', { project: project.name }) }}
      </h1>

      <div class="action-toolbar mt-2">
        <transition name="fade" mode="out-in">
          <pv-button
              v-if="!isSelectionMode"
              class="plan-meeting-btn"
              @click="startSelectionMode"
          >
            <i class="pi pi-calendar-plus mr-2"></i>
            {{ $t('team.meetings') }}
          </pv-button>

          <pv-button
              v-else
              class="cancel-meeting-btn"
              @click="cancelSelectionMode"
          >
            <i class="pi pi-times mr-2"></i>
            {{ $t('team.cancelSelection') }}
          </pv-button>
        </transition>
      </div>
    </div>

    <div
        class="back-button-container"
        role="button"
        tabindex="0"
        @click="goBackToProjects"
        @keydown.enter="goBackToProjects"
        @keydown.space.prevent="goBackToProjects"
    >
      <i class="pi pi-arrow-left back-icon"></i>
      <span class="back-text">{{ $t('team.backToProjects') }}</span>
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
        <span class="selection-text">{{ $t('team.selectedCount', { count: selectedCount }) }}</span>
        <button class="group-meet-btn" @click="openGroupTeamsMeeting">
          <i class="pi pi-video mr-2"></i>
          {{ $t('team.meetWithSelected') }}
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
          <p class="popup__member-description">{{ selectedUser.description || $t('team.noDescriptionProvided') }}</p>
        </div>
        <div class="mt-3 w-full">
          <pv-button class="teams-btn justify-content-center p-2 border-none w-full text-white font-bold" @click="openTeamsMeeting(selectedUser)">
            <i class="pi pi-video mr-2"></i>
            {{ $t('team.scheduleIndividualMeeting') }}
          </pv-button>
        </div>
      </div>
    </div>

    <div class="popup" v-if="showMeetingsModal">
      <div class="meetings-modal bg-white shadow-1">
        <div class="meetings-header">
          <div>
            <p class="meetings-kicker">{{ project.name }}</p>
            <h2 class="meetings-title">{{ $t('team.meetings') }}</h2>
          </div>
          <button class="icon-button" type="button" @click="closeMeetingsModal" :aria-label="$t('team.close')">
            <i class="pi pi-times"></i>
          </button>
        </div>

        <div class="meetings-grid">
          <section class="meeting-panel">
            <div class="panel-heading">
              <h3>{{ editingMeetingId ? $t('team.editMeeting') : $t('team.createMeeting') }}</h3>
              <button v-if="editingMeetingId" class="text-action" type="button" @click="resetMeetingForm()">
                {{ $t('team.clear') }}
              </button>
            </div>

            <form v-if="isLeader" class="meeting-form" @submit.prevent="saveMeeting">
              <label class="field-label" for="meeting-title">{{ $t('team.meetingTitle') }}</label>
              <input id="meeting-title" class="field-input" type="text" v-model="meetingForm.title" placeholder="Sprint Review" />

              <label class="field-label" for="meeting-description">{{ $t('team.meetingDescription') }}</label>
              <textarea id="meeting-description" class="field-input field-textarea" v-model="meetingForm.description" placeholder="Review sprint progress"></textarea>

              <div class="time-grid">
                <div>
                  <label class="field-label" for="meeting-start">{{ $t('team.startTime') }}</label>
                  <input id="meeting-start" class="field-input" type="datetime-local" v-model="meetingForm.startTime" />
                </div>
                <div>
                  <label class="field-label" for="meeting-end">{{ $t('team.endTime') }}</label>
                  <input id="meeting-end" class="field-input" type="datetime-local" v-model="meetingForm.endTime" />
                </div>
              </div>

              <div class="participants-header">
                <label class="field-label">{{ $t('team.participants') }}</label>
                <span class="participant-count">{{ meetingForm.participantIds.length }}</span>
              </div>
              <div class="participants-list">
                <label
                    v-for="participant in participantOptions"
                    :key="participant.id"
                    class="participant-option"
                >
                  <input
                      type="checkbox"
                      :value="participant.id"
                      v-model="meetingForm.participantIds"
                  />
                  <span>
                    <strong>{{ participant.name }}</strong>
                    <small>{{ participant.email }}</small>
                  </span>
                </label>
              </div>

              <pv-button class="save-meeting-btn" type="submit" :disabled="savingMeeting">
                <i class="pi pi-check mr-2"></i>
                {{ savingMeeting ? $t('team.saving') : (editingMeetingId ? $t('team.updateMeeting') : $t('team.createMeeting')) }}
              </pv-button>
            </form>

            <div v-else class="member-meeting-note">
              <i class="pi pi-info-circle"></i>
              <p>{{ $t('team.membersCanOnlyViewMeetings') }}</p>
            </div>
          </section>

          <section class="meeting-panel">
            <div class="panel-heading">
              <h3>{{ $t('team.upcomingMeetings') }}</h3>
              <button class="text-action" type="button" @click="loadMeetings">
                {{ $t('team.refresh') }}
              </button>
            </div>

            <div v-if="meetingsLoading" class="empty-meetings">{{ $t('team.loadingMeetings') }}</div>
            <div v-else-if="meetings.length === 0" class="empty-meetings">{{ $t('team.noUpcomingMeetings') }}</div>

            <div v-else class="meeting-cards">
              <article v-for="meeting in meetings" :key="meeting.meetingId" class="meeting-card">
                <div class="meeting-card-header">
                  <div>
                    <h4>{{ meeting.title }}</h4>
                    <p>{{ formatMeetingDate(meeting.startTime, meeting.endTime) }}</p>
                  </div>
                  <span class="status-pill">{{ meeting.status || 'SCHEDULED' }}</span>
                </div>
                <p class="meeting-description">{{ meeting.description || $t('team.noDescriptionProvided') }}</p>
                <div class="meeting-meta">
                  <span>{{ $t('team.participantsCount', { count: meeting.participantIds?.length || 0 }) }}</span>
                  <span v-if="meeting.meetLink">
                    <a :href="meeting.meetLink" target="_blank" rel="noopener">{{ $t('team.joinMeeting') }}</a>
                  </span>
                  <span v-else>{{ $t('team.googleMeetNotConnected') }}</span>
                </div>
                <div class="meeting-actions">
                  <button type="button" @click="viewMeeting(meeting.meetingId)">{{ $t('team.view') }}</button>
                  <button v-if="isLeader" type="button" @click="editMeeting(meeting)">{{ $t('team.edit') }}</button>
                  <button v-if="isLeader" type="button" class="danger-action" @click="removeMeeting(meeting.meetingId)">{{ $t('team.delete') }}</button>
                </div>
              </article>
            </div>

            <div v-if="selectedMeeting" class="meeting-detail">
              <div class="panel-heading">
                <h3>{{ selectedMeeting.title }}</h3>
                <button class="text-action" type="button" @click="selectedMeeting = null">{{ $t('team.close') }}</button>
              </div>
              <p>{{ selectedMeeting.description || $t('team.noDescriptionProvided') }}</p>
              <p class="meeting-date-detail">{{ formatMeetingDate(selectedMeeting.startTime, selectedMeeting.endTime) }}</p>
              <div class="detail-participants">
                <span v-for="participantId in selectedMeeting.participantIds || []" :key="participantId">
                  {{ getParticipantName(participantId) }}
                </span>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>

    <div class="popup" v-if="showMessageModal && selectedUser">
      <div class="popup__content bg-white shadow-1 border-round-2xl flex flex-column justify-content-center align-items-center p-6 relative">
        <i class="pi pi-times absolute cursor-pointer text-xl" style="top: 1rem; right: 1rem;" @click="closeMessageModal"></i>
        <h2 class="popup__content-title">{{ $t('team.sendMessageTo', { name: selectedUser.name }) }}</h2>
        <p class="popup__member-email">{{ selectedUser.email }}</p>
        <textarea class="message-textarea" :placeholder="$t('team.writeMessage')" v-model="message"></textarea>
        <p v-if="!messageSent" class="message-empty">{{ $t('team.messageCannotBeEmpty') }}</p>
        <div class="button bg-primary text-white border-round-2xl p-2 mt-4 cursor-pointer" @click="sendMessage">{{ $t('team.send') }}</div>
      </div>
    </div>

    <div class="popup" v-if="showRemoveConfirm && userToRemove">
      <div class="popup__content bg-white shadow-1 border-round-2xl flex flex-column justify-content-center align-items-center p-6 relative">
        <i class="pi pi-times absolute cursor-pointer text-xl" style="top: 1rem; right: 1rem;" @click="closeRemoveConfirm"></i>
        <div class="text-center">
          <i class="pi pi-exclamation-triangle text-red-500" style="font-size: 3rem;"></i>
          <h3 class="mt-3">{{ $t('team.removeTeamMember') }}</h3>
          <p>{{ $t('team.removeConfirm', { name: userToRemove.name }) }}</p>
          <p class="text-sm text-gray-500">{{ $t('team.actionCannotBeUndone') }}</p>
        </div>
        <div class="flex gap-3 mt-4 w-full">
          <pv-button class="flex-1 p-2 bg-gray-400 hover:bg-gray-500 border-none text-white" :disabled="removingMember" @click="closeRemoveConfirm">{{ $t('team.cancel') }}</pv-button>
          <pv-button class="flex-1 p-2 bg-red-600 hover:bg-red-700 border-none text-white" :disabled="removingMember" @click="confirmRemove">
            {{ removingMember ? $t('team.removing') : $t('team.remove') }}
          </pv-button>
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

.meetings-modal {
  width: min(1120px, calc(100vw - 2rem));
  max-height: 90vh;
  overflow-y: auto;
  border-radius: 12px;
  padding: 1.25rem;
}

.meetings-header,
.panel-heading,
.meeting-card-header,
.meeting-actions,
.meetings-grid,
.time-grid,
.participants-header {
  display: flex;
}

.meetings-header,
.panel-heading,
.meeting-card-header,
.participants-header {
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.meetings-kicker {
  margin: 0 0 0.2rem;
  color: #6b7280;
  font-size: 0.85rem;
}

.meetings-title,
.panel-heading h3 {
  margin: 0;
  color: #b22222;
  font-family: 'Lora', serif;
}

.meetings-grid {
  align-items: flex-start;
  gap: 1rem;
  margin-top: 1rem;
}

.meeting-panel {
  flex: 1;
  min-width: 0;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  padding: 1rem;
}

.meeting-form {
  display: flex;
  flex-direction: column;
  gap: 0.7rem;
  margin-top: 1rem;
}

.field-label {
  color: #374151;
  font-size: 0.85rem;
  font-weight: 700;
}

.field-input {
  width: 100%;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  padding: 0.65rem 0.75rem;
  font: inherit;
}

.field-textarea {
  min-height: 84px;
  resize: vertical;
}

.time-grid {
  gap: 0.75rem;
}

.time-grid > div {
  flex: 1;
}

.participants-list,
.meeting-cards,
.detail-participants {
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
}

.participants-list {
  max-height: 180px;
  overflow-y: auto;
  padding-right: 0.25rem;
}

.participant-option {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 0.65rem;
  cursor: pointer;
}

.participant-option input {
  width: 18px;
  height: 18px;
  accent-color: #b22222;
}

.participant-option span {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.participant-option small {
  color: #6b7280;
  overflow-wrap: anywhere;
}

.participant-count,
.status-pill {
  background: rgba(178, 34, 34, 0.1);
  color: #b22222;
  border-radius: 999px;
  padding: 0.25rem 0.6rem;
  font-size: 0.75rem;
  font-weight: 700;
}

.save-meeting-btn {
  justify-content: center;
  background: #b22222;
  border: 0;
  color: #ffffff;
  margin-top: 0.35rem;
}

.icon-button,
.text-action,
.meeting-actions button {
  border: 0;
  background: transparent;
  cursor: pointer;
  color: #b22222;
  font-weight: 700;
}

.icon-button {
  width: 36px;
  height: 36px;
  border-radius: 50%;
}

.icon-button:hover,
.text-action:hover,
.meeting-actions button:hover {
  background: rgba(178, 34, 34, 0.08);
}

.empty-meetings,
.member-meeting-note {
  margin-top: 1rem;
  border: 1px dashed #d1d5db;
  border-radius: 10px;
  padding: 1rem;
  color: #6b7280;
  text-align: center;
}

.member-meeting-note i {
  color: #b22222;
  font-size: 1.35rem;
}

.meeting-card,
.meeting-detail {
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  padding: 0.85rem;
}

.meeting-card h4 {
  margin: 0 0 0.25rem;
  color: #1f2937;
}

.meeting-card p,
.meeting-detail p {
  margin: 0;
  color: #6b7280;
}

.meeting-description {
  margin-top: 0.65rem !important;
}

.meeting-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-top: 0.75rem;
  color: #4b5563;
  font-size: 0.85rem;
}

.meeting-meta a {
  color: #2563eb;
  font-weight: 700;
}

.meeting-actions {
  justify-content: flex-end;
  gap: 0.5rem;
  margin-top: 0.85rem;
}

.danger-action {
  color: #dc2626 !important;
}

.meeting-detail {
  margin-top: 1rem;
  background: #f9fafb;
}

.meeting-date-detail {
  margin-top: 0.5rem !important;
  font-weight: 700;
}

.detail-participants {
  flex-direction: row;
  flex-wrap: wrap;
  margin-top: 0.75rem;
}

.detail-participants span {
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 999px;
  padding: 0.3rem 0.65rem;
  color: #374151;
  font-size: 0.82rem;
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

.team-members-page.dark-team-members {
  background: #080b12;
  color: #eef2f8;
}

.dark-team-members .team__content-banner {
  background: linear-gradient(135deg, #e11d48 0%, #606e9b 100%);
  box-shadow: 0 18px 45px rgba(0, 0, 0, 0.24);
}

.dark-team-members .plan-meeting-btn {
  background: linear-gradient(135deg, #e11d48 0%, #9f1239 100%);
  box-shadow: 0 10px 24px rgba(225, 29, 72, 0.2);
}

.dark-team-members .plan-meeting-btn:hover {
  background: linear-gradient(135deg, #f43f5e 0%, #be123c 100%);
}

.dark-team-members .back-icon,
.dark-team-members .back-button-container:hover .back-text {
  color: #ff4f82;
}

.dark-team-members .back-text {
  color: #a7b0bf;
}

.dark-team-members .floating-action-bar,
.dark-team-members .popup__content,
.dark-team-members .meetings-modal {
  background: linear-gradient(145deg, rgba(18, 23, 33, 0.98), rgba(10, 14, 22, 0.98)) !important;
  border: 1px solid rgba(244, 63, 115, 0.24);
  color: #eef2f8;
  box-shadow: 0 18px 45px rgba(0, 0, 0, 0.24);
}

.dark-team-members .selection-text,
.dark-team-members .popup__content-title,
.dark-team-members .meetings-title,
.dark-team-members .panel-heading h3 {
  color: #eef2f8;
}

.dark-team-members .popup__member-email,
.dark-team-members .popup__member-description,
.dark-team-members .text-gray-500,
.dark-team-members .meetings-kicker,
.dark-team-members .field-label,
.dark-team-members .participant-option small,
.dark-team-members .meeting-card p,
.dark-team-members .meeting-detail p,
.dark-team-members .meeting-meta,
.dark-team-members .empty-meetings,
.dark-team-members .member-meeting-note {
  color: #a7b0bf !important;
}

.dark-team-members .message-textarea,
.dark-team-members .field-input {
  background: #10141d;
  border-color: #242a36;
  color: #eef2f8;
}

.dark-team-members .message-textarea::placeholder,
.dark-team-members .field-input::placeholder {
  color: #7d8798;
}

.dark-team-members .meeting-panel,
.dark-team-members .meeting-card,
.dark-team-members .participant-option,
.dark-team-members .empty-meetings,
.dark-team-members .member-meeting-note,
.dark-team-members .meeting-detail {
  background: rgba(16, 20, 29, 0.72);
  border-color: #242a36;
}

.dark-team-members .meeting-card h4 {
  color: #eef2f8;
}

.dark-team-members .detail-participants span {
  background: #10141d;
  border-color: #242a36;
  color: #eef2f8;
}

.dark-team-members :deep(.team-member-card) {
  background: linear-gradient(145deg, rgba(18, 23, 33, 0.98), rgba(10, 14, 22, 0.98));
  border-color: rgba(244, 63, 115, 0.24);
  color: #eef2f8;
  box-shadow: 0 12px 28px rgba(0, 0, 0, 0.18);
}

.dark-team-members :deep(.team-member-card.selection-mode:hover) {
  background: rgba(244, 63, 115, 0.08);
  border-color: rgba(244, 63, 115, 0.34);
}

.dark-team-members :deep(.custom-checkbox) {
  accent-color: #ff4f82;
}

.dark-team-members :deep(.member-name) {
  color: #eef2f8;
}

.dark-team-members :deep(.you-badge) {
  color: #a7b0bf;
}

.dark-team-members :deep(.leader-badge) {
  background-color: rgba(245, 158, 11, 0.18);
  color: #fbbf24;
}

.dark-team-members :deep(.action-icon) {
  color: #a7b0bf;
}

.dark-team-members :deep(.action-icon:hover) {
  color: #ff4f82;
}

.dark-team-members :deep(.delete-icon:hover) {
  color: #f87171;
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

  .meetings-grid,
  .time-grid {
    flex-direction: column;
  }

  .meeting-card-header {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
