"use strict";
/**
 * Lightweight Entity Resolution Client
 *
 * A typed client for consuming the ER service API
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ERClient = void 0;
exports.createERClient = createERClient;
/**
 * Entity Resolution Client
 */
class ERClient {
    baseUrl;
    timeout;
    headers;
    constructor(config) {
        this.baseUrl = config.baseUrl.replace(/\/$/, '');
        this.timeout = config.timeout || 30000;
        this.headers = {
            'Content-Type': 'application/json',
            ...config.headers,
        };
    }
    /**
     * Find candidate matches for an entity
     */
    async candidates(request) {
        return this.request('POST', '/candidates', request);
    }
    /**
     * Merge entities
     */
    async merge(request) {
        return this.request('POST', '/merge', request);
    }
    /**
     * Revert a merge
     */
    async revertMerge(mergeId, actor, reason) {
        return this.request('POST', `/merge/${mergeId}/revert`, { actor, reason });
    }
    /**
     * Split an entity
     */
    async split(request) {
        return this.request('POST', '/split', request);
    }
    /**
     * Explain a merge decision
     */
    async explain(mergeId) {
        return this.request('GET', `/explain/${mergeId}`);
    }
    /**
     * Get merge record
     */
    async getMerge(mergeId) {
        return this.request('GET', `/merge/${mergeId}`);
    }
    /**
     * Get split record
     */
    async getSplit(splitId) {
        return this.request('GET', `/split/${splitId}`);
    }
    /**
     * Get audit log
     */
    async getAuditLog(options) {
        const params = new URLSearchParams();
        if (options?.tenantId)
            params.append('tenantId', options.tenantId);
        if (options?.actor)
            params.append('actor', options.actor);
        if (options?.event)
            params.append('event', options.event);
        if (options?.limit)
            params.append('limit', options.limit.toString());
        const query = params.toString();
        return this.request('GET', `/audit${query ? `?${query}` : ''}`);
    }
    /**
     * Get statistics
     */
    async getStats() {
        return this.request('GET', '/stats');
    }
    /**
     * Health check
     */
    async health() {
        return this.request('GET', '/health');
    }
    /**
     * Make HTTP request
     */
    async request(method, path, body) {
        const url = `${this.baseUrl}/api/v1${path}`;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);
        try {
            const response = await fetch(url, {
                method,
                headers: this.headers,
                body: body ? JSON.stringify(body) : undefined,
                signal: controller.signal,
            });
            clearTimeout(timeoutId);
            if (!response.ok) {
                const error = await response.json().catch(() => ({ error: response.statusText }));
                throw new Error(error.error || `HTTP ${response.status}: ${response.statusText}`);
            }
            return response.json();
        }
        catch (error) {
            clearTimeout(timeoutId);
            if (error instanceof Error) {
                if (error.name === 'AbortError') {
                    throw new Error(`Request timeout after ${this.timeout}ms`);
                }
                throw error;
            }
            throw new Error('Unknown error occurred');
        }
    }
}
exports.ERClient = ERClient;
/**
 * Create ER client
 */
function createERClient(config) {
    return new ERClient(config);
}
