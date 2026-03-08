"use strict";
/**
 * Summit CLI API Client
 *
 * HTTP client for CLI commands.
 *
 * @module @summit/cli/client
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.apiRequest = apiRequest;
exports.get = get;
exports.post = post;
exports.put = put;
exports.del = del;
/* eslint-disable no-console */
const chalk_1 = __importDefault(require("chalk"));
const config_js_1 = require("./config.js");
/**
 * Make authenticated API request
 */
async function apiRequest(method, path, body, params) {
    const config = (0, config_js_1.getConfig)();
    if (!(0, config_js_1.isConfigured)()) {
        console.error(chalk_1.default.red('CLI not configured. Run `summit config init` first.'));
        process.exit(1);
    }
    if (!(0, config_js_1.isAuthenticated)()) {
        console.error(chalk_1.default.red('Not authenticated. Run `summit login` first.'));
        process.exit(1);
    }
    const url = new URL(path, config.baseUrl);
    if (params) {
        Object.entries(params).forEach(([key, value]) => {
            url.searchParams.set(key, value);
        });
    }
    const headers = {
        'Content-Type': 'application/json',
    };
    if (config.token) {
        headers['Authorization'] = `Bearer ${config.token}`;
    }
    else if (config.apiKey) {
        headers['X-API-Key'] = config.apiKey;
    }
    if (config.tenantId) {
        headers['X-Tenant-Id'] = config.tenantId;
    }
    try {
        const response = await fetch(url.toString(), {
            method,
            headers,
            body: body ? JSON.stringify(body) : undefined,
        });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
            console.error(chalk_1.default.red(`Error: ${errorData.error || errorData.message || `HTTP ${response.status}`}`));
            process.exit(1);
        }
        return (await response.json());
    }
    catch (error) {
        console.error(chalk_1.default.red(`Request failed: ${error.message}`));
        process.exit(1);
    }
}
/**
 * GET request helper
 */
function get(path, params) {
    return apiRequest('GET', path, undefined, params);
}
/**
 * POST request helper
 */
function post(path, body) {
    return apiRequest('POST', path, body);
}
/**
 * PUT request helper
 */
function put(path, body) {
    return apiRequest('PUT', path, body);
}
/**
 * DELETE request helper
 */
function del(path) {
    return apiRequest('DELETE', path);
}
