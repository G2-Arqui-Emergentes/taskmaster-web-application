import axios from 'axios';
import { environment } from "@/environment/environment.js";
import { UserService } from "@/services/user.service.js";

const getHeaders = () => {
    const userService = new UserService();
    return userService.getHeadersAuthorization();
};

export async function getAllProjects() {
    try {
        const headers = getHeaders();
        const response = await axios.get(
            `${environment.baseUrl}/api/v1/projects`,
            { headers }
        );
        return response.data;
    } catch (error) {
        throw error;
    }
}

export async function getProjectById(projectId) {
    try {
        const headers = getHeaders();
        const response = await axios.get(
            `${environment.baseUrl}/api/v1/projects/${projectId}`,
            { headers }
        );
        return response.data;
    } catch (error) {
        throw error;
    }
}

export async function getProjectsByMember() {
    try {
        const headers = getHeaders();
        const response = await axios.get(
            `${environment.baseUrl}/api/v1/projects/member`,
            { headers }
        );
        return response.data;
    } catch (error) {
        throw error;
    }
}

export async function getProjectsByLeader() {
    try {
        const headers = getHeaders();
        const response = await axios.get(
            `${environment.baseUrl}/api/v1/projects/leader`,
            { headers }
        );
        return response.data;
    } catch (error) {
        throw error;
    }
}

export async function createProject(projectData) {
    try {
        const headers = getHeaders();
        const payload = {
            name: projectData.name,
            description: projectData.description,
            imageUrl: projectData.imageUrl || '',
            budget: projectData.budget || 0,
            endDate: projectData.endDate
        };

        const response = await axios.post(
            `${environment.baseUrl}/api/v1/projects`,
            payload,
            { headers }
        );
        return response.data;
    } catch (error) {
        throw error;
    }
}

export async function updateProject(projectId, projectData) {
    try {
        const headers = getHeaders();
        const payload = {
            name: projectData.name,
            description: projectData.description,
            imageUrl: projectData.imageUrl,
            budget: projectData.budget,
            status: projectData.status,
            endDate: projectData.endDate
        };

        const response = await axios.put(
            `${environment.baseUrl}/api/v1/projects/${projectId}`,
            payload,
            { headers }
        );
        return response.data;
    } catch (error) {
        throw error;
    }
}

export async function deleteProject(projectId) {
    try {
        const headers = getHeaders();
        const response = await axios.delete(
            `${environment.baseUrl}/api/v1/projects/${projectId}`,
            { headers }
        );
        return response.data;
    } catch (error) {
        throw error;
    }
}

export async function setProjectCode(projectId, codeData) {
    try {
        const headers = getHeaders();
        const payload = {
            keycode: codeData.keycode,
            expiration: codeData.expiration
        };

        const response = await axios.put(
            `${environment.baseUrl}/api/v1/projects/${projectId}/code`,
            payload,
            { headers }
        );
        return response.data;
    } catch (error) {
        throw error;
    }
}

export async function joinProjectByCode(key) {
    try {
        const headers = getHeaders();
        const response = await axios.get(
            `${environment.baseUrl}/api/v1/projects/join/${key}`,
            { headers }
        );
        return response.data;
    } catch (error) {
        throw error;
    }
}

export async function removeUserFromProject(projectId, memberId) {
    try {
        const headers = getHeaders();
        const response = await axios.delete(
            `${environment.baseUrl}/api/v1/projects/${projectId}/members/${memberId}`,
            { headers }
        );
        return response.data;
    } catch (error) {
        throw error;
    }
}