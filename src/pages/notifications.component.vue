<script>
import { NotificationService } from "@/services/notification.service.js";
import { getAllProjects, getProjectsByLeader, getProjectsByMember } from "@/services/project.service.js";

export default {
  name: "notifications-page",
  data() {
    return {
      notificationService: new NotificationService(),
      notifications: [],
      projects: [],
      selectedTab: "all",
      searchTerm: "",
      selectedType: "all",
      currentPage: 1,
      perPage: 10,
      readIds: [],
      loading: false
    };
  },
  computed: {
    taskNotifications() {
      return this.notifications.filter((notification) => this.getNotificationType(notification) === "tasks");
    },
    projectNotifications() {
      return this.notifications.filter((notification) => this.getNotificationType(notification) === "projects");
    },
    tabs() {
      return [
        { key: "all", label: "All", count: this.notifications.length },
        { key: "tasks", label: "Tasks", count: this.taskNotifications.length },
        { key: "projects", label: "Projects", count: this.projectNotifications.length }
      ];
    },
    tabFilteredNotifications() {
      if (this.selectedTab === "tasks") return this.taskNotifications;
      if (this.selectedTab === "projects") return this.projectNotifications;
      return this.notifications;
    },
    filteredNotifications() {
      const search = this.searchTerm.trim().toLowerCase();

      return this.tabFilteredNotifications.filter((notification) => {
        const type = this.getNotificationType(notification);
        const matchesType = this.selectedType === "all" || this.selectedType === type;
        const content = `${notification.title || ""} ${notification.message || ""}`.toLowerCase();
        const matchesSearch = !search || content.includes(search);

        return matchesType && matchesSearch;
      });
    },
    totalPages() {
      return Math.max(1, Math.ceil(this.filteredNotifications.length / this.perPage));
    },
    paginatedNotifications() {
      const start = (this.currentPage - 1) * this.perPage;
      return this.filteredNotifications.slice(start, start + this.perPage);
    },
    paginationStart() {
      if (!this.filteredNotifications.length) return 0;
      return (this.currentPage - 1) * this.perPage + 1;
    },
    paginationEnd() {
      return Math.min(this.currentPage * this.perPage, this.filteredNotifications.length);
    }
  },
  watch: {
    selectedTab() {
      this.currentPage = 1;
    },
    selectedType() {
      this.currentPage = 1;
    },
    searchTerm() {
      this.currentPage = 1;
    },
    perPage() {
      this.currentPage = 1;
    },
    totalPages(newValue) {
      if (this.currentPage > newValue) this.currentPage = newValue;
    }
  },
  async mounted() {
    await this.fetchNotifications();
    await this.fetchProjectsForNavigation();
  },
  methods: {
    async fetchNotifications() {
      this.loading = true;
      try {
        const response = await this.notificationService.getMyNotifications();
        this.notifications = Array.isArray(response)
            ? response.sort((a, b) => new Date(b.sentAt || 0) - new Date(a.sentAt || 0))
            : [];
      } catch (error) {
        console.error("Error fetching notifications:", error);
        this.notifications = [];
      } finally {
        this.loading = false;
      }
    },
    async fetchProjectsForNavigation() {
      try {
        const roles = this.$store.state.user?.roles || [];
        let response = [];

        if (roles.includes("ROLE_ADMIN")) {
          response = await getAllProjects();
        } else if (roles.includes("ROLE_LEADER")) {
          response = await getProjectsByLeader();
        } else {
          response = await getProjectsByMember();
        }

        this.projects = Array.isArray(response) ? response : [];
      } catch (error) {
        console.error("Error loading projects for notification navigation:", error);
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
    setTab(tab) {
      this.selectedTab = tab;
    },
    markAllAsRead() {
      this.readIds = this.notifications.map((notification) => notification.id);
    },
    isUnread(notification) {
      return !this.readIds.includes(notification.id);
    },
    getNotificationType(notification) {
      const content = `${notification?.title || ""} ${notification?.message || ""}`.toLowerCase();
      const projectKeywords = ["proyecto", "project", "miembro", "member", "ingreso", "unio", "joined"];
      const taskKeywords = ["tarea", "task", "asignad", "actualizad"];

      if (projectKeywords.some((keyword) => content.includes(keyword))) return "projects";
      if (taskKeywords.some((keyword) => content.includes(keyword))) return "tasks";
      return "tasks";
    },
    getTypeLabel(notification) {
      return this.getNotificationType(notification) === "projects" ? "Project" : "Task";
    },
    getNotificationIcon(notification) {
      const type = this.getNotificationType(notification);
      const title = (notification?.title || "").toLowerCase();

      if (type === "projects") return "pi pi-users";
      if (title.includes("nueva") || title.includes("new")) return "pi pi-calendar-plus";
      return "pi pi-refresh";
    },
    formatNotificationDate(sentAt) {
      if (!sentAt) return { date: "", time: "" };
      const date = new Date(sentAt);
      if (Number.isNaN(date.getTime())) return { date: "", time: "" };

      return {
        date: date.toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric"
        }),
        time: date.toLocaleTimeString("es-PE", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false
        })
      };
    },
    async openNotification(notification) {
      const type = this.getNotificationType(notification);
      this.readIds = [...new Set([...this.readIds, notification.id])];

      if (!this.projects.length) {
        await this.fetchProjectsForNavigation();
      }

      const project = this.findProjectFromNotification(notification);
      const projectId = project?.projectId || project?.id;

      if (projectId) {
        this.$router.push({ name: "projectTodo", params: { id: projectId } });
      } else {
        this.$router.push(type === "projects" ? "/projects" : "/projects");
      }
    },
    previousPage() {
      if (this.currentPage > 1) this.currentPage -= 1;
    },
    nextPage() {
      if (this.currentPage < this.totalPages) this.currentPage += 1;
    }
  }
};
</script>

<template>
  <section class="notifications-page">
    <header class="page-header">
      <div>
        <h1>All Notifications</h1>
        <p>Stay up to date with everything happening in your projects.</p>
      </div>

      <div class="header-actions">
        <button type="button" class="ghost-button" @click="markAllAsRead">
          <i class="pi pi-check"></i>
          <span>Mark all as read</span>
        </button>

        <label class="type-filter">
          <i class="pi pi-filter"></i>
          <select v-model="selectedType" aria-label="Filter notifications by type">
            <option value="all">All types</option>
            <option value="tasks">Tasks</option>
            <option value="projects">Projects</option>
          </select>
          <i class="pi pi-chevron-down"></i>
        </label>
      </div>
    </header>

    <div class="filters-row">
      <div class="tabs">
        <button
            v-for="tab in tabs"
            :key="tab.key"
            type="button"
            class="tab-button"
            :class="{ active: selectedTab === tab.key }"
            @click="setTab(tab.key)"
        >
          <span>{{ tab.label }}</span>
          <small>{{ tab.count }}</small>
        </button>
      </div>

      <label class="search-box">
        <input v-model="searchTerm" type="search" placeholder="Search notifications..." />
        <i class="pi pi-search"></i>
      </label>
    </div>

    <div class="notifications-table">
      <div class="table-header">
        <span>Notification</span>
        <span>Type</span>
        <span>Date</span>
        <span></span>
      </div>

      <button
          v-for="notification in paginatedNotifications"
          :key="notification.id"
          type="button"
          class="notification-row"
          @click="openNotification(notification)"
      >
        <div class="notification-main">
          <span class="notification-icon" :class="getNotificationType(notification)">
            <i :class="getNotificationIcon(notification)"></i>
          </span>
          <span class="notification-copy">
            <strong>{{ notification.title }}</strong>
            <small>{{ notification.message }}</small>
          </span>
        </div>

        <span class="type-pill" :class="getNotificationType(notification)">
          {{ getTypeLabel(notification) }}
        </span>

        <span class="date-cell">
          <strong>{{ formatNotificationDate(notification.sentAt).date }}</strong>
          <small>{{ formatNotificationDate(notification.sentAt).time }}</small>
        </span>

        <span class="row-actions">
          <i v-if="isUnread(notification)" class="unread-dot"></i>
          <i class="pi pi-ellipsis-v"></i>
        </span>
      </button>

      <div v-if="loading" class="empty-state">Loading notifications...</div>
      <div v-else-if="!paginatedNotifications.length" class="empty-state">No notifications found.</div>

      <footer class="table-footer">
        <p>
          Showing {{ paginationStart }} to {{ paginationEnd }} of
          {{ filteredNotifications.length }} notifications
        </p>

        <div class="pagination">
          <button type="button" :disabled="currentPage === 1" @click="previousPage">
            <i class="pi pi-chevron-left"></i>
          </button>
          <span>{{ currentPage }}</span>
          <button type="button" :disabled="currentPage === totalPages" @click="nextPage">
            <i class="pi pi-chevron-right"></i>
          </button>

          <label class="per-page">
            <select v-model.number="perPage" aria-label="Notifications per page">
              <option :value="5">5 per page</option>
              <option :value="10">10 per page</option>
              <option :value="20">20 per page</option>
            </select>
            <i class="pi pi-chevron-down"></i>
          </label>
        </div>
      </footer>
    </div>

    <aside class="tip-banner">
      <i class="pi pi-info-circle"></i>
      <p><strong>Tip:</strong> Click on any notification to go to the related task or project.</p>
    </aside>
  </section>
</template>

<style scoped>
.notifications-page {
  --accent: #e40046;
  --text: #111827;
  --muted: #6b7280;
  min-height: 100%;
  padding: 2rem 1.9rem;
  background: #ffffff;
}

.page-header,
.filters-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1.5rem;
}

.page-header h1 {
  color: var(--text);
  font-size: 1.55rem;
  font-weight: 800;
  line-height: 1.2;
}

.page-header p {
  margin-top: 0.55rem;
  color: #374151;
  font-size: 0.92rem;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 0.9rem;
}

.ghost-button,
.type-filter,
.search-box,
.per-page {
  height: 2.75rem;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #ffffff;
  color: #111827;
  display: inline-flex;
  align-items: center;
}

.ghost-button {
  padding: 0 1rem;
  gap: 0.65rem;
  cursor: pointer;
  font-weight: 600;
}

.ghost-button i {
  color: var(--accent);
}

.type-filter,
.per-page {
  position: relative;
  padding: 0 0.85rem;
  gap: 0.6rem;
}

.type-filter select,
.per-page select {
  min-width: 6.8rem;
  border: 0;
  outline: 0;
  background: transparent;
  color: #111827;
  font-weight: 600;
  appearance: none;
  cursor: pointer;
}

.type-filter .pi-filter,
.type-filter .pi-chevron-down,
.per-page .pi-chevron-down {
  color: #4b5563;
  font-size: 0.85rem;
  pointer-events: none;
}

.filters-row {
  align-items: center;
  margin-top: 2.1rem;
  border-bottom: 1px solid #e5e7eb;
}

.tabs {
  display: flex;
  align-items: center;
  gap: 1.5rem;
}

.tab-button {
  min-width: 4rem;
  height: 3rem;
  border: 0;
  border-bottom: 2px solid transparent;
  background: transparent;
  color: #374151;
  cursor: pointer;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
}

.tab-button small {
  min-width: 1.25rem;
  height: 1.25rem;
  padding: 0 0.35rem;
  border-radius: 999px;
  background: #f0f1f3;
  color: #6b7280;
  font-size: 0.72rem;
  font-weight: 800;
  line-height: 1.25rem;
}

.tab-button.active {
  color: var(--accent);
  border-bottom-color: var(--accent);
}

.tab-button.active small {
  background: #e9577c;
  color: #ffffff;
}

.search-box {
  width: min(20rem, 100%);
  padding: 0 0.85rem;
  gap: 0.6rem;
}

.search-box input {
  width: 100%;
  border: 0;
  outline: 0;
  color: #111827;
  font-size: 0.9rem;
}

.search-box i {
  color: #4b5563;
}

.notifications-table {
  margin-top: 1rem;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #ffffff;
  overflow: hidden;
}

.table-header,
.notification-row {
  display: grid;
  grid-template-columns: minmax(20rem, 1fr) 9rem 9rem 4.5rem;
  align-items: center;
  column-gap: 1rem;
}

.table-header {
  min-height: 3.5rem;
  padding: 0 1.1rem;
  color: #111827;
  font-size: 0.78rem;
  font-weight: 800;
  border-bottom: 1px solid #e5e7eb;
}

.notification-row {
  width: 100%;
  min-height: 5.25rem;
  padding: 0.75rem 1.1rem;
  border: 0;
  border-bottom: 1px solid #e5e7eb;
  background: #ffffff;
  text-align: left;
  cursor: pointer;
  transition: background 0.2s ease;
}

.notification-row:hover {
  background: #fff7fa;
}

.notification-main {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 1rem;
}

.notification-icon {
  width: 3.05rem;
  height: 3.05rem;
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

.notification-copy {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.notification-copy strong {
  color: var(--text);
  font-size: 0.9rem;
  font-weight: 800;
  line-height: 1.35;
}

.notification-copy small {
  color: #374151;
  font-size: 0.83rem;
  font-weight: 500;
  line-height: 1.4;
}

.type-pill {
  width: fit-content;
  border-radius: 999px;
  padding: 0.25rem 0.5rem;
  font-size: 0.78rem;
  font-weight: 700;
}

.type-pill.tasks {
  background: #e8f1ff;
  color: #2563eb;
}

.type-pill.projects {
  background: #eaf8e8;
  color: #168a2f;
}

.date-cell {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  color: #111827;
}

.date-cell strong,
.date-cell small {
  font-size: 0.82rem;
  font-weight: 500;
  line-height: 1.25;
}

.row-actions {
  display: inline-flex;
  align-items: center;
  justify-content: flex-end;
  gap: 1.5rem;
  color: #4b5563;
}

.unread-dot {
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 50%;
  background: var(--accent);
  display: inline-block;
}

.empty-state {
  padding: 2rem;
  color: var(--muted);
  text-align: center;
  border-bottom: 1px solid #e5e7eb;
}

.table-footer {
  min-height: 4.25rem;
  padding: 0 1rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.table-footer p {
  color: #374151;
  font-size: 0.86rem;
}

.pagination {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.pagination button,
.pagination span {
  width: 2.25rem;
  height: 2.25rem;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #ffffff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.pagination button {
  color: #6b7280;
  cursor: pointer;
}

.pagination button:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.pagination span {
  border-color: var(--accent);
  background: var(--accent);
  color: #ffffff;
  font-weight: 800;
}

.per-page {
  margin-left: 1rem;
}

.tip-banner {
  min-height: 3rem;
  margin-top: 1.8rem;
  padding: 0.8rem 1.2rem;
  border-radius: 8px;
  background: #fde8ef;
  color: #374151;
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.tip-banner i {
  color: var(--accent);
}

.tip-banner p {
  font-size: 0.88rem;
}

@media (max-width: 1100px) {
  .table-header,
  .notification-row {
    grid-template-columns: minmax(18rem, 1fr) 7rem 8rem 3rem;
  }
}

@media (max-width: 820px) {
  .notifications-page {
    padding: 1.25rem;
  }

  .page-header,
  .filters-row,
  .table-footer {
    flex-direction: column;
    align-items: stretch;
  }

  .header-actions,
  .tabs,
  .pagination {
    flex-wrap: wrap;
  }

  .search-box {
    width: 100%;
  }

  .table-header {
    display: none;
  }

  .notification-row {
    grid-template-columns: 1fr;
    gap: 0.8rem;
    padding: 1rem;
  }

  .row-actions {
    justify-content: flex-start;
  }

  .table-footer {
    padding: 1rem;
  }
}
</style>
