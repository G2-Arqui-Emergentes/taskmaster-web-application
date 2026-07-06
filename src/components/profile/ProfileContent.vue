<script>
import { UserService } from "@/services/user.service.js";
import { mapState } from "vuex";
import Toast from "primevue/toast";
import EditProfileModal from "./EditProfileModal.vue";
import ChangePasswordModal from "./ChangePasswordModal.vue";
import UpdateImageModal from "./UpdateImageModal.vue";

export default {
  name: "ProfileContent",
  components: {
    Toast,
    EditProfileModal,
    ChangePasswordModal,
    UpdateImageModal
  },
  data() {
    return {
      userService: new UserService(),
      defaultAvatar: 'https://static.vecteezy.com/system/resources/previews/009/292/244/non_2x/default-avatar-icon-of-social-media-user-vector.jpg',
      showEditModal: false,
      showPasswordModal: false,
      showImageModal: false,
      notifications: {
        email: true,
        push: false,
        desktop: true
      },
      selectedTheme: localStorage.getItem('theme') || 'light',
      currentTheme: document.documentElement.dataset.theme || localStorage.getItem('theme') || 'light',
      passwordLastUpdated: this.$t('profile.notUpdatedInSession'),
      passwordSubmitting: false,
      googleCalendar: {
        loading: false,
        connected: false,
        googleEmail: ''
      },
      refreshKey: 0
    };
  },
  computed: {
    ...mapState(['user']),
    fullName() {
      const name = this.user.name?.trim() || '';
      const lastName = this.user.lastName?.trim() || '';
      const full = `${name} ${lastName}`.trim();
      if (full) return full;
      return this.user.email?.split('@')[0] || this.$t('profile.user');
    },
    userRole() {
      const roles = this.user.roles || [];
      if (roles.includes('ROLE_LEADER')) return this.$t('profile.roles.leader');
      if (roles.includes('ROLE_MEMBER')) return this.$t('profile.roles.member');
      if (roles.includes('ROLE_ADMIN')) return this.$t('profile.roles.admin');
      return this.$t('profile.roles.member');
    },
    isDarkTheme() {
      return this.currentTheme === 'dark';
    }
  },
  methods: {
    formatSalary(salary) {
      if (!salary || salary === 0) return this.$t('profile.notProvided');
      return `$${salary.toLocaleString()}`;
    },
    buildUpdatePayload(overrides = {}) {
      const currentUser = this.user || {};
      const resolvedName = overrides.name ?? currentUser.name ?? '';
      const resolvedLastName = overrides.lastName ?? currentUser.lastName ?? '';
      let resolvedImageUrl = (overrides.imageUrl ?? currentUser.imageUrl ?? '').toString().trim();

      if (resolvedImageUrl === this.defaultAvatar || resolvedImageUrl.includes('vecteezy')) {
        resolvedImageUrl = '';
      }

      const resolvedSalaryRaw = overrides.salary ?? currentUser.salary ?? 0;
      const resolvedSalary = Number.isFinite(Number(resolvedSalaryRaw)) ? Number(resolvedSalaryRaw) : 0;
      const resolvedAgeRaw = overrides.age ?? currentUser.age ?? null;
      const resolvedAge = resolvedAgeRaw === null || resolvedAgeRaw === ''
          ? null
          : (Number.isFinite(Number(resolvedAgeRaw)) ? Number(resolvedAgeRaw) : null);

      return {
        name: resolvedName.toString().trim(),
        lastName: resolvedLastName.toString().trim(),
        imageUrl: resolvedImageUrl,
        salary: resolvedSalary,
        phone: (overrides.phone ?? currentUser.phone ?? '').toString().trim(),
        age: resolvedAge,
        bio: (overrides.bio ?? currentUser.bio ?? '').toString().trim()
      };
    },
    toggleEditMode() {
      this.showEditModal = true;
    },
    openImageUpload() {
      this.showImageModal = true;
    },
    openChangePassword() {
      this.showPasswordModal = true;
    },
    connectGoogleCalendar() {
      const token = this.userService.normalizeToken(localStorage.getItem('token'));

      if (!token) {
        console.error('[Google Calendar] Cannot open OAuth popup because there is no auth token');
        return;
      }

      console.log('[Google Calendar] Opening OAuth popup');
      const popup = window.open(
          `https://backend-taskmaster-1.onrender.com/api/v1/google/connect?token=${encodeURIComponent(token)}`,
          "google-calendar-connect",
          "width=500,height=650"
      );

      if (!popup) {
        console.error('[Google Calendar] Popup blocked or could not be opened');
      }
    },
    handleGoogleMessage(event) {
      console.log('[Google Calendar] Message received:', event.origin, event.data);
      if (event.data?.type === "GOOGLE_CONNECTED") {
        console.log('[Google Calendar] Connection message received, refreshing status');
        this.fetchGoogleCalendarStatus();
      }
    },
    async fetchGoogleCalendarStatus() {
      console.log('[Google Calendar] Checking connection status');
      this.googleCalendar.loading = true;
      try {
        const headers = this.userService.getHeadersAuthorization();
        const response = await this.userService.http.get('/api/v1/google/status', { headers });
        console.log('[Google Calendar] Status response:', response.data);
        this.googleCalendar.connected = Boolean(response.data?.connected);
        this.googleCalendar.googleEmail = response.data?.googleEmail || '';
      } catch (error) {
        console.error('[Google Calendar] Status request failed:', error.response?.data || error.message || error);
        this.googleCalendar.connected = false;
        this.googleCalendar.googleEmail = '';
      } finally {
        this.googleCalendar.loading = false;
      }
    },
    async updateProfileImage(imageUrl) {
      if (!imageUrl) return;
      try {
        const updatedUser = this.buildUpdatePayload({ imageUrl });
        const response = await this.userService.updateUser(updatedUser);
        this.$store.commit('setUserData', response);
        this.refreshKey++;
        this.$toast.add({ severity: 'success', summary: this.$t('profile.toast.success'), detail: this.$t('profile.toast.profilePictureUpdated'), life: 3000 });
        this.showImageModal = false;
      } catch (error) {
        this.$toast.add({ severity: 'error', summary: this.$t('profile.toast.error'), detail: error.response?.data?.message || this.$t('profile.toast.couldNotUpdateProfilePicture'), life: 3000 });
      }
    },
    async saveProfile(formData) {
      try {
        const updatedUser = this.buildUpdatePayload({
          name: formData?.name,
          lastName: formData?.lastName,
          salary: formData?.salary,
          phone: formData?.phone,
          age: formData?.age,
          bio: formData?.bio
        });
        const response = await this.userService.updateUser(updatedUser);
        this.$store.commit('setUserData', response);
        this.refreshKey++;
        this.$toast.add({ severity: 'success', summary: this.$t('profile.toast.success'), detail: this.$t('profile.toast.profileUpdated'), life: 3000 });
        this.showEditModal = false;
      } catch (error) {
        this.$toast.add({ severity: 'error', summary: this.$t('profile.toast.error'), detail: error.response?.data?.message || this.$t('profile.toast.couldNotUpdateProfile'), life: 3000 });
      }
    },
    async changePassword(payload) {
      if (this.passwordSubmitting) return;

      this.passwordSubmitting = true;
      try {
        await this.userService.changePassword(payload?.current, payload?.new);
        this.passwordLastUpdated = this.$t('profile.justNow');
        this.showPasswordModal = false;
        this.$toast.add({ severity: 'success', summary: this.$t('profile.toast.success'), detail: this.$t('profile.toast.passwordChanged'), life: 3000 });
      } catch (error) {
        const detail = error.response?.data?.message
            || error.response?.data
            || this.$t('profile.toast.couldNotChangePassword');
        this.$toast.add({ severity: 'error', summary: this.$t('profile.toast.error'), detail, life: 4000 });
      } finally {
        this.passwordSubmitting = false;
      }
    },
    selectTheme(theme) {
      this.selectedTheme = theme;
      localStorage.setItem('theme', theme);
      this.applyTheme();
    },
    applyTheme() {
      const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const resolvedTheme = this.selectedTheme === 'system'
          ? (systemPrefersDark ? 'dark' : 'light')
          : this.selectedTheme;

      document.documentElement.dataset.theme = resolvedTheme;
      document.documentElement.dataset.themePreference = this.selectedTheme;
      this.currentTheme = resolvedTheme;
      window.dispatchEvent(new CustomEvent('theme-changed', {
        detail: {
          theme: resolvedTheme,
          preference: this.selectedTheme
        }
      }));
    },
    handleSystemThemeChange() {
      if (this.selectedTheme === 'system') {
        this.applyTheme();
      }
    }
  },
  mounted() {
    this.applyTheme();
    this.fetchGoogleCalendarStatus();
    window.addEventListener('message', this.handleGoogleMessage);
    this.systemThemeQuery = window.matchMedia('(prefers-color-scheme: dark)');
    this.systemThemeQuery.addEventListener('change', this.handleSystemThemeChange);
  },
  beforeUnmount() {
    window.removeEventListener('message', this.handleGoogleMessage);
    this.systemThemeQuery?.removeEventListener('change', this.handleSystemThemeChange);
  }
};
</script>

<template>
  <div class="profile-page" :class="{ 'dark-profile': isDarkTheme }">
    <div class="profile-header">
      <h1 class="profile-title">{{ $t('profile.accountSettings') }}</h1>
      <p class="profile-subtitle">{{ $t('profile.subtitle') }}</p>
    </div>

    <div class="profile-layout">
      <div class="profile-card">
        <div class="card-header">
          <h2 class="card-title">{{ $t('profile.profile') }}</h2>
          <i class="pi pi-pencil edit-header-icon" @click="toggleEditMode"></i>
        </div>

        <div class="profile-avatar-section">
          <div class="avatar-wrapper" @click="openImageUpload">
            <img :src="user.imageUrl || defaultAvatar" :alt="$t('profile.profilePicture')" class="profile-avatar" />
            <div class="avatar-overlay">
              <i class="pi pi-camera"></i>
            </div>
          </div>
        </div>

        <div class="profile-name-section">
          <h3 class="profile-fullname">{{ fullName }}</h3>
          <p class="profile-role">{{ userRole }}</p>
        </div>

        <div class="profile-divider"></div>

        <div class="profile-info-section">
          <div class="info-item">
            <div class="info-label">{{ $t('profile.emailAddress') }}</div>
            <div class="info-value">{{ user.email || $t('profile.notProvided') }}</div>
          </div>
          <div class="info-item">
            <div class="info-label">{{ $t('profile.phone') }}</div>
            <div class="info-value">{{ user.phone || $t('profile.notProvided') }}</div>
          </div>
          <div class="info-item">
            <div class="info-label">{{ $t('profile.age') }}</div>
            <div class="info-value">{{ user.age || $t('profile.notProvided') }}</div>
          </div>
          <div class="info-item">
            <div class="info-label">{{ $t('profile.salary') }}</div>
            <div class="info-value">{{ formatSalary(user.salary) }}</div>
          </div>
          <div class="info-item">
            <div class="info-label">{{ $t('profile.bio') }}</div>
            <div class="info-value">{{ user.bio || $t('profile.notProvided') }}</div>
          </div>
        </div>
      </div>

      <div class="right-column">
        <div class="security-card">
          <div class="card-header">
            <div class="header-left">
              <i class="pi pi-shield"></i>
              <h2 class="card-title">{{ $t('profile.security') }}</h2>
            </div>
          </div>

          <div class="security-options-wrapper">
            <div class="security-option-rectangle" @click="openChangePassword">
              <div class="option-left">
                <i class="pi pi-lock"></i>
                <div class="option-text">
                  <span class="option-title">{{ $t('profile.changePassword') }}</span>
                  <span class="option-subtitle">{{ $t('profile.lastUpdated', { value: passwordLastUpdated }) }}</span>
                </div>
              </div>
              <i class="pi pi-angle-right option-arrow"></i>
            </div>

            <div class="security-option-rectangle">
              <div class="option-left">
                <i class="pi pi-mobile"></i>
                <div class="option-text">
                  <span class="option-title">{{ $t('profile.twoFactorAuthentication') }}</span>
                  <span class="option-subtitle">{{ $t('profile.status') }}: <span class="status-active">{{ $t('profile.active') }}</span></span>
                </div>
              </div>
              <i class="pi pi-angle-right option-arrow"></i>
            </div>
          </div>
        </div>

        <div class="google-calendar-card">
          <div class="card-header">
            <div class="header-left">
              <i class="pi pi-calendar"></i>
              <h2 class="card-title">Google Calendar</h2>
            </div>
          </div>

          <div class="google-calendar-content">
            <div class="calendar-status">
              <span
                  class="calendar-status-dot"
                  :class="{ connected: googleCalendar.connected }"
              ></span>
              <span v-if="googleCalendar.loading" class="option-subtitle">Checking connection...</span>
              <span v-else-if="googleCalendar.connected" class="option-subtitle">
                Connected as {{ googleCalendar.googleEmail }}
              </span>
              <span v-else class="option-subtitle">Google Calendar not connected</span>
            </div>

            <button
                v-if="!googleCalendar.connected"
                class="calendar-connect-button"
                type="button"
                @click="connectGoogleCalendar"
            >
              Connect Google Calendar
            </button>
          </div>
        </div>

        <div class="bottom-row">
          <div class="notifications-card">
            <div class="card-header">
              <div class="header-left">
                <i class="pi pi-bell"></i>
                <h2 class="card-title">{{ $t('profile.notifications') }}</h2>
              </div>
            </div>

            <div class="notifications-wrapper">
              <div class="notification-option">
                <span class="option-title">{{ $t('profile.emailAlerts') }}</span>
                <label class="custom-toggle">
                  <input type="checkbox" v-model="notifications.email" />
                  <span class="toggle-slider"></span>
                </label>
              </div>
              <div class="notification-option">
                <span class="option-title">{{ $t('profile.pushNotifications') }}</span>
                <label class="custom-toggle">
                  <input type="checkbox" v-model="notifications.push" />
                  <span class="toggle-slider"></span>
                </label>
              </div>
              <div class="notification-option">
                <span class="option-title">{{ $t('profile.desktopBanner') }}</span>
                <label class="custom-toggle">
                  <input type="checkbox" v-model="notifications.desktop" />
                  <span class="toggle-slider"></span>
                </label>
              </div>
            </div>
          </div>

          <div class="appearance-card">
            <div class="card-header">
              <div class="header-left">
                <i class="pi pi-palette"></i>
                <h2 class="card-title">{{ $t('profile.appearance') }}</h2>
              </div>
            </div>

            <div class="appearance-wrapper">
              <div class="theme-option" :class="{ active: selectedTheme === 'light' }" @click="selectTheme('light')">
                <div class="theme-left">
                  <i class="pi pi-sun"></i>
                  <span>{{ $t('profile.lightMode') }}</span>
                </div>
                <i v-if="selectedTheme === 'light'" class="pi pi-check-circle theme-check"></i>
              </div>
              <div class="theme-option" :class="{ active: selectedTheme === 'dark' }" @click="selectTheme('dark')">
                <div class="theme-left">
                  <i class="pi pi-moon"></i>
                  <span>{{ $t('profile.darkMode') }}</span>
                </div>
                <i v-if="selectedTheme === 'dark'" class="pi pi-check-circle theme-check"></i>
              </div>
              <div class="theme-option" :class="{ active: selectedTheme === 'system' }" @click="selectTheme('system')">
                <div class="theme-left">
                  <i class="pi pi-desktop"></i>
                  <span>{{ $t('profile.systemDefault') }}</span>
                </div>
                <i v-if="selectedTheme === 'system'" class="pi pi-check-circle theme-check"></i>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <EditProfileModal
        v-model:visible="showEditModal"
        :userData="user"
        @save="saveProfile"
    />
    <ChangePasswordModal
        v-model:visible="showPasswordModal"
        :submitting="passwordSubmitting"
        @changePassword="changePassword"
    />
    <UpdateImageModal
        v-model:visible="showImageModal"
        :currentImageUrl="user.imageUrl"
        @updateImage="updateProfileImage"
    />

    <Toast />
  </div>
</template>

<style scoped>
.profile-page {
  max-width: 1400px;
  margin: 0 auto;
  background: #f5f7fa;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
}

.profile-header {
  margin-bottom: 1.5rem;
  flex-shrink: 0;
}

.profile-title {
  font-size: 28px;
  font-weight: 700;
  color: #1a1a2e;
  margin: 0 0 8px 0;
  font-family: 'Lora', serif;
}

.profile-subtitle {
  font-size: 15px;
  color: #666;
  margin: 0;
}

.profile-layout {
  display: flex;
  gap: 1.5rem;
}

.profile-card {
  flex: 1;
  min-width: 320px;
  background: white;
  border-radius: 14px;
  border: 1px solid #E5BDBE;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  flex-shrink: 0;
}

.card-title {
  font-size: 18px;
  font-weight: 600;
  color: #1a1a2e;
  margin: 0;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.header-left i {
  font-size: 1.2rem;
  color: #B80035;
}

.edit-header-icon {
  color: #B80035;
  font-size: 1.1rem;
  cursor: pointer;
  transition: opacity 0.2s;
}
.edit-header-icon:hover {
  opacity: 0.7;
}

.profile-avatar-section {
  display: flex;
  justify-content: center;
  margin-bottom: 1rem;
  flex-shrink: 0;
}

.avatar-wrapper {
  position: relative;
  width: 150px;
  height: 150px;
  cursor: pointer;
}

.profile-avatar {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  object-fit: cover;
}

.avatar-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.3s;
}

.avatar-overlay i {
  color: white;
  font-size: 2rem;
}

.avatar-wrapper:hover .avatar-overlay {
  opacity: 1;
}

.profile-name-section {
  text-align: center;
  margin-bottom: 1rem;
  flex-shrink: 0;
}

.profile-fullname {
  font-size: 24px;
  font-weight: 600;
  color: #1a1a2e;
  margin: 0 0 8px 0;
}

.profile-role {
  font-size: 15px;
  color: #B80035;
  margin: 0;
}

.profile-divider {
  height: 1px;
  background: #e0e0e0;
  margin: 1rem 0;
  flex-shrink: 0;
}

.profile-info-section {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  flex: 1;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.info-label {
  font-size: 13px;
  font-weight: 600;
  color: #1a1a2e;
}

.info-value {
  font-size: 13px;
  color: #7E7E7E;
  word-break: break-word;
}

.right-column {
  flex: 1;
  min-width: 320px;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.security-card {
  background: white;
  border-radius: 14px;
  border: 1px solid #E5BDBE;
  padding: 1.5rem;
  flex-shrink: 0;
}

.security-options-wrapper {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.google-calendar-card {
  background: white;
  border-radius: 14px;
  border: 1px solid #E5BDBE;
  padding: 1.5rem;
  flex-shrink: 0;
}

.google-calendar-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
}

.calendar-status {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  min-width: 0;
}

.calendar-status-dot {
  width: 10px;
  height: 10px;
  border-radius: 999px;
  background: #906F70;
  flex-shrink: 0;
}

.calendar-status-dot.connected {
  background: #16a34a;
}

.calendar-connect-button {
  border: 0;
  border-radius: 8px;
  background: #B80035;
  color: white;
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
  padding: 0.7rem 1rem;
  white-space: nowrap;
  transition: background 0.2s, transform 0.2s;
}

.calendar-connect-button:hover {
  background: #E11D48;
  transform: translateY(-1px);
}

.security-option-rectangle {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  border-radius: 14px;
  border: 1px solid #E5BDBE;
  cursor: pointer;
  transition: all 0.2s;
}

.security-option-rectangle:hover {
  background: #fef5f5;
}

.option-left {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.option-left i {
  font-size: 1.2rem;
  color: #B80035;
  width: 24px;
}

.option-text {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.option-title {
  font-size: 14px;
  font-weight: 500;
  color: #1a1a2e;
}

.option-subtitle {
  font-size: 12px;
  color: #888;
}

.status-active {
  color: #B80035;
  font-weight: 500;
}

.option-arrow {
  color: #B80035;
  font-size: 1.2rem;
}

.bottom-row {
  display: flex;
  gap: 1.5rem;
}

.notifications-card,
.appearance-card {
  flex: 1;
  background: white;
  border-radius: 14px;
  border: 1px solid #E5BDBE;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
}

.notifications-wrapper,
.appearance-wrapper {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.notification-option {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 0;
}

.notification-option .option-title {
  font-size: 14px;
  font-weight: 500;
  color: #1a1a2e;
}

.custom-toggle {
  position: relative;
  display: inline-block;
  width: 44px;
  height: 24px;
  flex-shrink: 0;
}

.custom-toggle input {
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #906F70;
  border-radius: 34px;
  transition: 0.2s;
}

.toggle-slider:before {
  position: absolute;
  content: "";
  height: 18px;
  width: 18px;
  left: 3px;
  bottom: 3px;
  background-color: white;
  border-radius: 50%;
  transition: 0.2s;
}

input:checked + .toggle-slider {
  background-color: #B80035;
}

input:checked + .toggle-slider:before {
  transform: translateX(20px);
}

.theme-option {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.7rem 1rem;
  border-radius: 8px;
  border: 1px solid #B80035;
  cursor: pointer;
  transition: all 0.2s;
}

.theme-option.active {
  background: #E11D48;
  border-color: #E11D48;
}

.theme-option.active .theme-left,
.theme-option.active .theme-left i,
.theme-option.active .theme-left span {
  color: white;
}

.theme-option.active .theme-check {
  color: white;
}

.theme-left {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.theme-left i {
  font-size: 1rem;
  color: #B80035;
}

.theme-left span {
  font-size: 13px;
  color: #1a1a2e;
}

.theme-check {
  color: #B80035;
  font-size: 1rem;
}

.profile-card::-webkit-scrollbar {
  width: 4px;
}

.profile-card::-webkit-scrollbar-track {
  background: var(--scrollbar-track);
  border-radius: 4px;
}

.profile-card::-webkit-scrollbar-thumb {
  background: var(--scrollbar-thumb);
  border-radius: 4px;
}

.profile-page.dark-profile {
  background: #080b12;
  color: #eef2f8;
}

.dark-profile .profile-title,
.dark-profile .profile-role,
.dark-profile .header-left i,
.dark-profile .edit-header-icon,
.dark-profile .option-left i,
.dark-profile .option-arrow,
.dark-profile .theme-left i,
.dark-profile .theme-check,
.dark-profile .status-active {
  color: #ff4f82;
}

.dark-profile .profile-subtitle,
.dark-profile .info-value,
.dark-profile .option-subtitle {
  color: #a7b0bf;
}

.dark-profile .profile-card,
.dark-profile .security-card,
.dark-profile .google-calendar-card,
.dark-profile .notifications-card,
.dark-profile .appearance-card {
  background: linear-gradient(145deg, rgba(18, 23, 33, 0.98), rgba(10, 14, 22, 0.98));
  border-color: rgba(244, 63, 115, 0.24);
  color: #eef2f8;
  box-shadow: 0 18px 45px rgba(0, 0, 0, 0.24);
}

.dark-profile .card-title,
.dark-profile .profile-fullname,
.dark-profile .info-label,
.dark-profile .option-title,
.dark-profile .notification-option .option-title,
.dark-profile .theme-left span {
  color: #eef2f8;
}

.dark-profile .profile-divider {
  background: #252b38;
}

.dark-profile .security-option-rectangle,
.dark-profile .theme-option {
  background: #10141d;
  border-color: rgba(244, 63, 115, 0.24);
}

.dark-profile .security-option-rectangle:hover,
.dark-profile .theme-option:hover {
  background: rgba(244, 63, 115, 0.08);
  border-color: rgba(244, 63, 115, 0.34);
}

.dark-profile .theme-option.active {
  background: #e11d48;
  border-color: #e11d48;
}

.dark-profile .toggle-slider {
  background-color: #4b5563;
}

.dark-profile .calendar-connect-button {
  background: #e11d48;
}

.dark-profile .calendar-connect-button:hover {
  background: #ff4f82;
}

.dark-profile input:checked + .toggle-slider {
  background-color: #ff4f82;
}

@media (max-width: 900px) {
  .profile-page {
    height: auto;
    overflow-y: auto;
  }

  .profile-layout {
    flex-direction: column;
    min-height: auto;
  }

  .right-column {
    min-height: auto;
  }

  .bottom-row {
    flex-direction: column;
  }

  .google-calendar-content {
    align-items: flex-start;
    flex-direction: column;
  }
}
@media (max-width: 768px) {
  .profile-page {
    padding: 1rem;
  }

  .profile-card,
  .right-column {
    min-width: auto;
  }
}
</style>
