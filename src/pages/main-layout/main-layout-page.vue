<script>
import Home from "@/pages/home.component.vue";
import Toolbar from "@/public/toolbar.component.vue";
import Sidebar from "@/public/sidebar.component.vue";

export default {
  name: "main-layout-page",
  components: { Home, Toolbar, Sidebar },
  data() {
    return {
      sidebarVisible: false,
      windowWidth: window.innerWidth
    }
  },
  methods: {
    toggleNav() {
      this.sidebarVisible = !this.sidebarVisible;
    },
    updateSidebarVisible() {
      if (window.innerWidth > 1023) {
        this.sidebarVisible = true;
      } else {
        this.sidebarVisible = false;
      }
      this.windowWidth = window.innerWidth;
    },
    handleResize() {
      this.updateSidebarVisible();
    },
    closeSidebar() {
      if (this.windowWidth <= 1023) {
        this.sidebarVisible = false;
      }
    }
  },
  mounted() {
    this.updateSidebarVisible();
    window.addEventListener('resize', this.handleResize);
  },
  beforeDestroy() {
    window.removeEventListener('resize', this.handleResize);
  }
}
</script>

<template>
  <div class="app-container">
    <toolbar :toggleNav="toggleNav" class="toolbar"></toolbar>
    <div class="content-wrapper">
      <div class="mobile-overlay" v-if="windowWidth <= 1023 && sidebarVisible" @click="closeSidebar"></div>
      <div class="sidebar-container" :class="{ 'sidebar-open': sidebarVisible && windowWidth <= 1023 }">
        <sidebar :sidebarVisible="sidebarVisible" class="sidebar"></sidebar>
      </div>
      <main class="main-container" :class="{ 'main-blur': sidebarVisible && windowWidth <= 1023 }">
        <router-view></router-view>
      </main>
    </div>
  </div>
</template>

<style scoped>
.app-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
}

.toolbar {
  flex-shrink: 0;
  position: sticky;
  top: 0;
  z-index: 102;
  background-color: white;
}

.content-wrapper {
  display: flex;
  flex: 1;
  overflow: hidden;
  position: relative;
}

/* Desktop - sidebar normal */
@media (min-width: 1024px) {
  .sidebar-container {
    width: 329px;
    flex-shrink: 0;
    position: relative;
  }

  .main-container {
    flex: 1;
    overflow-y: auto;
    padding: 1rem;
  }
}

/* Móvil/Tablet - sidebar como overlay debajo del toolbar */
@media (max-width: 1023px) {
  .sidebar-container {
    position: fixed;
    top: 0;
    left: 0;
    bottom: 0;
    width: 280px;
    z-index: 200;
    transform: translateX(-100%);
    transition: transform 0.3s ease-out;
    background-color: #f8f9fb;
    box-shadow: 2px 0 8px rgba(0, 0, 0, 0.15);
    margin-top: 120px;
  }

  .sidebar-container.sidebar-open {
    transform: translateX(0);
  }

  .mobile-overlay {
    position: fixed;
    top: 120px;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    z-index: 150;
    cursor: pointer;
  }

  .main-container {
    width: 100%;
    overflow-y: auto;
    padding: 1rem;
    transition: all 0.3s ease;
  }

  .main-container.main-blur {
    filter: blur(2px);
    pointer-events: none;
  }
}
</style>