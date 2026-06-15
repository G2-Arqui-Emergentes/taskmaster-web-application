<script>
import TeamMembersService from "@/services/team-members.service.js";

export default {
  name: "toolbar",
  data() {
    return {
      members: 0,
      teamMemberService: new TeamMembersService()
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
      if (roles.includes('ROLE_LEADER')) return 'Leader';
      if (roles.includes('ROLE_MEMBER')) return 'Member';
      if (roles.includes('ROLE_ADMIN')) return 'Admin';
      return '';
    },
    userAvatar() {
      return this.user.imageUrl || this.user.profileImg || 'https://static.vecteezy.com/system/resources/previews/009/292/244/non_2x/default-avatar-icon-of-social-media-user-vector.jpg';
    },
    userName() {
      return this.user.name || this.user.email?.split('@')[0] || 'User';
    }
  },
  methods: {
    handleToggle() {
      this.toggleNav();
    },
    navigateToProfile() {
      if (this.user && this.user.id) {
        this.$router.push(`/profile/${this.user.id}`);
      }
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
  }
}
</script>

<template>
  <pv-toolbar class="header h-7rem px-4 w-full">
    <template #start>
      <div class="flex flex-row align-items-center gap-4">
        <i class="pi pi-bars menu-toggle-icon" @click="handleToggle"></i>
        <div class="flex flex-row align-items-center gap-3">
          <img
              class="block h-3rem w-4rem"
              src="../assets/taskmaster-logo.svg"
              alt="TaskMaster"
              style="filter: brightness(0) saturate(100%) invert(18%) sepia(98%) saturate(4425%) hue-rotate(348deg) brightness(94%) contrast(98%);"
          />
          <div class="title-container flex flex-column justify-content-center line-height-2" style="gap: 2px">
            <p class="title font-semibold" style="letter-spacing: 1px;">TaskMaster</p>
            <span class="text-sm capitalize" style="letter-spacing: .8px;">{{ roleLabel }}</span>
          </div>
        </div>
      </div>
    </template>
    <template #end>
      <div class="flex flex-row gap-3">
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
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  border-bottom: 1px solid #eee;
  position: sticky;
  top: 0;
  z-index: 100;
  height: 64px;
  display: flex;
  align-items: center;
}

.title-container {
  margin-top: 2px;
}

.title {
  letter-spacing: 1px;
  font-size: 1rem;
}

.menu-toggle-icon {
  color: #000000;
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
  color: #1f2937;
  transition: 0.2s ease;
}

.user-name:hover {
  color: #ff4d4f;
}

@media (max-width: 1023px) {
  .menu-toggle-icon {
    display: block;
  }
}
</style>