import axios from "axios";
import { environment } from "@/environment/environment.js";
import { UserService } from "@/services/user.service.js";

export class ChatbotService {
    constructor() {
        this.http = axios.create({
            baseURL: environment.baseUrl
        });
        this.userService = new UserService();
    }

    async sendMessage(message) {
        const headers = this.userService.getHeadersAuthorization();
        const response = await this.http.post("/api/v1/chatbot/message", {
            message: (message ?? "").toString().trim()
        }, { headers });

        return response.data;
    }
}
