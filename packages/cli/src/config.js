"use strict";
/**
 * Summit CLI Configuration
 *
 * Configuration management for the CLI.
 *
 * @module @summit/cli/config
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadConfig = loadConfig;
exports.saveConfig = saveConfig;
exports.getConfig = getConfig;
exports.setConfigValue = setConfigValue;
exports.getConfigValue = getConfigValue;
exports.clearConfig = clearConfig;
exports.isConfigured = isConfigured;
exports.isAuthenticated = isAuthenticated;
const fs_1 = require("fs");
const os_1 = require("os");
const path_1 = require("path");
const CONFIG_DIR = (0, path_1.join)((0, os_1.homedir)(), '.summit');
const CONFIG_FILE = (0, path_1.join)(CONFIG_DIR, 'config.json');
let config = {};
/**
 * Ensure config directory exists
 */
function ensureConfigDir() {
    if (!(0, fs_1.existsSync)(CONFIG_DIR)) {
        (0, fs_1.mkdirSync)(CONFIG_DIR, { recursive: true, mode: 0o700 });
    }
}
/**
 * Load configuration from file
 */
async function loadConfig() {
    ensureConfigDir();
    if ((0, fs_1.existsSync)(CONFIG_FILE)) {
        const content = (0, fs_1.readFileSync)(CONFIG_FILE, 'utf-8');
        config = JSON.parse(content);
    }
    // Override with environment variables
    if (process.env.SUMMIT_API_URL) {
        config.baseUrl = process.env.SUMMIT_API_URL;
    }
    if (process.env.SUMMIT_API_KEY) {
        config.apiKey = process.env.SUMMIT_API_KEY;
    }
    if (process.env.SUMMIT_TENANT_ID) {
        config.tenantId = process.env.SUMMIT_TENANT_ID;
    }
    if (process.env.SUMMIT_TOKEN) {
        config.token = process.env.SUMMIT_TOKEN;
    }
    return config;
}
/**
 * Save configuration to file
 */
async function saveConfig(updates) {
    ensureConfigDir();
    config = { ...config, ...updates };
    // Don't persist tokens from env vars
    const persistConfig = { ...config };
    if (process.env.SUMMIT_TOKEN) {
        delete persistConfig.token;
    }
    if (process.env.SUMMIT_API_KEY) {
        delete persistConfig.apiKey;
    }
    (0, fs_1.writeFileSync)(CONFIG_FILE, JSON.stringify(persistConfig, null, 2), {
        mode: 0o600,
    });
}
/**
 * Get current configuration
 */
function getConfig() {
    return config;
}
/**
 * Set a configuration value
 */
async function setConfigValue(key, value) {
    await saveConfig({ [key]: value });
}
/**
 * Get a configuration value
 */
function getConfigValue(key) {
    return config[key];
}
/**
 * Clear configuration
 */
async function clearConfig() {
    config = {};
    if ((0, fs_1.existsSync)(CONFIG_FILE)) {
        (0, fs_1.writeFileSync)(CONFIG_FILE, '{}', { mode: 0o600 });
    }
}
/**
 * Check if CLI is configured
 */
function isConfigured() {
    return !!config.baseUrl;
}
/**
 * Check if authenticated
 */
function isAuthenticated() {
    return !!(config.token || config.apiKey);
}
