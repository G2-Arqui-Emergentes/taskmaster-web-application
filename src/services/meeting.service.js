import axios from 'axios';
import { environment } from '@/environment/environment.js';
import { UserService } from '@/services/user.service.js';

const getHeaders = () => {
    const userService = new UserService();
    return userService.getHeadersAuthorization();
};

export async function getMeetings() {
    const headers = getHeaders();
    const response = await axios.get(`${environment.baseUrl}/api/v1/meetings`, { headers });
    return response.data;
}

export async function getMeetingById(meetingId) {
    const headers = getHeaders();
    const response = await axios.get(`${environment.baseUrl}/api/v1/meetings/${meetingId}`, { headers });
    return response.data;
}

export async function createMeeting(meetingData) {
    const headers = getHeaders();
    const response = await axios.post(`${environment.baseUrl}/api/v1/meetings`, meetingData, { headers });
    return response.data;
}

export async function updateMeeting(meetingId, meetingData) {
    const headers = getHeaders();
    const response = await axios.put(`${environment.baseUrl}/api/v1/meetings/${meetingId}`, meetingData, { headers });
    return response.data;
}

export async function deleteMeeting(meetingId) {
    const headers = getHeaders();
    const response = await axios.delete(`${environment.baseUrl}/api/v1/meetings/${meetingId}`, { headers });
    return response.data;
}
