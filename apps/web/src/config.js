"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isFeatureEnabled = isFeatureEnabled;
// Helper to access environment variables (Vite + Node fallback)
const getEnv = (key, fallback) => {
    // Check Vite
    // @ts-ignore
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key]) {
        // @ts-ignore
        return import.meta.env[key];
    }
    // Check Node/process.env
    if (typeof process !== 'undefined' && process.env && process.env[key]) {
        return process.env[key];
    }
    return fallback || '';
};
// Mode/Env check
const getMode = () => {
    // @ts-ignore
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.MODE) {
        // @ts-ignore
        return import.meta.env.MODE;
    }
    if (typeof process !== 'undefined' && process.env && process.env.NODE_ENV) {
        return process.env.NODE_ENV;
    }
    return 'development';
};
const config = {
    apiBaseUrl: getEnv('VITE_API_BASE_URL', '/api'),
    env: getMode(),
    features: {
        'maestro.newRunConsole': getEnv('VITE_ENABLE_NEW_MAESTRO_RUN_CONSOLE') === 'true',
        'dashboard.realtime': getEnv('VITE_ENABLE_REALTIME_DASHBOARD') === 'true',
        'ui.annotationsV1': getEnv('VITE_ENABLE_UI_ANNOTATIONS_V1') === 'true',
        'ui.mapClustering': getEnv('VITE_ENABLE_MAP_CLUSTERING') === 'true',
    },
    integrations: {
        github: {
            repo: getEnv('VITE_GITHUB_REPO') || getEnv('NEXT_PUBLIC_GITHUB_REPO'),
            // WARNING: Tokens should ideally be proxied via backend
            token: getEnv('VITE_GITHUB_TOKEN') || getEnv('GITHUB_TOKEN'),
        },
        jira: {
            projectKey: getEnv('VITE_JIRA_PROJECT_KEY') || getEnv('NEXT_PUBLIC_JIRA_PROJECT_KEY'),
            token: getEnv('VITE_JIRA_TOKEN') || getEnv('JIRA_TOKEN'),
        }
    }
};
function isFeatureEnabled(key) {
    return config.features[key] ?? false;
}
exports.default = config;
