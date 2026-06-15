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
      selectedTheme: 'light',
      passwordLastUpdated: '4 months ago',
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
      return this.user.email?.split('@')[0] || 'User';
    },
    userRole() {
      const roles = this.user.roles || [];
      if (roles.includes('ROLE_LEADER')) return 'Leader';
      if (roles.includes('ROLE_MEMBER')) return 'Member';
      if (roles.includes('ROLE_ADMIN')) return 'Admin';
      return 'Member';
    }
  },
  methods: {
    formatSalary(salary) {
      if (!salary || salary === 0) return 'Not provided';
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

      return {
        name: resolvedName.toString().trim(),
        lastName: resolvedLastName.toString().trim(),
        imageUrl: resolvedImageUrl,
        salary: resolvedSalary
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
    async updateProfileImage(imageUrl) {
      if (!imageUrl) return;
      try {
        const updatedUser = this.buildUpdatePayload({ imageUrl });
        const response = await this.userService.updateUser(updatedUser);
        this.$store.commit('setUserData', response);
        this.refreshKey++;
        this.$toast.add({ severity: 'success', summary: 'Success', detail: 'Profile picture updated', life: 3000 });
        this.showImageModal = false;
      } catch (error) {
        this.$toast.add({ severity: 'error', summary: 'Error', detail: error.response?.data?.message || 'Could not update profile picture', life: 3000 });
      }
    },
    async saveProfile(formData) {
      try {
        const updatedUser = this.buildUpdatePayload({
          name: formData?.name,
          lastName: formData?.lastName,
          salary: formData?.salary
        });
        const response = await this.userService.updateUser(updatedUser);
        this.$store.commit('setUserData', response);
        this.refreshKey++;
        this.$toast.add({ severity: 'success', summary: 'Success', detail: 'Profile updated successfully', life: 3000 });
        this.showEditModal = false;
      } catch (error) {
        this.$toast.add({ severity: 'error', summary: 'Error', detail: error.response?.data?.message || 'Could not update profile', life: 3000 });
      }
    },
    async changePassword() {
      this.$toast.add({ severity: 'info', summary: 'Coming Soon', detail: 'Password change feature will be available soon', life: 3000 });
      this.showPasswordModal = false;
    }
  }
};
</script>

<template>
  <div class="profile-page">
    <div class="profile-header">
      <h1 class="profile-title">Account Settings</h1>
      <p class="profile-subtitle">Manage your profile, security and preferences.</p>
    </div>

    <div class="profile-layout">
      <div class="profile-card">
        <div class="card-header">
          <h2 class="card-title">Profile</h2>
          <i class="pi pi-pencil edit-header-icon" @click="toggleEditMode"></i>
        </div>

        <div class="profile-avatar-section">
          <div class="avatar-wrapper" @click="openImageUpload">
            <img :src="user.imageUrl || defaultAvatar" alt="Profile picture" class="profile-avatar" />
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
            <div class="info-label">Email Address</div>
            <div class="info-value">{{ user.email || 'Not provided' }}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Phone</div>
            <div class="info-value">Not provided</div>
          </div>
          <div class="info-item">
            <div class="info-label">Age</div>
            <div class="info-value">Not provided</div>
          </div>
          <div class="info-item">
            <div class="info-label">Salary</div>
            <div class="info-value">{{ formatSalary(user.salary) }}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Bio</div>
            <div class="info-value">Not provided</div>
          </div>
        </div>
      </div>

      <div class="right-column">
        <div class="security-card">
          <div class="card-header">
            <div class="header-left">
              <i class="pi pi-shield"></i>
              <h2 class="card-title">Security</h2>
            </div>
          </div>

          <div class="security-options-wrapper">
            <div class="security-option-rectangle" @click="openChangePassword">
              <div class="option-left">
                <i class="pi pi-lock"></i>
                <div class="option-text">
                  <span class="option-title">Change password</span>
                  <span class="option-subtitle">Last updated {{ passwordLastUpdated }}</span>
                </div>
              </div>
              <i class="pi pi-angle-right option-arrow"></i>
            </div>

            <div class="security-option-rectangle">
              <div class="option-left">
                <i class="pi pi-mobile"></i>
                <div class="option-text">
                  <span class="option-title">Two Factor Authentication</span>
                  <span class="option-subtitle">Status: <span class="status-active">Active</span></span>
                </div>
              </div>
              <i class="pi pi-angle-right option-arrow"></i>
            </div>
          </div>
        </div>

        <div class="bottom-row">
          <div class="notifications-card">
            <div class="card-header">
              <div class="header-left">
                <i class="pi pi-bell"></i>
                <h2 class="card-title">Notifications</h2>
              </div>
            </div>

            <div class="notifications-wrapper">
              <div class="notification-option">
                <span class="option-title">Email Alerts</span>
                <label class="custom-toggle">
                  <input type="checkbox" v-model="notifications.email" />
                  <span class="toggle-slider"></span>
                </label>
              </div>
              <div class="notification-option">
                <span class="option-title">Push Notifications</span>
                <label class="custom-toggle">
                  <input type="checkbox" v-model="notifications.push" />
                  <span class="toggle-slider"></span>
                </label>
              </div>
              <div class="notification-option">
                <span class="option-title">Desktop Banner</span>
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
                <h2 class="card-title">Appearance</h2>
              </div>
            </div>

            <div class="appearance-wrapper">
              <div class="theme-option" :class="{ active: selectedTheme === 'light' }" @click="selectedTheme = 'light'">
                <div class="theme-left">
                  <i class="pi pi-sun"></i>
                  <span>Light Mode</span>
                </div>
                <i v-if="selectedTheme === 'light'" class="pi pi-check-circle theme-check"></i>
              </div>
              <div class="theme-option" :class="{ active: selectedTheme === 'dark' }" @click="selectedTheme = 'dark'">
                <div class="theme-left">
                  <i class="pi pi-moon"></i>
                  <span>Dark Mode</span>
                </div>
                <i v-if="selectedTheme === 'dark'" class="pi pi-check-circle theme-check"></i>
              </div>
              <div class="theme-option" :class="{ active: selectedTheme === 'system' }" @click="selectedTheme = 'system'">
                <div class="theme-left">
                  <i class="pi pi-desktop"></i>
                  <span>System Default</span>
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
  background: #f1f1f1;
  border-radius: 4px;
}

.profile-card::-webkit-scrollbar-thumb {
  background: #E5BDBE;
  border-radius: 4px;
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