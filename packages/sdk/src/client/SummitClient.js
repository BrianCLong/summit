"use strict";
/**
 * Summit SDK Main Client
 *
 * Primary client for interacting with the Summit Platform API.
 * Provides unified access to all platform services with built-in
 * authentication, retries, and rate limiting.
 *
 * @module @summit/sdk
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SummitClient = void 0;
exports.createSummitClient = createSummitClient;
/* eslint-disable require-await, no-console */
const events_1 = require("events");
// ============================================================================
// Summit Client Implementation
// ============================================================================
class SummitClient extends events_1.EventEmitter {
    config;
    accessToken = null;
    refreshToken = null;
    tokenExpiry = null;
    rateLimitInfo = null;
    constructor(config) {
        super();
        this.config = {
            baseUrl: config.baseUrl.replace(/\/$/, ''),
            tenantId: config.tenantId || '',
            apiKey: config.apiKey || '',
            accessToken: config.accessToken || '',
            timeout: config.timeout || 30000,
            retries: config.retries || 3,
            retryDelay: config.retryDelay || 1000,
            enableLogging: config.enableLogging ?? false,
            logLevel: config.logLevel || 'info',
        };
        if (config.accessToken) {
            this.accessToken = config.accessToken;
        }
    }
    // --------------------------------------------------------------------------
    // Authentication
    // --------------------------------------------------------------------------
    /**
     * Authenticate with API key
     */
    async authenticateWithApiKey(apiKey) {
        this.config.apiKey = apiKey;
        this.emit('auth:login', { method: 'api_key' });
        this.log('info', 'Authenticated with API key');
    }
    /**
     * Authenticate with OAuth2
     */
    async authenticateWithOAuth2(clientId, clientSecret, scopes = []) {
        const response = await this.request('/oauth/token', {
            method: 'POST',
            body: {
                grant_type: 'client_credentials',
                client_id: clientId,
                client_secret: clientSecret,
                scope: scopes.join(' '),
            },
        });
        this.accessToken = response.data.access_token;
        this.refreshToken = response.data.refresh_token;
        this.tokenExpiry = new Date(Date.now() + response.data.expires_in * 1000);
        this.emit('auth:login', { method: 'oauth2' });
        this.log('info', 'Authenticated with OAuth2');
        return {
            accessToken: response.data.access_token,
            refreshToken: response.data.refresh_token,
            expiresIn: response.data.expires_in,
        };
    }
    /**
     * Authenticate with username/password
     */
    async authenticateWithPassword(email, password) {
        const response = await this.request('/auth/login', {
            method: 'POST',
            body: { email, password },
        });
        this.accessToken = response.data.access_token;
        this.refreshToken = response.data.refresh_token;
        this.tokenExpiry = new Date(Date.now() + response.data.expires_in * 1000);
        this.emit('auth:login', { method: 'jwt' });
        return {
            accessToken: response.data.access_token,
            refreshToken: response.data.refresh_token,
        };
    }
    /**
     * Refresh access token
     */
    async refreshAccessToken() {
        if (!this.refreshToken) {
            throw new Error('No refresh token available');
        }
        const response = await this.request('/auth/refresh', {
            method: 'POST',
            body: { refresh_token: this.refreshToken },
        });
        this.accessToken = response.data.access_token;
        this.tokenExpiry = new Date(Date.now() + response.data.expires_in * 1000);
        this.emit('auth:refresh');
        this.log('info', 'Access token refreshed');
    }
    /**
     * Logout and clear credentials
     */
    logout() {
        this.accessToken = null;
        this.refreshToken = null;
        this.tokenExpiry = null;
        this.config.apiKey = '';
        this.emit('auth:logout');
        this.log('info', 'Logged out');
    }
    /**
     * Check if authenticated
     */
    isAuthenticated() {
        if (this.config.apiKey) {
            return true;
        }
        if (!this.accessToken) {
            return false;
        }
        if (this.tokenExpiry && this.tokenExpiry <= new Date()) {
            return false;
        }
        return true;
    }
    // --------------------------------------------------------------------------
    // HTTP Request Methods
    // --------------------------------------------------------------------------
    /**
     * Make an API request
     */
    async request(path, options = {}) {
        const { method = 'GET', body, query, headers = {} } = options;
        let url = `${this.config.baseUrl}${path}`;
        // Add query parameters
        if (query) {
            const params = new URLSearchParams();
            Object.entries(query).forEach(([key, value]) => {
                if (value !== undefined) {
                    params.append(key, String(value));
                }
            });
            const queryString = params.toString();
            if (queryString) {
                url += `?${queryString}`;
            }
        }
        // Build headers
        const requestHeaders = {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            ...headers,
        };
        // Add authentication
        if (this.config.apiKey) {
            requestHeaders['X-API-Key'] = this.config.apiKey;
        }
        else if (this.accessToken) {
            // Auto-refresh if token is about to expire
            if (this.tokenExpiry && this.refreshToken) {
                const expiresIn = this.tokenExpiry.getTime() - Date.now();
                if (expiresIn < 60000) {
                    await this.refreshAccessToken();
                }
            }
            requestHeaders['Authorization'] = `Bearer ${this.accessToken}`;
        }
        // Add tenant ID if set
        if (this.config.tenantId) {
            requestHeaders['X-Tenant-ID'] = this.config.tenantId;
        }
        // Emit request start event
        this.emit('request:start', { method, url });
        const startTime = Date.now();
        let lastError = null;
        let attempt = 0;
        while (attempt < this.config.retries) {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);
                const response = await fetch(url, {
                    method,
                    headers: requestHeaders,
                    body: body ? JSON.stringify(body) : undefined,
                    signal: controller.signal,
                });
                clearTimeout(timeoutId);
                // Parse rate limit headers
                this.parseRateLimitHeaders(response.headers);
                // Handle rate limiting
                if (response.status === 429) {
                    const retryAfter = parseInt(response.headers.get('Retry-After') || '60', 10);
                    this.emit('rate_limit:exceeded', { retryAfter });
                    if (attempt < this.config.retries - 1) {
                        await this.delay(retryAfter * 1000);
                        attempt++;
                        continue;
                    }
                }
                // Parse response
                const data = await this.parseResponse(response);
                const duration = Date.now() - startTime;
                this.emit('request:complete', { method, url, duration });
                this.log('debug', `${method} ${path} completed in ${duration}ms`);
                return {
                    data,
                    status: response.status,
                    headers: Object.fromEntries(response.headers.entries()),
                    requestId: response.headers.get('X-Request-ID') || undefined,
                };
            }
            catch (error) {
                lastError = error instanceof Error ? error : new Error(String(error));
                // Check if retryable
                if (this.isRetryableError(lastError)) {
                    attempt++;
                    if (attempt < this.config.retries) {
                        const delay = this.calculateRetryDelay(attempt);
                        this.log('warn', `Request failed, retrying in ${delay}ms (attempt ${attempt}/${this.config.retries})`);
                        await this.delay(delay);
                        continue;
                    }
                }
                this.emit('request:error', { method, url, error: lastError });
                throw lastError;
            }
        }
        throw lastError || new Error('Request failed after retries');
    }
    /**
     * GET request
     */
    async get(path, query, options) {
        return this.request(path, { method: 'GET', query, headers: options?.headers });
    }
    /**
     * POST request
     */
    async post(path, body, options) {
        return this.request(path, { method: 'POST', body, headers: options?.headers });
    }
    /**
     * PUT request
     */
    async put(path, body, options) {
        return this.request(path, { method: 'PUT', body, headers: options?.headers });
    }
    /**
     * PATCH request
     */
    async patch(path, body, options) {
        return this.request(path, { method: 'PATCH', body, headers: options?.headers });
    }
    /**
     * DELETE request
     */
    async delete(path, options) {
        return this.request(path, { method: 'DELETE', headers: options?.headers });
    }
    // --------------------------------------------------------------------------
    // Utility Methods
    // --------------------------------------------------------------------------
    /**
     * Get current configuration
     */
    getConfig() {
        return { ...this.config };
    }
    /**
     * Update configuration
     */
    updateConfig(config) {
        Object.assign(this.config, config);
    }
    /**
     * Set tenant ID
     */
    setTenantId(tenantId) {
        this.config.tenantId = tenantId;
    }
    /**
     * Get rate limit info
     */
    getRateLimitInfo() {
        return this.rateLimitInfo;
    }
    /**
     * Health check
     */
    async healthCheck() {
        const start = Date.now();
        try {
            const response = await this.get('/health');
            return {
                status: 'healthy',
                latency: Date.now() - start,
                version: response.data.version,
            };
        }
        catch (_error) {
            return {
                status: 'unhealthy',
                latency: Date.now() - start,
            };
        }
    }
    // --------------------------------------------------------------------------
    // Private Methods
    // --------------------------------------------------------------------------
    async parseResponse(response) {
        if (!response.ok) {
            const errorBody = await response.text();
            let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
            try {
                const errorJson = JSON.parse(errorBody);
                errorMessage = errorJson.message || errorJson.error || errorMessage;
            }
            catch {
                // Use default error message
            }
            const error = new Error(errorMessage);
            error.status = response.status;
            error.body = errorBody;
            throw error;
        }
        if (response.status === 204) {
            return {};
        }
        return response.json();
    }
    parseRateLimitHeaders(headers) {
        const limit = headers.get('X-RateLimit-Limit');
        const remaining = headers.get('X-RateLimit-Remaining');
        const reset = headers.get('X-RateLimit-Reset');
        if (limit && remaining && reset) {
            this.rateLimitInfo = {
                limit: parseInt(limit, 10),
                remaining: parseInt(remaining, 10),
                reset: new Date(parseInt(reset, 10) * 1000),
            };
        }
    }
    isRetryableError(error) {
        if (error.name === 'AbortError') {
            return false;
        }
        const errorWithStatus = error;
        if (errorWithStatus.status) {
            return [408, 429, 500, 502, 503, 504].includes(errorWithStatus.status);
        }
        return error.message.includes('fetch') || error.message.includes('network');
    }
    calculateRetryDelay(attempt) {
        const baseDelay = this.config.retryDelay;
        const exponentialBackoff = baseDelay * Math.pow(2, attempt - 1);
        const jitter = exponentialBackoff * (0.5 + Math.random() * 0.5);
        return Math.min(jitter, 30000);
    }
    delay(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
    log(level, message) {
        if (!this.config.enableLogging) {
            return;
        }
        const levels = ['debug', 'info', 'warn', 'error'];
        if (levels.indexOf(level) < levels.indexOf(this.config.logLevel)) {
            return;
        }
        const timestamp = new Date().toISOString();
        console[level](`[Summit SDK ${timestamp}] ${message}`);
    }
}
exports.SummitClient = SummitClient;
// ============================================================================
// Factory Function
// ============================================================================
/**
 * Create a new Summit client instance
 */
function createSummitClient(config) {
    return new SummitClient(config);
}
