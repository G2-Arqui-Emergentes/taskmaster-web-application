import axios from 'axios';
import { environment } from '@/environment/environment.js';
import { UserService } from '@/services/user.service.js';

const getHeaders = () => {
    const userService = new UserService();
    return userService.getHeadersAuthorization();
};

export async function getMemberAiDashboard() {
    const headers = getHeaders();
    const response = await axios.get(
        `${environment.baseUrl}/api/v1/ai/dashboard/member`,
        { headers }
    );
    return response.data;
}

export async function getLeaderAiDashboard() {
    const headers = getHeaders();
    const response = await axios.get(
        `${environment.baseUrl}/api/v1/ai/dashboard/leader`,
        { headers }
    );
    return response.data;
}
