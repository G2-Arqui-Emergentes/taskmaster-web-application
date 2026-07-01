<script>
import HomeIcon from '../assets/dashboard-icon.svg';
import ProjectIcon from '../assets/projects-icon.svg';
import AnalyticsIcon from '../assets/analytics-icon.svg';
import CalendarIcon from '../assets/calendar-icon.svg';
import TeamIcon from '../assets/team-icon.svg';
import PostIcon from '../assets/post-icon.svg'
import {mapState} from "vuex";

export default {
  name: "sidebar",
  components: {
    HomeIcon,
    ProjectIcon,
    AnalyticsIcon,
    CalendarIcon,
    TeamIcon,
    PostIcon,
  },
  data() {
    return {
      currentTheme: document.documentElement.dataset.theme || localStorage.getItem('theme') || 'light',
      selectedCountry: {name: 'English', code: 'en', flag: 'https://m.media-amazon.com/images/S/aplus-seller-content-images-us-east-1/ATVPDKIKX0DER/A2CS421R6PZ7VX/62606ba4-5d5c-4b79-b31c-1de7719d6bf5._CR574,184,1266,1266_PT0_SX300__.jpg'},
      countries: [
        {name: 'Spanish', code: 'es', flag: 'https://ih1.redbubble.net/image.3267488605.3818/raf,360x360,075,t,fafafa:ca443f4786.jpg'},
        {name: 'English', code: 'en', flag: 'https://m.media-amazon.com/images/S/aplus-seller-content-images-us-east-1/ATVPDKIKX0DER/A2CS421R6PZ7VX/62606ba4-5d5c-4b79-b31c-1de7719d6bf5._CR574,184,1266,1266_PT0_SX300__.jpg'},
      ]
    };
  },
  props: {
    sidebarVisible: {
      type: Boolean,
      required: true
    }
  },
  computed: {
    ...mapState(['user']),
    roleLower() {
      return (this.user?.role ?? '').toString().trim().toLowerCase();
    },
    isManager() {
      return this.roleLower === '0' || this.roleLower === 'manager';
    },
    hasUser() {
      return !!this.user && Object.keys(this.user).length > 0;
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
    navigateToHome() {
      this.$router.push('/home');
    },
    navigateToProjects() {
      this.$router.push('/projects');
    },
    navigateToAnalytics() {
      this.$router.push('/analytics');
    },
    navigateToCalendar() {
      this.$router.push('/calendar');
    },
    navigateToTeam() {
      this.$router.push('/team');
    },
    navigateToNotifications() {
      this.$router.push('/notifications');
    },
    navigateToLogin() {
      this.$store.commit('removeUser');
      this.$store.commit('removeToken');
      this.$router.push('/login');
    },
    navigateToCreatePost() {
      this.$router.push('/new-post');
    },
    changeLanguage(lang) {
      this.$i18n.locale = lang;
    }
  },
  mounted() {
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
  <aside :class="{ 'dark-sidebar': isDarkTheme }">
    <div class="sidebar-content">
      <ul class="menu-list">
        <li class="menu-item"
            @click="navigateToHome"
            :class="{ active: $route.path === '/home' }">
          <HomeIcon class="menu-icon" />
          <p class="menu-text" v-t="'sidebar.dashboard'">Dashboard</p>
        </li>

        <li class="menu-item"
            @click="navigateToProjects"
            :class="{ active: $route.path === '/projects' }">
          <ProjectIcon class="menu-icon" />
          <p class="menu-text" v-t="'sidebar.projects'">Projects</p>
        </li>

        <li class="menu-item"
            @click="navigateToAnalytics"
            :class="{ active: $route.path === '/analytics' }">
          <AnalyticsIcon class="menu-icon" />
          <p class="menu-text" v-t="'sidebar.analytics'">Analytics</p>
        </li>

        <li class="menu-item"
            @click="navigateToCalendar"
            :class="{ active: $route.path === '/calendar' }">
          <CalendarIcon class="menu-icon" />
          <p class="menu-text" v-t="'sidebar.calendar'">Calendar</p>
        </li>

        <li class="menu-item"
            @click="navigateToCreatePost"
            :class="{ active: $route.path === '/new-post' }"
            v-if="isManager">
          <PostIcon class="menu-icon" />
          <p class="menu-text" v-t="'sidebar.createpost'">Create Post</p>
        </li>

        <li class="menu-item"
            @click="navigateToTeam"
            :class="{ active: $route.path === '/team' }"
            v-if="hasUser">
          <TeamIcon class="menu-icon" />
          <p class="menu-text">Team</p>
        </li>

        <li class="menu-item"
            @click="navigateToNotifications"
            :class="{ active: $route.path === '/notifications' }"
            v-if="hasUser">
          <i class="pi pi-bell menu-icon"></i>
          <p class="menu-text">Notifications</p>
        </li>
      </ul>

      <div class="footer-container">
        <div class="footer-row">
          <div @click="navigateToLogin()" class="logout-item">
            <i class="pi pi-sign-out logout-icon"></i>
            <p class="logout-text" v-t="'sidebar.logout'">Log out</p>
          </div>
          <div class="language-item">
            <pv-dropdown
                v-model="selectedCountry"
                :options="countries"
                optionLabel="name"
                placeholder="Language"
                @change="changeLanguage(selectedCountry.code)"
            >
              <template #value="slotProps">
                <div v-if="slotProps.value" class="language-value">
                  <img :alt="slotProps.value.label"
                       :src="slotProps.value.flag"
                       class="language-flag" />
                  <span>{{ slotProps.value.name }}</span>
                </div>
                <span v-else>{{ slotProps.placeholder }}</span>
              </template>
              <template #option="slotProps">
                <div class="language-option">
                  <img :alt="slotProps.option.label"
                       :src="slotProps.option.flag"
                       class="language-flag" />
                  <span>{{ slotProps.option.name }}</span>
                </div>
              </template>
            </pv-dropdown>
          </div>
        </div>
      </div>
    </div>
  </aside>
</template>

<style scoped>
aside {
  --brand-500: #b22222;
  --brand-600: #8f1c1c;
  --sidebar-bg: #f8f9fb;
  --sidebar-text: #000;
  --sidebar-muted: #4b5563;
  --sidebar-hover: rgba(0, 0, 0, 0.04);
  --sidebar-active-bg: #E11D48;
  --sidebar-active-text: #fff;
  --sidebar-border: #e5e7eb;
  background-color: var(--sidebar-bg);
  box-sizing: border-box;
  height: 100%;
  overflow-y: auto;
}

.sidebar-content {
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 1.5rem 0 1.5rem 0;
}

.menu-list {
  display: flex;
  flex-direction: column;
  gap: 0.875rem;
  margin: 0;
  padding: 0 0 0 14.5px;
  list-style: none;
}

.menu-item {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 1rem;
  width: 300px;
  height: 52px;
  padding: 0 1rem;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.menu-icon {
  width: 28px;
  height: 28px;
  flex-shrink: 0;
  color: var(--sidebar-text);
  fill: currentColor;
  stroke: currentColor;
  transition: color 0.2s ease, fill 0.2s ease, stroke 0.2s ease;
}

i.menu-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 1.35rem;
}

.menu-text {
  font-size: 14px;
  font-weight: 500;
  letter-spacing: 0.5px;
  color: var(--sidebar-text);
  margin: 0;
  transition: color 0.2s ease;
}

.menu-item:hover {
  background: var(--sidebar-hover);
}

.menu-item.active {
  background: var(--sidebar-active-bg);
}

.menu-item.active .menu-text {
  color: var(--sidebar-active-text);
  font-weight: 600;
}

.menu-item.active .menu-icon {
  color: var(--sidebar-active-text);
  fill: currentColor;
  stroke: currentColor;
}

.footer-container {
  width: 300px;
  margin-left: 14.5px;
  padding-top: 1rem;
  border-top: 1px solid var(--sidebar-border);
}

.footer-row {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 0 1rem;
  box-sizing: border-box;
}

.logout-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.logout-icon {
  font-size: 1.25rem;
  color: var(--sidebar-muted);
  transition: color 0.2s ease;
}

.logout-text {
  font-size: 14px;
  font-weight: 500;
  color: var(--sidebar-muted);
  margin: 0;
  transition: color 0.2s ease;
}

.logout-item:hover .logout-icon,
.logout-item:hover .logout-text {
  color: var(--brand-600);
}

.language-item {
  display: flex;
  align-items: center;
}

.language-value {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 14px;
  font-weight: 500;
  color: var(--sidebar-muted);
}

.language-option {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 14px;
  padding: 0.5rem 0;
}

.language-flag {
  width: 20px;
  height: 20px;
  border-radius: 2px;
  object-fit: cover;
}

:deep(.p-dropdown) {
  background: transparent;
  border: none;
  padding: 0;
  min-width: 100px;
}

:deep(.p-dropdown .p-dropdown-label) {
  padding: 0.5rem 0.5rem 0.5rem 0;
  font-size: 14px;
  font-weight: 500;
  color: var(--sidebar-muted);
}

:deep(.p-dropdown .p-dropdown-trigger) {
  width: auto;
  padding-left: 0;
  padding-right: 0;
}

:deep(.p-dropdown .p-dropdown-trigger .p-dropdown-trigger-icon) {
  color: var(--sidebar-muted);
  font-size: 0.85rem;
  margin-left: 0.25rem;
}

:deep(.p-dropdown-panel) {
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  margin-top: 4px;
}

:deep(.p-dropdown-items) {
  padding: 0.25rem 0;
}

:deep(.p-dropdown-item) {
  padding: 0.6rem 1rem;
  font-size: 14px;
  font-weight: 500;
  color: #374151;
}

:deep(.p-dropdown-item:hover) {
  background: #f3f4f6;
}

:deep(.p-dropdown-item.p-highlight) {
  background: #fef2f2;
  color: var(--brand-500);
}

aside.dark-sidebar {
  --brand-500: #f43f73;
  --brand-600: #fb7185;
  --sidebar-bg: #080b12;
  --sidebar-text: #d8dee9;
  --sidebar-muted: #9aa3b2;
  --sidebar-hover: rgba(244, 63, 115, 0.08);
  --sidebar-active-bg: rgba(225, 29, 72, 0.28);
  --sidebar-active-text: #ff4f82;
  --sidebar-border: #1f2430;
  background: var(--sidebar-bg);
  border-right: 1px solid #151a24;
}

aside.dark-sidebar .sidebar-content {
  background: transparent;
}

aside.dark-sidebar .menu-item {
  color: var(--sidebar-text);
}

aside.dark-sidebar .menu-item.active {
  border: 1px solid rgba(244, 63, 115, 0.28);
  box-shadow: inset 0 0 24px rgba(225, 29, 72, 0.16), 0 10px 28px rgba(225, 29, 72, 0.08);
}

aside.dark-sidebar .menu-item.active .menu-text {
  text-shadow: 0 0 10px rgba(244, 63, 115, 0.18);
}

aside.dark-sidebar .logout-item:hover .logout-icon,
aside.dark-sidebar .logout-item:hover .logout-text {
  color: var(--brand-600);
}

aside.dark-sidebar :deep(.p-dropdown-panel) {
  background: #10141d;
  border: 1px solid #242a36;
  box-shadow: 0 18px 38px rgba(0, 0, 0, 0.38);
}

aside.dark-sidebar :deep(.p-dropdown-item) {
  color: #d8dee9;
}

aside.dark-sidebar :deep(.p-dropdown-item:hover) {
  background: rgba(244, 63, 115, 0.08);
}

aside.dark-sidebar :deep(.p-dropdown-item.p-highlight) {
  background: rgba(225, 29, 72, 0.18);
  color: #ff4f82;
}

@media (max-width: 1023px) {
  .menu-list {
    padding: 0 0 0 10px;
    gap: 0.75rem;
  }

  .menu-item {
    width: 260px;
    padding: 0 0.75rem;
  }

  .menu-icon {
    width: 26px;
    height: 26px;
  }

  .footer-container {
    width: 260px;
    margin-left: 10px;
  }

  .footer-row {
    padding: 0 0.75rem;
  }
}
</style>
