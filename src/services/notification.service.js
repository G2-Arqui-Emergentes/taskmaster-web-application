import axios from 'axios';
import { environment } from "@/environment/environment.js";
import { UserService } from "@/services/user.service.js";
import { NotificationEntity } from "@/models/notification.entity.js";

const getHeaders = () => {
    const userService = new UserService();
    return userService.getHeadersAuthorization();
};

export class NotificationService {

    async getMyNotifications() {
        try {
            const headers = getHeaders();
            const response = await axios.get(
                `${environment.baseUrl}/api/v1/notifications/me`,
                { headers }
            );

            const notifications = Array.isArray(response.data) ? response.data : [];
            return notifications.map(n => new NotificationEntity(
                n.id,
                n.userId,
                n.title,
                n.message,
                n.sentAt
            ));
        } catch (error) {
            console.error('Error fetching notifications:', error);
            return [];
        }
    }
}