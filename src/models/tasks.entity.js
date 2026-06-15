export class TaskEntity {
    constructor(
        taskId,
        projectId,
        title,
        description,
        startDate = null,
        endDate = null,
        status = 'TO_DO',
        priority = 'MEDIUM',
        assignedUserIds = [],
        createdAt = null,
        updatedAt = null
    ) {
        this.taskId = taskId;
        this.projectId = projectId;
        this.title = title;
        this.description = description;
        this.startDate = startDate;
        this.endDate = endDate;
        this.status = status;
        this.priority = priority;
        this.assignedUserIds = Array.isArray(assignedUserIds) ? assignedUserIds : [];
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }
}

