<script>
import TeamMembersService from "@/services/team-members.service.js";
import { NotificationService } from "@/services/notification.service.js";
import { getAllProjects, getProjectsByLeader, getProjectsByMember } from "@/services/project.service.js";
import taskmasterLogo from "@/assets/taskmaster-logo.svg?url";

export default {
  name: "toolbar",
  data() {
    return {
      currentTheme: document.documentElement.dataset.theme || localStorage.getItem('theme') || 'light',
      members: 0,
      notifications: [],
      projects: [],
      notificationPanelOpen: false,
      selectedNotificationTab: 'all',
      teamMemberService: new TeamMembersService(),
      notificationService: new NotificationService(),
      logoUrl: taskmasterLogo
    }
  },
  props: {
    toggleNav: {
      type: Function,
      required: true
    }
  },
  computed: {
    user() {
      return this.$store.state.user || {};
    },
    roleLabel() {
      const roles = this.user?.roles || [];
      if (roles.includes('ROLE_LEADER')) return this.$t('toolbar.roles.leader');
      if (roles.includes('ROLE_MEMBER')) return this.$t('toolbar.roles.member');
      if (roles.includes('ROLE_ADMIN')) return this.$t('toolbar.roles.admin');
      return '';
    },
    userAvatar() {
      return this.user.imageUrl || this.user.profileImg || 'https://static.vecteezy.com/system/resources/previews/009/292/244/non_2x/default-avatar-icon-of-social-media-user-vector.jpg';
    },
    userName() {
      return this.user.name || this.user.email?.split('@')[0] || this.$t('toolbar.user');
    },
    logoStyle() {
      return {
        filter: this.isDarkTheme
            ? 'brightness(0) saturate(100%) invert(38%) sepia(96%) saturate(1856%) hue-rotate(318deg) brightness(101%) contrast(96%)'
            : 'brightness(0) saturate(100%) invert(18%) sepia(98%) saturate(4425%) hue-rotate(348deg) brightness(94%) contrast(98%)'
      };
    },
    notificationTabs() {
      return [
        { key: 'all', label: this.$t('toolbar.notifications.tabs.all'), count: this.notifications.length },
        { key: 'tasks', label: this.$t('toolbar.notifications.tabs.tasks'), count: this.taskNotifications.length },
        { key: 'projects', label: this.$t('toolbar.notifications.tabs.projects'), count: this.projectNotifications.length }
      ];
    },
    taskNotifications() {
      return this.notifications.filter((notification) => this.getNotificationType(notification) === 'tasks');
    },
    projectNotifications() {
      return this.notifications.filter((notification) => this.getNotificationType(notification) === 'projects');
    },
    visibleNotifications() {
      if (this.selectedNotificationTab === 'tasks') return this.taskNotifications;
      if (this.selectedNotificationTab === 'projects') return this.projectNotifications;
      return this.notifications;
    },
    isDarkTheme() {
      return this.currentTheme === 'dark';
    }
  },
  methods: {
    resolveThemePreference() {
      const preference = localStorage.getItem('theme') || 'light';
      if (preference === 'system') {
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      }
      return preference;
    },
    syncTheme(event) {
      this.currentTheme = event?.detail?.theme || document.documentElement.dataset.theme || this.resolveThemePreference();
    },
    handleToggle() {
      this.toggleNav();
    },
    navigateToProfile() {
      if (this.user && this.user.id) {
        this.$router.push(`/profile/${this.user.id}`);
      }
    },
    async toggleNotificationPanel() {
      this.notificationPanelOpen = !this.notificationPanelOpen;
      if (this.notificationPanelOpen) {
        await this.fetchNotifications();
      }
    },
    closeNotificationPanel() {
      this.notificationPanelOpen = false;
    },
    navigateToNotifications() {
      this.closeNotificationPanel();
      this.$router.push('/notifications');
    },
    async fetchProjectsForNavigation() {
      try {
        const roles = this.user?.roles || [];
        let response = [];

        if (roles.includes('ROLE_ADMIN')) {
          response = await getAllProjects();
        } else if (roles.includes('ROLE_LEADER')) {
          response = await getProjectsByLeader();
        } else {
          response = await getProjectsByMember();
        }

        this.projects = Array.isArray(response) ? response : [];
      } catch (error) {
        console.error("Error al obtener proyectos para notificaciones:", error);
        this.projects = [];
      }
    },
    normalizeText(value) {
      return (value || "")
          .toString()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .toLowerCase()
          .trim();
    },
    extractProjectName(notification) {
      const content = `${notification?.title || ""} ${notification?.message || ""}`;
      const quotedMatch = content.match(/proyecto\s+["'“”‘’]?([^"'“”‘’.,]+)["'“”‘’]?/i);
      if (quotedMatch?.[1]) return quotedMatch[1].trim();

      const projectWordMatch = content.match(/project\s+["'“”‘’]?([^"'“”‘’.,]+)["'“”‘’]?/i);
      if (projectWordMatch?.[1]) return projectWordMatch[1].trim();

      return "";
    },
    findProjectFromNotification(notification) {
      const projectName = this.normalizeText(this.extractProjectName(notification));
      if (!projectName) return null;

      return this.projects.find((project) => {
        const currentName = this.normalizeText(project.name);
        return currentName === projectName || currentName.includes(projectName) || projectName.includes(currentName);
      }) || null;
    },
    async openNotification(notification) {
      this.closeNotificationPanel();

      if (!this.projects.length) {
        await this.fetchProjectsForNavigation();
      }

      const project = this.findProjectFromNotification(notification);
      const projectId = project?.projectId || project?.id;

      if (projectId) {
        this.$router.push({ name: 'projectTodo', params: { id: projectId } });
      } else {
        this.$router.push('/projects');
      }
    },
    async fetchNotifications() {
      try {
        const response = await this.notificationService.getMyNotifications();
        this.notifications = Array.isArray(response)
            ? response.sort((a, b) => new Date(b.sentAt || 0) - new Date(a.sentAt || 0))
            : [];
      } catch (error) {
        console.error("Error al obtener notificaciones:", error);
        this.notifications = [];
      }
    },
    getNotificationType(notification) {
      const content = `${notification?.title || ''} ${notification?.message || ''}`.toLowerCase();
      const projectKeywords = ['proyecto', 'project', 'miembro', 'member', 'ingreso', 'ingresó', 'unio', 'unió', 'joined'];
      const taskKeywords = ['tarea', 'task', 'asignad', 'actualizad'];

      if (projectKeywords.some((keyword) => content.includes(keyword))) return 'projects';
      if (taskKeywords.some((keyword) => content.includes(keyword))) return 'tasks';
      return 'tasks';
    },
    getNotificationIcon(notification) {
      const type = this.getNotificationType(notification);
      const title = (notification?.title || '').toLowerCase();

      if (type === 'projects') return 'pi pi-users';
      if (title.includes('nueva') || title.includes('new')) return 'pi pi-calendar-plus';
      return 'pi pi-refresh';
    },
    formatNotificationTime(sentAt) {
      if (!sentAt) return '';
      const date = new Date(sentAt);
      if (Number.isNaN(date.getTime())) return '';
      return date.toLocaleTimeString('es-PE', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
    },
    async fetchMembers(companyId) {
      if (!companyId) return;
      try {
        const response = await this.teamMemberService.getMembers(companyId);
        const membersList = Array.isArray(response) ? response : response?.data;
        if (Array.isArray(membersList)) {
          this.members = membersList.length;
        } else {
          this.members = 0;
        }
      } catch (error) {
        console.error("Error al obtener miembros:", error);
        this.members = 0;
      }
    }
  },
  watch: {
    'user.companyId': {
      immediate: true,
      handler(newVal) {
        if (newVal) {
          this.fetchMembers(newVal);
        }
      }
    }
  },
  async mounted() {
    if (this.user && this.user.companyId) {
      await this.fetchMembers(this.user.companyId);
    }
    await this.fetchNotifications();
    await this.fetchProjectsForNavigation();
    this.currentTheme = document.documentElement.dataset.theme || this.resolveThemePreference();
    window.addEventListener('theme-changed', this.syncTheme);
    window.addEventListener('storage', this.syncTheme);
  },
  beforeUnmount() {
    window.removeEventListener('theme-changed', this.syncTheme);
    window.removeEventListener('storage', this.syncTheme);
  }
}
</script>

<template>
  <pv-toolbar class="header h-7rem px-4 w-full" :class="{ 'dark-toolbar': isDarkTheme }">
    <template #start>
      <div class="flex flex-row align-items-center gap-4">
        <i class="pi pi-bars menu-toggle-icon" @click="handleToggle"></i>
        <div class="flex flex-row align-items-center gap-3">
          <img
              class="block h-3rem w-4rem"
              :src="logoUrl"
              alt="TaskMaster"
              :style="logoStyle"
          />
          <div class="title-container flex flex-column justify-content-center line-height-2" style="gap: 2px">
            <p class="title font-semibold" style="letter-spacing: 1px;">TaskMaster</p>
            <span class="text-sm capitalize" style="letter-spacing: .8px;">{{ roleLabel }}</span>
          </div>
        </div>
      </div>
    </template>
    <template #end>
      <div class="toolbar-actions flex flex-row align-items-center gap-3">
        <div class="notifications-wrapper">
          <button
              type="button"
              class="notification-button"
              :aria-label="$t('toolbar.notifications.label')"
              @click="toggleNotificationPanel"
          >
            <i class="pi pi-bell"></i>
            <span v-if="notifications.length" class="notification-badge">{{ notifications.length }}</span>
          </button>

          <div v-if="notificationPanelOpen" class="notifications-panel">
            <div class="notifications-header">
              <h3>{{ $t('toolbar.notifications.label') }}</h3>
            </div>

            <div class="notification-tabs">
              <button
                  v-for="tab in notificationTabs"
                  :key="tab.key"
                  type="button"
                  class="notification-tab"
                  :class="{ active: selectedNotificationTab === tab.key }"
                  @click="selectedNotificationTab = tab.key"
              >
                <span>{{ tab.label }}</span>
                <small>{{ tab.count }}</small>
              </button>
            </div>

            <div class="notifications-list">
              <div
                  v-for="notification in visibleNotifications.slice(0, 4)"
                  :key="notification.id"
                  class="notification-item"
                  @click="openNotification(notification)"
              >
                <div
                    class="notification-icon"
                    :class="getNotificationType(notification)"
                >
                  <i :class="getNotificationIcon(notification)"></i>
                </div>
                <div class="notification-content">
                  <div class="notification-topline">
                    <p class="notification-title">{{ notification.title }}</p>
                    <div class="notification-meta">
                      <span>{{ formatNotificationTime(notification.sentAt) }}</span>
                      <i class="notification-dot"></i>
                    </div>
                  </div>
                  <p class="notification-message">{{ notification.message }}</p>
                </div>
              </div>

              <div v-if="!visibleNotifications.length" class="notifications-empty">
                {{ $t('toolbar.notifications.empty') }}
              </div>
            </div>

            <button type="button" class="see-all-notifications" @click="navigateToNotifications">
              {{ $t('toolbar.notifications.seeAll') }}
              <i class="pi pi-arrow-right"></i>
            </button>
          </div>
        </div>

        <pv-avatar aria-label="yesifoto"
                   class="w-3rem h-3rem align-self-center user-img"
                   :image="userAvatar"
                   shape="circle"
                   @click="navigateToProfile"
                   :class="{ active: $route.path === '/profile' }"/>
        <div class="flex flex-column justify-content-center gap-1">
          <p class="font-medium user-name"
             @click="navigateToProfile"
             :class="{ active: $route.path === '/profile' }">
            {{ userName }}</p>
          <div class="flex flex-row align-items-center gap-3">
            <p class="text-sm text-green-600 font-normal">{{ user?.companyName }}</p>
            <div class="members-quantity">
              <i class="pi pi-user mr-2 brand-accent-icon" style="font-size: .8rem"></i><span class="text-sm brand-accent-text">{{members}}</span>
            </div>
          </div>
        </div>
      </div>
    </template>
  </pv-toolbar>
</template>

<style scoped>
.header {
  --brand-500: #b22222;
  --toolbar-bg: #ffffff;
  --toolbar-text: #111827;
  --toolbar-muted: #4b5563;
  --toolbar-border: #eeeeee;
  --toolbar-panel: #ffffff;
  --toolbar-hover: #fff7fa;
  --toolbar-soft: #f0f1f3;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  border-bottom: 1px solid var(--toolbar-border);
  position: sticky;
  top: 0;
  z-index: 100;
  height: 64px;
  display: flex;
  align-items: center;
  background: var(--toolbar-bg);
  color: var(--toolbar-text);
  transition: background 0.2s ease, border-color 0.2s ease, color 0.2s ease;
}

.title-container {
  margin-top: 2px;
}

.title {
  letter-spacing: 1px;
  font-size: 1rem;
  color: var(--toolbar-text);
}

.menu-toggle-icon {
  color: var(--toolbar-text);
  font-size: 1.5rem;
  cursor: pointer;
  transition: color 0.2s ease;
  display: none;
}

.menu-toggle-icon:hover {
  color: var(--brand-500);
}

.members-quantity span {
  color: var(--brand-500);
}

.brand-accent-icon,
.brand-accent-text {
  color: var(--brand-500);
}

.toolbar-actions {
  position: relative;
}

.notifications-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.notification-button {
  width: 2.75rem;
  height: 2.75rem;
  border: 1px solid var(--toolbar-border);
  border-radius: 50%;
  background: var(--toolbar-panel);
  color: var(--toolbar-text);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  position: relative;
  box-shadow: 0 4px 14px rgba(15, 23, 42, 0.08);
  transition: transform 0.2s ease, color 0.2s ease, border-color 0.2s ease;
}

.notification-button:hover {
  color: #e40046;
  border-color: #f5c7d6;
  transform: translateY(-1px);
}

.notification-button i {
  font-size: 1.15rem;
}

.notification-badge {
  position: absolute;
  top: -0.25rem;
  right: -0.15rem;
  min-width: 1.15rem;
  height: 1.15rem;
  padding: 0 0.25rem;
  border-radius: 999px;
  background: #e40046;
  color: #ffffff;
  font-size: 0.68rem;
  font-weight: 700;
  line-height: 1.15rem;
  border: 2px solid var(--toolbar-bg);
}

.notifications-panel {
  position: absolute;
  top: calc(100% + 0.9rem);
  right: -0.5rem;
  width: min(25rem, calc(100vw - 1.5rem));
  background: var(--toolbar-panel);
  border: 1px solid var(--toolbar-border);
  border-radius: 8px;
  box-shadow: 0 18px 45px rgba(15, 23, 42, 0.16);
  overflow: hidden;
  z-index: 150;
}

.notifications-panel::before {
  content: "";
  position: absolute;
  top: -0.45rem;
  right: 1.6rem;
  width: 0.9rem;
  height: 0.9rem;
  background: var(--toolbar-panel);
  border-left: 1px solid var(--toolbar-border);
  border-top: 1px solid var(--toolbar-border);
  transform: rotate(45deg);
}

.notifications-header {
  padding: 1.2rem 1.35rem 0.7rem;
}

.notifications-header h3 {
  color: var(--toolbar-text);
  font-size: 1.28rem;
  font-weight: 700;
  line-height: 1.2;
}

.notification-tabs {
  height: 3.4rem;
  border-bottom: 1px solid var(--toolbar-border);
  display: grid;
  grid-template-columns: repeat(3, 1fr);
}

.notification-tab {
  border: 0;
  border-bottom: 2px solid transparent;
  background: transparent;
  color: var(--toolbar-muted);
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  transition: color 0.2s ease, border-color 0.2s ease;
}

.notification-tab small {
  min-width: 1.25rem;
  height: 1.25rem;
  padding: 0 0.35rem;
  border-radius: 999px;
  background: var(--toolbar-soft);
  color: var(--toolbar-muted);
  font-size: 0.72rem;
  font-weight: 700;
  line-height: 1.25rem;
}

.notification-tab.active {
  color: #e40046;
  border-bottom-color: #e40046;
}

.notification-tab.active small {
  background: #e40046;
  color: #ffffff;
}

.notifications-list {
  max-height: 20.5rem;
  overflow-y: auto;
}

.notification-item {
  min-height: 5.3rem;
  padding: 0.95rem 1rem;
  border-bottom: 1px solid var(--toolbar-border);
  display: flex;
  gap: 0.9rem;
  cursor: pointer;
  transition: background 0.2s ease;
}

.notification-item:hover {
  background: var(--toolbar-hover);
}

.notification-icon {
  width: 3.1rem;
  height: 3.1rem;
  border-radius: 50%;
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.notification-icon i {
  font-size: 1.15rem;
}

.notification-icon.tasks {
  background: #e8f1ff;
  color: #2563eb;
}

.notification-icon.projects {
  background: #eaf8e8;
  color: #168a2f;
}

.notification-content {
  min-width: 0;
  flex: 1;
}

.notification-topline {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
}

.notification-title {
  color: var(--toolbar-text);
  font-size: 0.88rem;
  font-weight: 700;
  line-height: 1.35;
}

.notification-message {
  margin-top: 0.25rem;
  color: var(--toolbar-muted);
  font-size: 0.82rem;
  font-weight: 500;
  line-height: 1.45;
}

.notification-meta {
  color: var(--toolbar-muted);
  font-size: 0.78rem;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 0.65rem;
  white-space: nowrap;
}

.notification-dot {
  width: 0.48rem;
  height: 0.48rem;
  border-radius: 50%;
  background: #e40046;
  display: inline-block;
}

.notifications-empty {
  padding: 2rem 1rem;
  color: var(--toolbar-muted);
  font-size: 0.9rem;
  text-align: center;
}

.see-all-notifications {
  width: 100%;
  height: 4rem;
  border: 0;
  background: var(--toolbar-panel);
  color: #e40046;
  font-size: 0.9rem;
  font-weight: 700;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

.see-all-notifications:hover {
  background: var(--toolbar-hover);
}

.user-img, .user-name {
  cursor: pointer;
}

.user-img {
  transition: 0.2s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.user-img:hover {
  transform: scale(1.05);
  box-shadow: 0 4px 12px rgba(255, 77, 77, 0.2);
}

.user-name {
  font-weight: 600;
  color: var(--toolbar-text);
  transition: 0.2s ease;
}

.user-name:hover {
  color: #ff4d4f;
}

.dark-toolbar {
  --brand-500: #ff4f82;
  --toolbar-bg: #080b12;
  --toolbar-text: #eef2f8;
  --toolbar-muted: #a7b0bf;
  --toolbar-border: #1f2430;
  --toolbar-panel: #10141d;
  --toolbar-hover: rgba(244, 63, 115, 0.08);
  --toolbar-soft: #1b2230;
  background: var(--toolbar-bg);
  box-shadow: 0 1px 0 rgba(255, 255, 255, 0.04), 0 12px 30px rgba(0, 0, 0, 0.28);
}

.header.dark-toolbar {
  background: #080b12 !important;
  border-color: #1f2430 !important;
}

.dark-toolbar :deep(.p-toolbar),
.dark-toolbar :deep(.p-toolbar-group-start),
.dark-toolbar :deep(.p-toolbar-group-end) {
  background: transparent !important;
}

.dark-toolbar .title-container span {
  color: #a7b0bf;
}

.dark-toolbar .notification-button {
  box-shadow: 0 10px 26px rgba(0, 0, 0, 0.28);
}

.dark-toolbar .notification-button:hover {
  border-color: rgba(244, 63, 115, 0.45);
  color: #ff4f82;
}

.dark-toolbar .notifications-panel {
  box-shadow: 0 22px 52px rgba(0, 0, 0, 0.42);
}

.dark-toolbar .notification-icon.tasks {
  background: rgba(37, 99, 235, 0.18);
  color: #7aa7ff;
}

.dark-toolbar .notification-icon.projects {
  background: rgba(22, 138, 47, 0.18);
  color: #6ee787;
}

.dark-toolbar .see-all-notifications {
  color: #ff4f82;
}

.dark-toolbar .user-img {
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.55), 0 8px 22px rgba(0, 0, 0, 0.35);
}

.dark-toolbar :deep(.p-toolbar-group-end),
.dark-toolbar :deep(.p-toolbar-group-start) {
  color: var(--toolbar-text);
}

@media (max-width: 1023px) {
  .menu-toggle-icon {
    display: block;
  }
}

@media (max-width: 640px) {
  .notifications-panel {
    right: -8.5rem;
  }

  .notifications-panel::before {
    right: 10rem;
  }

  .notification-item {
    padding-inline: 0.85rem;
  }

  .notification-title {
    font-size: 0.82rem;
  }

  .notification-message {
    font-size: 0.78rem;
  }
}
</style>
