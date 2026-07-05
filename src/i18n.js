import enHome from "./locales/home/en.json";
import esHome from "./locales/home/es.json";

import enAnalytics from "./locales/analytics/en.json";
import esAnalytics from "./locales/analytics/es.json";

import enCalendar from "./locales/calendar/en.json";
import esCalendar from "./locales/calendar/es.json";

import enChatbot from "./locales/chatbot/en.json";
import esChatbot from "./locales/chatbot/es.json";

import enNewpost from "./locales/newpost/en.json";
import esNewpost from "./locales/newpost/es.json";

import enNotifications from "./locales/notifications/en.json";
import esNotifications from "./locales/notifications/es.json";

import enProjects from "./locales/projects/en.json";
import esProjects from "./locales/projects/es.json";

import enSidebar from "./locales/sidebar/en.json";
import esSidebar from "./locales/sidebar/es.json";

import enTeam from "./locales/team/en.json";
import esTeam from "./locales/team/es.json";

import enProfile from "./locales/profile/en.json";
import esProfile from "./locales/profile/es.json";

import enToolbar from "./locales/toolbar/en.json";
import esToolbar from "./locales/toolbar/es.json";

import {createI18n} from "vue-i18n";

const messages = {
    en: {
        home: enHome,
        analytics: enAnalytics,
        calendar: enCalendar,
        chatbot: enChatbot,
        newpost: enNewpost,
        notifications: enNotifications,
        projects: enProjects,
        profile: enProfile,
        sidebar: enSidebar,
        team: enTeam,
        toolbar: enToolbar
    },
    es: {
        home: esHome,
        analytics: esAnalytics,
        calendar: esCalendar,
        chatbot: esChatbot,
        newpost: esNewpost,
        notifications: esNotifications,
        projects: esProjects,
        profile: esProfile,
        sidebar: esSidebar,
        team: esTeam,
        toolbar: esToolbar
    }
};

const i18n = createI18n({
    legacy: false,
    locale: "en",
    fallbackLocale: "en",
    globalInjection: true,
    messages
});

export default i18n;
