import axios from 'axios';
import { environment } from "@/environment/environment.js";
import { UserService } from "@/services/user.service.js";

const getHeaders = () => {
    const userService = new UserService();
    return userService.getHeadersAuthorization();
};

export async function getTaskById(taskId) {
    try {
        const headers = getHeaders();
        const resp = await axios.get(`${environment.baseUrl}/api/v1/tasks/${taskId}`, { headers });
        return resp.data;
    } catch (error) {
        console.error('Error getting task by id:', error.response?.data || error);
        throw error;
    }
}

export async function updateTask(taskId, taskData) {
    try {
        const headers = getHeaders();
        const payload = {
            title: taskData.title,
            description: taskData.description,
            endDate: taskData.endDate,
            status: taskData.status,
            priority: taskData.priority,
            assignedUserIds: Array.isArray(taskData.assignedUserIds) ? taskData.assignedUserIds : []
        };
        const resp = await axios.put(`${environment.baseUrl}/api/v1/tasks/${taskId}`, payload, { headers });
        return resp.data;
    } catch (error) {
        console.error('Error updating task:', error.response?.data || error);
        throw error;
    }
}

export async function deleteTask(taskId) {
    try {
        const headers = getHeaders();
        const resp = await axios.delete(`${environment.baseUrl}/api/v1/tasks/${taskId}`, { headers });
        return resp.data;
    } catch (error) {
        console.error('Error deleting task:', error.response?.data || error);
        throw error;
    }
}

export async function unassignUser(taskId, userId) {
    try {
        const headers = getHeaders();
        const resp = await axios.put(`${environment.baseUrl}/api/v1/tasks/${taskId}/unassign`, { userId }, { headers });
        return resp.data;
    } catch (error) {
        console.error('Error unassigning user from task:', error.response?.data || error);
        throw error;
    }
}

export async function updateTaskStatus(taskId, status) {
    try {
        const headers = getHeaders();
        const resp = await axios.put(`${environment.baseUrl}/api/v1/tasks/${taskId}/status`, { status }, { headers });
        return resp.data;
    } catch (error) {
        console.error('Error updating task status:', error.response?.data || error);
        throw error;
    }
}

export async function assignUser(taskId, userId) {
    try {
        const headers = getHeaders();
        const resp = await axios.put(`${environment.baseUrl}/api/v1/tasks/${taskId}/assign`, { userId }, { headers });
        return resp.data;
    } catch (error) {
        console.error('Error assigning user to task:', error.response?.data || error);
        throw error;
    }
}

export async function getAllTasks() {
    try {
        const headers = getHeaders();
        const resp = await axios.get(`${environment.baseUrl}/api/v1/tasks`, { headers });
        return resp.data;
    } catch (error) {
        console.error('Error getting all tasks:', error.response?.data || error);
        throw error;
    }
}

export async function createTask(taskData) {
    try {
        const headers = getHeaders();
        const payload = {
            projectId: taskData.projectId,
            title: taskData.title,
            description: taskData.description,
            startDate: taskData.startDate,
            endDate: taskData.endDate,
            status: taskData.status,
            priority: taskData.priority,
            assignedUserIds: Array.isArray(taskData.assignedUserIds) ? taskData.assignedUserIds : []
        };
        const resp = await axios.post(`${environment.baseUrl}/api/v1/tasks`, payload, { headers });
        return resp.data;
    } catch (error) {
        console.error('Error creating task:', error.response?.data || error);
        throw error;
    }
}

export async function getTasksByUserId(userId) {
    try {
        const headers = getHeaders();
        const resp = await axios.get(`${environment.baseUrl}/api/v1/tasks/user/${userId}`, { headers });
        return resp.data;
    } catch (error) {
        console.error('Error getting tasks by user:', error.response?.data || error);
        throw error;
    }
}

export async function getTasksByProjectId(projectId) {
    try {
        const headers = getHeaders();
        const resp = await axios.get(`${environment.baseUrl}/api/v1/tasks/project/${projectId}`, { headers });
        return resp.data;
    } catch (error) {
        console.error('Error getting tasks by project:', error.response?.data || error);
        throw error;
    }
}

export async function getTasksByProjectAndUser(projectId, userId) {
    try {
        const headers = getHeaders();
        const resp = await axios.get(`${environment.baseUrl}/api/v1/tasks/project/${projectId}/user/${userId}`, { headers });
        return resp.data;
    } catch (error) {
        console.error('Error getting tasks by project and user:', error.response?.data || error);
        throw error;
    }
}

export async function getTasksByProjectAndStatus(projectId, status) {
    try {
        const headers = getHeaders();
        const resp = await axios.get(`${environment.baseUrl}/api/v1/tasks/project/${projectId}/status/${status}`, { headers });
        return resp.data;
    } catch (error) {
        console.error('Error getting tasks by project and status:', error.response?.data || error);
        throw error;
    }
}

export async function getTasksByProjectAndPriority(projectId, priority) {
    try {
        const headers = getHeaders();
        const resp = await axios.get(`${environment.baseUrl}/api/v1/tasks/project/${projectId}/priority/${priority}`, { headers });
        return resp.data;
    } catch (error) {
        console.error('Error getting tasks by project and priority:', error.response?.data || error);
        throw error;
    }
}