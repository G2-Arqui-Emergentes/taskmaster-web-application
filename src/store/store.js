import {createStore} from "vuex";
import {User} from "@/models/user.entity.js";
import {UserService} from "@/services/user.service.js";

const userService = new UserService();

export const store = createStore({
    state: {
        user: JSON.parse(localStorage.getItem('user')) || User,
        form: {},
        selectedProject: null
    },
    mutations: {
        setToken(state, token) {
            state.token = token;
            localStorage.setItem('token', token);
        },
        setUserData(state, userData) {
            state.user = { ...userData };
            localStorage.setItem('user', JSON.stringify(state.user));
        },
        setUser(state, userId) {
            userService.getUserById(userId).then((response) => {
                state.user = { ...response.data };
                localStorage.setItem('user', JSON.stringify(state.user));
            }).catch(error => {
                console.error('Error fetching user:', error);
            });
        },
        removeUser(state) {
            state.user = { ...User };
            localStorage.removeItem('user');
        },
        removeToken(state) {
            state.token = null;
            localStorage.removeItem('token');
        },
        updateUserCompanyName(state, companyName) {
            state.user = { ...state.user, companyName: companyName };
            localStorage.setItem('user', JSON.stringify(state.user));
        },
        updateForm(state, form) {
            state.form = form;
        },
        clearForm(state) {
            state.form = {};
        },
        setSelectedProject(state, project) {
            state.selectedProject = project;
        },
        clearSelectedProject(state) {
            state.selectedProject = null;
        },
    },
    actions: {
        async updateUser({ commit }, updatedUser) {
            if (updatedUser && typeof updatedUser === 'object' && updatedUser.id) {
                commit('setUserData', updatedUser);
            }
            else if (typeof updatedUser === 'number' || typeof updatedUser === 'string') {
                commit('setUser', updatedUser);
            }
        }
    }
});