"use strict";
/**
 * TAXII 2.1 Client with Proxy Support
 * Full-featured client for TAXII 2.1 servers with support for air-gapped environments
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TaxiiClient = void 0;
exports.createTaxiiClient = createTaxiiClient;
const axios_1 = __importDefault(require("axios"));
const https_proxy_agent_1 = require("https-proxy-agent");
const socks_proxy_agent_1 = require("socks-proxy-agent");
const node_https_1 = require("node:https");
const node_fs_1 = require("node:fs");
const pino_1 = __importDefault(require("pino"));
const logger = (0, pino_1.default)({ name: 'taxii-client' });
const TAXII_MEDIA_TYPE = 'application/taxii+json;version=2.1';
const STIX_MEDIA_TYPE = 'application/stix+json;version=2.1';
class TaxiiClient {
    config;
    httpClient;
    discoveredApiRoots = [];
    cachedCollections = new Map();
    constructor(config) {
        this.config = {
            timeout: 30000,
            pageSize: 100,
            verifySsl: true,
            headers: {},
            retry: {
                maxRetries: 3,
                initialDelayMs: 1000,
                maxDelayMs: 30000,
                backoffMultiplier: 2,
                retryableStatusCodes: [429, 500, 502, 503, 504],
            },
            ...config,
        };
        this.httpClient = this.createHttpClient();
    }
    /**
     * Create configured HTTP client with proxy and auth support
     */
    createHttpClient() {
        const axiosConfig = {
            baseURL: this.config.serverUrl,
            timeout: this.config.timeout,
            headers: {
                Accept: TAXII_MEDIA_TYPE,
                'Content-Type': TAXII_MEDIA_TYPE,
                ...this.config.headers,
            },
            validateStatus: (status) => status < 500,
        };
        // Configure proxy agent
        if (this.config.proxy) {
            const agent = this.createProxyAgent(this.config.proxy);
            axiosConfig.httpAgent = agent;
            axiosConfig.httpsAgent = agent;
        }
        else if (!this.config.verifySsl) {
            axiosConfig.httpsAgent = new node_https_1.Agent({ rejectUnauthorized: false });
        }
        // Configure authentication
        if (this.config.auth) {
            this.applyAuth(axiosConfig, this.config.auth);
        }
        const client = axios_1.default.create(axiosConfig);
        // Add request/response interceptors for logging
        client.interceptors.request.use((config) => {
            logger.debug({ url: config.url, method: config.method }, 'TAXII request');
            return config;
        }, (error) => {
            logger.error({ error: error.message }, 'TAXII request error');
            return Promise.reject(error);
        });
        client.interceptors.response.use((response) => {
            logger.debug({ url: response.config.url, status: response.status }, 'TAXII response');
            return response;
        }, (error) => {
            if (error.response) {
                logger.error({ url: error.config?.url, status: error.response.status, data: error.response.data }, 'TAXII response error');
            }
            return Promise.reject(error);
        });
        return client;
    }
    /**
     * Create proxy agent based on configuration
     */
    createProxyAgent(proxy) {
        const authString = proxy.auth
            ? `${proxy.auth.username}:${proxy.auth.password}@`
            : '';
        switch (proxy.type) {
            case 'socks4':
            case 'socks5':
                return new socks_proxy_agent_1.SocksProxyAgent(`${proxy.type}://${authString}${proxy.host}:${proxy.port}`);
            case 'http':
            case 'https':
            default:
                return new https_proxy_agent_1.HttpsProxyAgent(`${proxy.type}://${authString}${proxy.host}:${proxy.port}`);
        }
    }
    /**
     * Apply authentication to request config
     */
    applyAuth(config, auth) {
        config.headers = config.headers || {};
        switch (auth.type) {
            case 'basic':
                if (auth.username && auth.password) {
                    const credentials = Buffer.from(`${auth.username}:${auth.password}`).toString('base64');
                    config.headers['Authorization'] = `Basic ${credentials}`;
                }
                break;
            case 'bearer':
                if (auth.token) {
                    config.headers['Authorization'] = `Bearer ${auth.token}`;
                }
                break;
            case 'api-key':
                if (auth.apiKey) {
                    const header = auth.apiKeyHeader || 'X-API-Key';
                    config.headers[header] = auth.apiKey;
                }
                break;
            case 'certificate':
                if (auth.certificate) {
                    const httpsAgent = new node_https_1.Agent({
                        cert: typeof auth.certificate.cert === 'string'
                            ? (0, node_fs_1.readFileSync)(auth.certificate.cert)
                            : auth.certificate.cert,
                        key: typeof auth.certificate.key === 'string'
                            ? (0, node_fs_1.readFileSync)(auth.certificate.key)
                            : auth.certificate.key,
                        ca: auth.certificate.ca
                            ? (typeof auth.certificate.ca === 'string'
                                ? (0, node_fs_1.readFileSync)(auth.certificate.ca)
                                : auth.certificate.ca)
                            : undefined,
                        passphrase: auth.certificate.passphrase,
                        rejectUnauthorized: this.config.verifySsl,
                    });
                    config.httpsAgent = httpsAgent;
                }
                break;
        }
    }
    /**
     * Execute request with retry logic
     */
    async executeWithRetry(request, retryConfig = this.config.retry) {
        const { maxRetries = 3, initialDelayMs = 1000, maxDelayMs = 30000, backoffMultiplier = 2, retryableStatusCodes = [] } = retryConfig || {};
        let lastError;
        let delay = initialDelayMs;
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                return await request();
            }
            catch (error) {
                lastError = error;
                const axiosError = error;
                const status = axiosError.response?.status;
                // Don't retry on non-retryable errors
                if (status && !retryableStatusCodes.includes(status) && status < 500) {
                    throw error;
                }
                if (attempt < maxRetries) {
                    logger.warn({ attempt: attempt + 1, maxRetries, delayMs: delay, error: lastError.message }, 'TAXII request failed, retrying');
                    await this.delay(delay);
                    delay = Math.min(delay * backoffMultiplier, maxDelayMs);
                }
            }
        }
        throw lastError;
    }
    delay(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
    // =========================================================================
    // Discovery API
    // =========================================================================
    /**
     * Get TAXII server discovery document
     */
    async discover() {
        return this.executeWithRetry(async () => {
            const response = await this.httpClient.get('/taxii2/');
            this.handleTaxiiError(response);
            this.discoveredApiRoots = response.data.api_roots || [];
            return response.data;
        });
    }
    /**
     * Get API root information
     */
    async getApiRoot(apiRoot) {
        const root = apiRoot || this.config.apiRoot || this.discoveredApiRoots[0];
        if (!root) {
            throw new Error('No API root specified or discovered');
        }
        return this.executeWithRetry(async () => {
            const response = await this.httpClient.get(root);
            this.handleTaxiiError(response);
            return response.data;
        });
    }
    // =========================================================================
    // Collections API
    // =========================================================================
    /**
     * Get all collections from an API root
     */
    async getCollections(apiRoot) {
        const root = apiRoot || this.config.apiRoot || this.discoveredApiRoots[0];
        if (!root) {
            throw new Error('No API root specified or discovered');
        }
        // Check cache
        if (this.cachedCollections.has(root)) {
            return this.cachedCollections.get(root);
        }
        return this.executeWithRetry(async () => {
            const response = await this.httpClient.get(`${root}/collections/`);
            this.handleTaxiiError(response);
            const collections = response.data.collections || [];
            this.cachedCollections.set(root, collections);
            return collections;
        });
    }
    /**
     * Get a specific collection by ID
     */
    async getCollection(collectionId, apiRoot) {
        const root = apiRoot || this.config.apiRoot || this.discoveredApiRoots[0];
        if (!root) {
            throw new Error('No API root specified or discovered');
        }
        return this.executeWithRetry(async () => {
            const response = await this.httpClient.get(`${root}/collections/${collectionId}/`);
            this.handleTaxiiError(response);
            return response.data;
        });
    }
    // =========================================================================
    // Objects API
    // =========================================================================
    /**
     * Get objects from a collection with pagination support
     */
    async getObjects(collectionId, params, apiRoot) {
        const root = apiRoot || this.config.apiRoot || this.discoveredApiRoots[0];
        if (!root) {
            throw new Error('No API root specified or discovered');
        }
        return this.executeWithRetry(async () => {
            const queryParams = {};
            if (params?.added_after) {
                queryParams['added_after'] = params.added_after;
            }
            if (params?.limit) {
                queryParams['limit'] = params.limit.toString();
            }
            if (params?.next) {
                queryParams['next'] = params.next;
            }
            if (params?.match) {
                if (params.match.id) {
                    queryParams['match[id]'] = Array.isArray(params.match.id)
                        ? params.match.id.join(',')
                        : params.match.id;
                }
                if (params.match.type) {
                    queryParams['match[type]'] = Array.isArray(params.match.type)
                        ? params.match.type.join(',')
                        : params.match.type;
                }
                if (params.match.version) {
                    queryParams['match[version]'] = params.match.version;
                }
                if (params.match.spec_version) {
                    queryParams['match[spec_version]'] = Array.isArray(params.match.spec_version)
                        ? params.match.spec_version.join(',')
                        : params.match.spec_version;
                }
            }
            const response = await this.httpClient.get(`${root}/collections/${collectionId}/objects/`, { params: queryParams, headers: { Accept: STIX_MEDIA_TYPE } });
            this.handleTaxiiError(response);
            return response.data;
        });
    }
    /**
     * Get all objects from a collection (handles pagination automatically)
     */
    async getAllObjects(collectionId, params, apiRoot) {
        const allObjects = [];
        let nextCursor;
        let hasMore = true;
        while (hasMore) {
            const envelope = await this.getObjects(collectionId, { ...params, next: nextCursor, limit: this.config.pageSize }, apiRoot);
            if (envelope.objects) {
                allObjects.push(...envelope.objects);
            }
            hasMore = envelope.more ?? false;
            nextCursor = envelope.next;
            logger.debug({ fetched: allObjects.length, hasMore, nextCursor }, 'Fetching objects from collection');
        }
        return allObjects;
    }
    /**
     * Get a specific object by ID
     */
    async getObject(collectionId, objectId, apiRoot) {
        const root = apiRoot || this.config.apiRoot || this.discoveredApiRoots[0];
        if (!root) {
            throw new Error('No API root specified or discovered');
        }
        return this.executeWithRetry(async () => {
            const response = await this.httpClient.get(`${root}/collections/${collectionId}/objects/${objectId}/`, { headers: { Accept: STIX_MEDIA_TYPE } });
            this.handleTaxiiError(response);
            return response.data;
        });
    }
    /**
     * Add objects to a collection
     */
    async addObjects(collectionId, objects, apiRoot) {
        const root = apiRoot || this.config.apiRoot || this.discoveredApiRoots[0];
        if (!root) {
            throw new Error('No API root specified or discovered');
        }
        return this.executeWithRetry(async () => {
            const response = await this.httpClient.post(`${root}/collections/${collectionId}/objects/`, { objects }, { headers: { 'Content-Type': STIX_MEDIA_TYPE } });
            this.handleTaxiiError(response);
            return response.data;
        });
    }
    /**
     * Delete an object from a collection
     */
    async deleteObject(collectionId, objectId, apiRoot) {
        const root = apiRoot || this.config.apiRoot || this.discoveredApiRoots[0];
        if (!root) {
            throw new Error('No API root specified or discovered');
        }
        return this.executeWithRetry(async () => {
            const response = await this.httpClient.delete(`${root}/collections/${collectionId}/objects/${objectId}/`);
            this.handleTaxiiError(response);
        });
    }
    // =========================================================================
    // Manifest API
    // =========================================================================
    /**
     * Get manifest of objects in a collection
     */
    async getManifest(collectionId, params, apiRoot) {
        const root = apiRoot || this.config.apiRoot || this.discoveredApiRoots[0];
        if (!root) {
            throw new Error('No API root specified or discovered');
        }
        return this.executeWithRetry(async () => {
            const queryParams = {};
            if (params?.added_after)
                queryParams['added_after'] = params.added_after;
            if (params?.limit)
                queryParams['limit'] = params.limit.toString();
            if (params?.next)
                queryParams['next'] = params.next;
            const response = await this.httpClient.get(`${root}/collections/${collectionId}/manifest/`, { params: queryParams });
            this.handleTaxiiError(response);
            return response.data;
        });
    }
    // =========================================================================
    // Status API
    // =========================================================================
    /**
     * Get status of an add objects request
     */
    async getStatus(statusId, apiRoot) {
        const root = apiRoot || this.config.apiRoot || this.discoveredApiRoots[0];
        if (!root) {
            throw new Error('No API root specified or discovered');
        }
        return this.executeWithRetry(async () => {
            const response = await this.httpClient.get(`${root}/status/${statusId}/`);
            this.handleTaxiiError(response);
            return response.data;
        });
    }
    // =========================================================================
    // Health & Utility Methods
    // =========================================================================
    /**
     * Check health of TAXII server
     */
    async healthCheck() {
        const startTime = Date.now();
        const result = {
            serverUrl: this.config.serverUrl,
            healthy: false,
            lastChecked: new Date().toISOString(),
        };
        try {
            const discovery = await this.discover();
            result.healthy = true;
            result.latencyMs = Date.now() - startTime;
            result.availableApiRoots = discovery.api_roots;
            // Try to get collections count
            if (discovery.api_roots && discovery.api_roots.length > 0) {
                try {
                    const collections = await this.getCollections(discovery.api_roots[0]);
                    result.availableCollections = collections.length;
                }
                catch {
                    // Ignore collection fetch errors for health check
                }
            }
        }
        catch (error) {
            result.error = error.message;
            result.latencyMs = Date.now() - startTime;
        }
        return result;
    }
    /**
     * Sync all objects from a collection since a given timestamp
     */
    async syncCollection(collectionId, addedAfter, apiRoot) {
        const startTime = new Date().toISOString();
        const start = Date.now();
        const result = {
            feedId: '',
            collectionId,
            success: false,
            objectsReceived: 0,
            objectsProcessed: 0,
            objectsStored: 0,
            objectsSkipped: 0,
            objectsFailed: 0,
            errors: [],
            startTime,
            endTime: '',
            durationMs: 0,
            hasMore: false,
        };
        try {
            const objects = await this.getAllObjects(collectionId, addedAfter ? { added_after: addedAfter } : undefined, apiRoot);
            result.objectsReceived = objects.length;
            result.objectsProcessed = objects.length;
            result.objectsStored = objects.length;
            result.success = true;
        }
        catch (error) {
            result.errors.push({
                message: error.message,
            });
        }
        result.endTime = new Date().toISOString();
        result.durationMs = Date.now() - start;
        return result;
    }
    /**
     * Clear collections cache
     */
    clearCache() {
        this.cachedCollections.clear();
        this.discoveredApiRoots = [];
    }
    /**
     * Handle TAXII error responses
     */
    handleTaxiiError(response) {
        if (response.status >= 400) {
            const error = response.data;
            const message = error.title || error.description || 'Unknown TAXII error';
            const taxiiError = new Error(message);
            taxiiError.taxiiError = error;
            throw taxiiError;
        }
    }
}
exports.TaxiiClient = TaxiiClient;
/**
 * Factory function to create a TAXII client
 */
function createTaxiiClient(config) {
    return new TaxiiClient(config);
}
