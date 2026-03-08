"use strict";
/**
 * Summit SDK Client
 *
 * Main client for the Summit platform API.
 *
 * SOC 2 Controls: CC6.1 (Access Control), CC7.1 (System Operations)
 *
 * @module @summit/sdk
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ComplianceClient = exports.GovernanceClient = exports.SummitClient = void 0;
const governance_js_1 = require("./governance.js");
const compliance_js_1 = require("./compliance.js");
/**
 * Default configuration values
 */
const DEFAULT_CONFIG = {
    timeout: 30000,
    retries: 3,
};
/**
 * Summit API Client
 *
 * @example
 * ```typescript
 * import { SummitClient } from '@summit/sdk';
 *
 * const client = new SummitClient({
 *   baseUrl: 'https://api.summit.example.com',
 *   apiKey: 'your-api-key',
 *   tenantId: 'tenant-123'
 * });
 *
 * // Authenticate
 * await client.login('user@example.com', 'password');
 *
 * // Use governance features
 * const result = await client.governance.evaluate({
 *   action: 'read',
 *   resource: { type: 'document', id: 'doc-123' }
 * });
 *
 * // Check compliance
 * const summary = await client.compliance.getSummary('SOC2');
 * ```
 */
class SummitClient {
    config;
    token;
    /**
     * Governance module for policy management and evaluation
     */
    governance;
    /**
     * Compliance module for framework and evidence management
     */
    compliance;
    constructor(config) {
        this.config = { ...DEFAULT_CONFIG, ...config };
        this.token = config.token;
        // Initialize sub-clients
        const httpClient = {
            get: this.get.bind(this),
            post: this.post.bind(this),
            put: this.put.bind(this),
            delete: this.delete.bind(this),
        };
        this.governance = new governance_js_1.GovernanceClient(httpClient);
        this.compliance = new compliance_js_1.ComplianceClient(httpClient);
    }
    // ==========================================================================
    // HTTP Methods
    // ==========================================================================
    /**
     * Get authorization headers
     */
    getHeaders() {
        const headers = {
            'Content-Type': 'application/json',
        };
        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }
        else if (this.config.apiKey) {
            headers['X-API-Key'] = this.config.apiKey;
        }
        if (this.config.tenantId) {
            headers['X-Tenant-Id'] = this.config.tenantId;
        }
        return headers;
    }
    /**
     * Make HTTP request with retry logic
     */
    async request(method, path, body, params) {
        const url = new URL(path, this.config.baseUrl);
        if (params) {
            Object.entries(params).forEach(([key, value]) => {
                url.searchParams.set(key, value);
            });
        }
        let lastError;
        const retries = this.config.retries || 3;
        for (let attempt = 0; attempt < retries; attempt++) {
            try {
                const controller = new AbortController();
                const timeout = setTimeout(() => controller.abort(), this.config.timeout);
                const response = await fetch(url.toString(), {
                    method,
                    headers: this.getHeaders(),
                    body: body ? JSON.stringify(body) : undefined,
                    signal: controller.signal,
                });
                clearTimeout(timeout);
                if (response.status === 401) {
                    this.config.onUnauthorized?.();
                    throw this.createError('Unauthorized', 'AUTH_REQUIRED', 401);
                }
                if (!response.ok) {
                    const errorBody = await response.json().catch(() => ({}));
                    throw this.createError(errorBody.message || errorBody.error || `HTTP ${response.status}`, errorBody.code || 'API_ERROR', response.status, response.headers.get('X-Request-Id') || undefined, errorBody.details);
                }
                return (await response.json());
            }
            catch (error) {
                lastError = error;
                // Don't retry on client errors (4xx)
                if (error instanceof Error && 'statusCode' in error) {
                    const statusCode = error.statusCode;
                    if (statusCode >= 400 && statusCode < 500) {
                        throw error;
                    }
                }
                // Retry with exponential backoff for server errors
                if (attempt < retries - 1) {
                    await this.sleep(Math.pow(2, attempt) * 1000);
                }
            }
        }
        throw lastError;
    }
    createError(message, code, statusCode, requestId, details) {
        const error = new Error(message);
        error.code = code;
        error.statusCode = statusCode;
        error.requestId = requestId;
        error.details = details;
        return error;
    }
    sleep(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
    async get(path, params) {
        return this.request('GET', path, undefined, params);
    }
    async post(path, body) {
        return this.request('POST', path, body);
    }
    async put(path, body) {
        return this.request('PUT', path, body);
    }
    async delete(path) {
        return this.request('DELETE', path);
    }
    // ==========================================================================
    // Authentication
    // ==========================================================================
    /**
     * Authenticate with username and password
     *
     * @param email - User email
     * @param password - User password
     * @returns Authentication response with token
     */
    async login(email, password) {
        const response = await this.post('/auth/login', { email, password });
        this.token = response.data.token;
        return response;
    }
    /**
     * Authenticate with API key
     *
     * @param apiKey - API key
     * @returns Authentication response
     */
    async authenticateWithApiKey(apiKey) {
        this.config.apiKey = apiKey;
        return this.post('/auth/api-key', { apiKey });
    }
    /**
     * Refresh authentication token
     *
     * @param refreshToken - Refresh token
     * @returns New authentication response
     */
    async refreshToken(refreshToken) {
        const response = await this.post('/auth/refresh', { refreshToken });
        this.token = response.data.token;
        return response;
    }
    /**
     * Logout and invalidate token
     */
    async logout() {
        await this.post('/auth/logout', {});
        this.token = undefined;
    }
    /**
     * Get current user information
     *
     * @returns Current user details
     */
    async getCurrentUser() {
        return this.get('/auth/me');
    }
    // ==========================================================================
    // Tenant Management
    // ==========================================================================
    /**
     * Get current tenant information
     *
     * @returns Tenant details
     */
    async getTenant() {
        return this.get('/tenants/current');
    }
    /**
     * Update tenant settings
     *
     * @param settings - Settings to update
     * @returns Updated tenant
     */
    async updateTenantSettings(settings) {
        return this.put('/tenants/current/settings', settings);
    }
    /**
     * List users in tenant
     *
     * @returns List of users
     */
    async listUsers() {
        return this.get('/users');
    }
    /**
     * Get user by ID
     *
     * @param userId - User identifier
     * @returns User details
     */
    async getUser(userId) {
        return this.get(`/users/${userId}`);
    }
    // ==========================================================================
    // Integration Management
    // ==========================================================================
    /**
     * List configured integrations
     *
     * @returns List of integrations
     */
    async listIntegrations() {
        return this.get('/integrations');
    }
    /**
     * Get integration by ID
     *
     * @param integrationId - Integration identifier
     * @returns Integration details
     */
    async getIntegration(integrationId) {
        return this.get(`/integrations/${integrationId}`);
    }
    /**
     * Execute integration action
     *
     * @param request - Action request
     * @returns Action result
     *
     * @example
     * ```typescript
     * const result = await client.executeIntegrationAction({
     *   integrationId: 'slack-123',
     *   action: 'send_message',
     *   payload: {
     *     channel: '#alerts',
     *     message: 'Critical security event detected'
     *   }
     * });
     * ```
     */
    async executeIntegrationAction(request) {
        return this.post(`/integrations/${request.integrationId}/execute`, { action: request.action, payload: request.payload });
    }
    // ==========================================================================
    // Plugin Management
    // ==========================================================================
    /**
     * List installed plugins
     *
     * @returns List of plugins
     */
    async listPlugins() {
        return this.get('/plugins');
    }
    /**
     * Get plugin by ID
     *
     * @param pluginId - Plugin identifier
     * @returns Plugin details
     */
    async getPlugin(pluginId) {
        return this.get(`/plugins/${pluginId}`);
    }
    /**
     * Enable a plugin
     *
     * @param pluginId - Plugin identifier
     * @returns Updated plugin
     */
    async enablePlugin(pluginId) {
        return this.post(`/plugins/${pluginId}/enable`, {});
    }
    /**
     * Disable a plugin
     *
     * @param pluginId - Plugin identifier
     * @returns Updated plugin
     */
    async disablePlugin(pluginId) {
        return this.post(`/plugins/${pluginId}/disable`, {});
    }
    // ==========================================================================
    // Audit Logging
    // ==========================================================================
    /**
     * Query audit logs
     *
     * @param params - Query parameters
     * @returns Audit log entries
     *
     * @example
     * ```typescript
     * const logs = await client.queryAuditLogs({
     *   startDate: '2024-01-01',
     *   endDate: '2024-01-31',
     *   action: 'policy.update',
     *   limit: 100
     * });
     * ```
     */
    async queryAuditLogs(params) {
        const queryParams = {};
        if (params?.startDate)
            queryParams.startDate = params.startDate;
        if (params?.endDate)
            queryParams.endDate = params.endDate;
        if (params?.userId)
            queryParams.userId = params.userId;
        if (params?.action)
            queryParams.action = params.action;
        if (params?.resourceType)
            queryParams.resourceType = params.resourceType;
        if (params?.outcome)
            queryParams.outcome = params.outcome;
        if (params?.limit)
            queryParams.limit = params.limit.toString();
        if (params?.offset)
            queryParams.offset = params.offset.toString();
        return this.get('/audit/logs', queryParams);
    }
    /**
     * Get audit log entry by ID
     *
     * @param entryId - Audit log entry identifier
     * @returns Audit log entry
     */
    async getAuditLogEntry(entryId) {
        return this.get(`/audit/logs/${entryId}`);
    }
    // ==========================================================================
    // Health & Status
    // ==========================================================================
    /**
     * Check API health
     *
     * @returns Health status
     */
    async health() {
        return this.get('/health');
    }
    /**
     * Get API version information
     *
     * @returns Version details
     */
    async version() {
        return this.get('/version');
    }
}
exports.SummitClient = SummitClient;
// Re-export types and sub-clients
__exportStar(require("./types.js"), exports);
var governance_js_2 = require("./governance.js");
Object.defineProperty(exports, "GovernanceClient", { enumerable: true, get: function () { return governance_js_2.GovernanceClient; } });
var compliance_js_2 = require("./compliance.js");
Object.defineProperty(exports, "ComplianceClient", { enumerable: true, get: function () { return compliance_js_2.ComplianceClient; } });
