export class NotificationEntity {
    constructor(
        id = null,
        userId = null,
        title = '',
        message = '',
        sentAt = null
    ) {
        this.id = id;
        this.userId = userId;
        this.title = title;
        this.message = message;
        this.sentAt = sentAt;
    }
}