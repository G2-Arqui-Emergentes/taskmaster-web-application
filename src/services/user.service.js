import axios from "axios";
import {environment} from "@/environment/environment.js";

export class UserService {

    http = null;
    constructor() {
        this.http = axios.create({
            baseURL: environment.baseUrl
        })
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

            console.log('Sending sign-up payload:', signUpPayload);
            return await this.http.post('/api/v1/authentication/sign-up', signUpPayload);
        } catch(e) {
            if (e.response) {
                console.error('Backend Error:', e.response.data);
            }
            return null;
        }
    }

    async signInUser(email, password) {
        try {
            const signInPayload = {
                email: email,
                password: password
            };

            console.log('Sending sign-in payload:', signInPayload);

            const response = await this.http.post('/api/v1/authentication/sign-in', signInPayload);

            if (response.data && (response.data.email || response.data.username)) {
                const identifier = response.data.email || response.data.username;
                console.log("Login exitoso. Buscando usuario completo...");
                try {
                    await this.getUserByEmail(identifier);
                } catch (profileError) {
                    console.error("No se pudo cargar el usuario:", profileError);
                }
            }

            return response;
        } catch (e) {
            if (e.response) {
                console.error('Backend 400 Sign-In Response Data (Validation Errors):', e.response.data);
                console.error('Backend Status:', e.response.status);
            }
            return e;
        }
    }


    async getUserByEmail(email) {
        const headers = this.getHeadersAuthorization();
        try {
            const response = await this.http.get(`/api/v1/users/email/${encodeURIComponent(email)}`, { headers });

            console.log('Usuario recuperado por email:', response.data);

            this.setUser(response.data);

            return response;
        } catch (error) {
            console.error(`Error al obtener usuario por email ${email}:`, error);
            throw error;
        }
    }

    async getUserById(id) {
        const headers = this.getHeadersAuthorization();
        console.log('user id to retrieve', id);
        try {
            const response = await this.http.get(`/api/v1/users/${id}`, { headers });

            console.log('User response:', response);
            this.setUser(response.data);
            return response;
        } catch (error) {
            if (error.response) {
                console.error(`Error ${error.response.status} al obtener el usuario con id ${id}:`, error.response.data);
            } else {
                console.error(`Error de red al obtener el usuario con id ${id}:`, error.message);
            }
            throw error;
        }
    }

    async updateUser(user) {
        const headers = this.getHeadersAuthorization();

        const userbody = {
            id: user.id ?? user.userId,
            email: (user.email ?? "").toString().trim(),
            roles: Array.isArray(user.roles)
                ? user.roles
                : [user.role].filter(Boolean),
            name: (user.name ?? user.firstName ?? "").toString().trim(),
            lastName: (user.lastName ?? "").toString().trim(),
            imageUrl: (user.imageUrl ?? user.profileImg ?? "").toString().trim(),
            salary: user.salary ?? 0,
            projectIds: Array.isArray(user.projectIds) ? user.projectIds : []
        };

        const resp = await this.http.put(`/api/v1/users`, userbody, { headers });

        this.setUser(resp.data);

        return resp.data;
    }

    async getAllUsers() {
        try {
            const headers = this.getHeadersAuthorization();
            return await this.http.get('/api/v1/users', { headers });
        } catch (error) {
            console.error('Error al obtener todos los usuarios:', error);
            throw error;
        }
    }



    getHeadersAuthorization() {
        const token = localStorage.getItem('token');
        return {
            "Authorization": token ? `Bearer ${token}` : '',
            "Content-Type": "application/json"
        }
    }

    setUser(user) {
        localStorage.setItem('user', JSON.stringify(user));

    }
}