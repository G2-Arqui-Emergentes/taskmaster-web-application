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
    }
  },
  methods: {
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
  }
}
</script>

<template>
  <aside>
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
  background-color: #f8f9fb;
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
  color: #000;
  fill: currentColor;
  stroke: currentColor;
}

.menu-text {
  font-size: 14px;
  font-weight: 500;
  letter-spacing: 0.5px;
  color: #000;
  margin: 0;
  transition: color 0.2s ease;
}

.menu-item:hover {
  background: rgba(0, 0, 0, 0.04);
}

.menu-item.active {
  background: #E11D48;
}

.menu-item.active .menu-text {
  color: #fff;
  font-weight: 600;
}

.menu-item.active .menu-icon {
  color: #fff;
  fill: currentColor;
  stroke: currentColor;
}

.footer-container {
  width: 300px;
  margin-left: 14.5px;
  padding-top: 1rem;
  border-top: 1px solid #e5e7eb;
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
  color: #4b5563;
  transition: color 0.2s ease;
}

.logout-text {
  font-size: 14px;
  font-weight: 500;
  color: #4b5563;
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
  color: #4b5563;
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
  color: #4b5563;
}

:deep(.p-dropdown .p-dropdown-trigger) {
  width: auto;
  padding-left: 0;
  padding-right: 0;
}

:deep(.p-dropdown .p-dropdown-trigger .p-dropdown-trigger-icon) {
  color: #4b5563;
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