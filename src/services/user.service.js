import axios from "axios";
import {environment} from "@/environment/environment.js";

export class UserService {

    constructor() {
        this.http = axios.create({
            baseURL: environment.baseUrl
        });

        this.http.interceptors.request.use(config => {
            const token = this.normalizeToken(localStorage.getItem('token'));
            if (token) {
                config.headers.Authorization = `Bearer ${token}`;
            }
            return config;
        });
    }

    normalizeToken(token) {
        if (!token) return '';
        return token.toString().trim().replace(/^"|"$/g, '');
    }

    setSession(token, user = null) {
        const normalizedToken = this.normalizeToken(token);
        if (normalizedToken) {
            localStorage.setItem('token', normalizedToken);
        }

        if (user) {
            localStorage.setItem('user', JSON.stringify(user));
        }
    }

    clearSession() {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
    }

    decodeJwtPayload(token) {
        try {
            const normalized = this.normalizeToken(token);
            if (!normalized || !normalized.includes('.')) return null;
            const payload = normalized.split('.')[1];
            const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
            const json = atob(base64.padEnd(base64.length + (4 - base64.length % 4) % 4, '='));
            return JSON.parse(json);
        } catch (error) {
            return null;
        }
    }

    async signUpUser(user) {
        try {
            const signUpPayload = {
                email: (user.email ?? "").toString().trim(),
                password: (user.password ?? "").toString(),
                roles: Array.isArray(user.roles)
                    ? user.roles
                    : [user.role].filter(Boolean),
                name: (user.name ?? user.firstName ?? "").toString().trim(),
                lastName: (user.lastName ?? "").toString().trim()
            };
            return await this.http.post('/api/v1/authentication/sign-up', signUpPayload);
        } catch(e) {
            return null;
        }
    }

    async signInUser(email, password) {
        try {
            const signInPayload = {
                email: (email ?? '').toString().trim(),
                password: (password ?? '').toString()
            };
            const response = await this.http.post('/api/v1/authentication/sign-in', signInPayload);

            if (response.data && response.data.token) {
                this.setSession(response.data.token);
            }

            return response;
        } catch (e) {
            return e;
        }
    }

    async getUserByEmail(email) {
        const headers = this.getHeadersAuthorization();
        try {
            const normalizedEmail = (email ?? '').toString().trim();
            const response = await this.http.get(`/api/v1/users/email/${encodeURIComponent(normalizedEmail)}`, { headers });
            this.setUser(response.data);
            return response;
        } catch (error) {
            throw error;
        }
    }

    async getUserById(id) {
        const headers = this.getHeadersAuthorization();
        try {
            return await this.http.get(`/api/v1/users/${id}`, { headers });
        } catch (error) {
            throw error;
        }
    }

    async updateUser(user) {
        const headers = this.getHeadersAuthorization();

        const userbody = {
            name: (user.name ?? "").toString().trim(),
            lastName: (user.lastName ?? "").toString().trim(),
            imageUrl: (user.imageUrl ?? "").toString().trim(),
            salary: user.salary ?? 0
        };

        try {
            const resp = await this.http.put(`/api/v1/users`, userbody, { headers });
            this.setUser(resp.data);
            return resp.data;
        } catch (error) {
            throw error;
        }
    }

    async getAllUsers() {
        try {
            const headers = this.getHeadersAuthorization();
            return await this.http.get('/api/v1/users', { headers });
        } catch (error) {
            throw error;
        }
    }

    getHeadersAuthorization() {
        const token = this.normalizeToken(localStorage.getItem('token'));
        return {
            "Authorization": token ? `Bearer ${token}` : '',
            "Content-Type": "application/json"
        }
    }

    setUser(user) {
        localStorage.setItem('user', JSON.stringify(user));
    }

    getCurrentUser() {
        return JSON.parse(localStorage.getItem('user') || '{}');
    }
}