"use strict";
/**
 * Configuration management for Admin CLI
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getConfig = getConfig;
exports.getProfile = getProfile;
exports.setProfile = setProfile;
exports.deleteProfile = deleteProfile;
exports.setDefaultProfile = setDefaultProfile;
exports.listProfiles = listProfiles;
exports.getEndpoint = getEndpoint;
exports.getToken = getToken;
exports.getConfigPath = getConfigPath;
exports.resetConfig = resetConfig;
const conf_1 = __importDefault(require("conf"));
const CONFIG_SCHEMA = {
    defaultEndpoint: {
        type: 'string',
        default: 'http://localhost:4000',
    },
    defaultProfile: {
        type: 'string',
        default: 'default',
    },
    profiles: {
        type: 'object',
        default: {
            default: {
                endpoint: 'http://localhost:4000',
                defaultFormat: 'table',
            },
            staging: {
                endpoint: 'https://api.staging.intelgraph.com',
                defaultFormat: 'table',
            },
            production: {
                endpoint: 'https://api.intelgraph.com',
                defaultFormat: 'table',
            },
        },
    },
};
/**
 * Configuration store
 */
const configStore = new conf_1.default({
    projectName: 'summit-admin-cli',
    schema: CONFIG_SCHEMA,
});
/**
 * Get full configuration
 */
function getConfig() {
    return {
        defaultEndpoint: configStore.get('defaultEndpoint'),
        defaultProfile: configStore.get('defaultProfile'),
        profiles: configStore.get('profiles'),
    };
}
/**
 * Get profile configuration
 */
function getProfile(name) {
    const profileName = name ?? configStore.get('defaultProfile');
    const profiles = configStore.get('profiles');
    return profiles[profileName] ?? profiles['default'];
}
/**
 * Set profile configuration
 */
function setProfile(name, config) {
    const profiles = configStore.get('profiles');
    profiles[name] = {
        ...profiles[name],
        ...config,
    };
    configStore.set('profiles', profiles);
}
/**
 * Delete profile
 */
function deleteProfile(name) {
    if (name === 'default') {
        return false; // Cannot delete default profile
    }
    const profiles = configStore.get('profiles');
    if (profiles[name]) {
        delete profiles[name];
        configStore.set('profiles', profiles);
        return true;
    }
    return false;
}
/**
 * Set default profile
 */
function setDefaultProfile(name) {
    configStore.set('defaultProfile', name);
}
/**
 * List all profiles
 */
function listProfiles() {
    return Object.keys(configStore.get('profiles'));
}
/**
 * Get effective endpoint
 */
function getEndpoint(profileName, override) {
    if (override)
        return override;
    const profile = getProfile(profileName);
    return profile.endpoint;
}
/**
 * Get token from environment or profile
 */
function getToken(profileName, override) {
    if (override)
        return override;
    // Check environment variable first
    const envToken = process.env.INTELGRAPH_TOKEN ?? process.env.SUMMIT_ADMIN_TOKEN;
    if (envToken)
        return envToken;
    // Fall back to profile
    const profile = getProfile(profileName);
    return profile.token;
}
/**
 * Get configuration file path
 */
function getConfigPath() {
    return configStore.path;
}
/**
 * Reset configuration to defaults
 */
function resetConfig() {
    configStore.clear();
}
