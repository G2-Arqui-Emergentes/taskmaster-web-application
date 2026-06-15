<script setup>
import Card from 'primevue/card'
import TaskCard from './TaskCard.vue'

const emits = defineEmits(['updAll', 'taskMoved', 'openMenu', 'closeMenu'])

const props = defineProps({
  id: { type: String, required: true },
  taskColumn: { type: String, required: true },
  tasks: { type: Array, required: true },
  reload: { type: Boolean, required: true },
  teamMembers: { type: Array, default: () => [] },
  isLeader: { type: Boolean, default: false },
  currentUserId: { type: Number, default: null },
  activeMenuId: { type: Number, default: null }
})

function cambiarColor(taskColumn) {
  switch (taskColumn) {
    case 'To-Do': return '#FFDBDB'
    case 'In progress': return '#FFF3DB'
    case 'Done': return '#DBE9FF'
    default: return '#ffffff'
  }
}

function columnClass(taskColumn) {
  switch (taskColumn) {
    case 'To-Do': return 'todo'
    case 'In progress': return 'inprogress'
    case 'Done': return 'done'
    default: return ''
  }
}

function onTaskMoved(updatedTask) {
  emits('taskMoved', updatedTask)
}

function handleOpenMenu(taskId) {
  emits('openMenu', taskId)
}

function handleCloseMenu() {
  emits('closeMenu')
}
</script>

<template>
  <div class="project-card enhanced-column">
    <Card class="p-card vista" :style="{ background: cambiarColor(props.taskColumn) }">
      <template #title>
        <h3 class="column-title" :class="columnClass(props.taskColumn)">{{ props.taskColumn }}</h3>
      </template>
      <template #content>
        <div class="overflow">
          <TaskCard
              v-for="task in props.tasks"
              :key="task.id"
              :title="task.title"
              :description="task.description"
              :assigned="task.assigneeName"
              :assignedID="task.assigneeId"
              :due="task.dueDate"
              :id="task.id"
              :projectId="props.id"
              :state="task.state"
              :teamMembers="props.teamMembers"
              :isLeader="props.isLeader"
              :currentUserId="props.currentUserId"
              :activeMenuId="props.activeMenuId"
              @taskDel="emits('updAll')"
              @taskMoved="onTaskMoved"
              @openMenu="handleOpenMenu"
              @closeMenu="handleCloseMenu"
          />
        </div>
      </template>
    </Card>
  </div>
</template>

<style scoped>
.column-title {
  text-align: center;
  font-weight: 600;
  font-size: 1.25rem;
  letter-spacing: 0.5px;
  margin-bottom: 0.5rem;
}

.column-title.todo {
  color: #d7263d;
}

.column-title.inprogress {
  color: #fbbf24;
}

.column-title.done {
  color: #059669;
}

.p-card {
  width: 100%;
  padding: 1.5rem;
  height: 100%;
  border-radius: 14px;
  background: #fff;
  box-shadow: 0 4px 24px 0 rgba(2,81,61,0.07);
  border: 2.5px solid #e3e8ee;
}

.enhanced-column {
  border-radius: 14px;
  padding: 1.2rem 0.5rem 1.5rem 0.5rem;
  margin-bottom: 1.5rem;
  box-shadow: 0 2px 16px 0 rgba(2,81,61,0.06);
}

.overflow {
  padding-top: 1rem;
  overflow-y: auto;
  height: 46vh;
  display: flex;
  flex-direction: column;
  gap: 0.7rem;
}

.project-card {
  width: 30%;
  max-width: 420px;
  min-width: 260px;
}

@media (max-width: 1028px) {
  .project-card {
    width: 100%;
    height: auto;
  }
}

::-webkit-scrollbar {
  width: 0.2rem;
}
::-webkit-scrollbar-track {
  background-color: transparent;
}
::-webkit-scrollbar-thumb {
  border-radius: 10px;
  background-color: rgba(0,0,0,0.2);
}
</style>