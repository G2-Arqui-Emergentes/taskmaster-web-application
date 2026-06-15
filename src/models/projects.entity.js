export class ProjectsEntity {
    constructor(
        projectId,
        name,
        description,
        imageUrl = '',
        budget = 0,
        status = 'PLANNED',
        key = '',
        leaderId = null,
        startDate = null,
        endDate = null
    ) {
        this.projectId = projectId;
        this.key = key;
        this.leaderId = leaderId;
        this.name = name;
        this.description = description;
        this.imageUrl = imageUrl;
        this.budget = budget;
        this.status = status;
        this.startDate = startDate;
        this.endDate = endDate;
    }

}