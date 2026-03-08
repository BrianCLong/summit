"use strict";
/**
 * OpenAPI Plugin
 * Schema-driven API integration with automatic client generation
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenAPIPlugin = void 0;
const axios_1 = __importDefault(require("axios"));
const fs_1 = require("fs");
const path_1 = require("path");
const js_yaml_1 = __importDefault(require("js-yaml"));
class OpenAPIPlugin {
    name = 'openapi';
    specCache = new Map();
    responseCache = new Map();
    authTokenCache = new Map();
    validate(config) {
        const stepConfig = config;
        if (!stepConfig.spec) {
            throw new Error('OpenAPI step requires spec configuration');
        }
        if (!stepConfig.operation_id) {
            throw new Error('OpenAPI step requires operation_id configuration');
        }
        // Validate auth configuration
        if (stepConfig.auth) {
            this.validateAuthConfig(stepConfig.auth);
        }
        // Validate retry configuration
        if (stepConfig.retry) {
            if (stepConfig.retry.max_attempts < 1) {
                throw new Error('retry.max_attempts must be >= 1');
            }
            if (stepConfig.retry.backoff_ms < 0) {
                throw new Error('retry.backoff_ms must be >= 0');
            }
        }
    }
    async execute(context, step, execution) {
        const stepConfig = step.config;
        try {
            const startTime = Date.now();
            // Load and cache OpenAPI specification
            const spec = await this.loadSpec(stepConfig.spec);
            // Find the operation
            const operation = this.findOperation(spec, stepConfig.operation_id);
            if (!operation) {
                throw new Error(`Operation ${stepConfig.operation_id} not found in spec`);
            }
            // Validate parameters against schema
            this.validateParameters(operation.operation, stepConfig.parameters || {});
            // Check cache first
            const cacheKey = this.getCacheKey(stepConfig);
            if (stepConfig.cache_ttl_seconds) {
                const cached = this.checkCache(cacheKey, stepConfig.cache_ttl_seconds);
                if (cached) {
                    return {
                        output: cached,
                        cost_usd: 0,
                        metadata: {
                            operation_id: stepConfig.operation_id,
                            cached: true,
                            spec_title: spec.info.title,
                            spec_version: spec.info.version,
                        },
                    };
                }
            }
            // Execute the API call with retry logic
            const response = await this.executeWithRetry(spec, operation, stepConfig);
            // Cache the response if caching is enabled
            if (stepConfig.cache_ttl_seconds) {
                this.updateCache(cacheKey, response, stepConfig.cache_ttl_seconds);
            }
            const duration = Date.now() - startTime;
            return {
                output: {
                    status: response.status,
                    headers: response.headers,
                    data: response.data,
                    duration_ms: response.duration_ms,
                },
                cost_usd: this.calculateCost(response, stepConfig),
                metadata: {
                    operation_id: stepConfig.operation_id,
                    spec_title: spec.info.title,
                    spec_version: spec.info.version,
                    server_url: operation.baseUrl,
                    method: operation.method.toUpperCase(),
                    path: operation.path,
                    cached: response.cached,
                    total_duration_ms: duration,
                },
            };
        }
        catch (error) {
            throw new Error(`OpenAPI execution failed: ${error.message}`);
        }
    }
    async compensate(context, step, execution) {
        const stepConfig = step.config;
        // Clear any cached responses for this operation
        if (stepConfig.cache_ttl_seconds) {
            const cacheKey = this.getCacheKey(stepConfig);
            this.responseCache.delete(cacheKey);
        }
        console.log(`OpenAPI compensation completed for ${stepConfig.operation_id}`);
    }
    async loadSpec(specPath) {
        if (this.specCache.has(specPath)) {
            return this.specCache.get(specPath);
        }
        let specContent;
        if (specPath.startsWith('http://') || specPath.startsWith('https://')) {
            // Load from URL
            const response = await axios_1.default.get(specPath, { timeout: 10000 });
            specContent =
                typeof response.data === 'string'
                    ? response.data
                    : JSON.stringify(response.data);
        }
        else {
            // Load from file
            specContent = (0, fs_1.readFileSync)((0, path_1.resolve)(specPath), 'utf8');
        }
        let spec;
        try {
            // Try JSON first
            spec = JSON.parse(specContent);
        }
        catch {
            // Try YAML
            spec = js_yaml_1.default.load(specContent);
        }
        // Validate OpenAPI version
        if (!spec.openapi || !spec.openapi.startsWith('3.')) {
            throw new Error(`Unsupported OpenAPI version: ${spec.openapi}. Only OpenAPI 3.x is supported.`);
        }
        this.specCache.set(specPath, spec);
        return spec;
    }
    findOperation(spec, operationId) {
        for (const [path, pathItem] of Object.entries(spec.paths)) {
            for (const [method, operation] of Object.entries(pathItem)) {
                if (operation.operationId === operationId) {
                    const baseUrl = spec.servers?.[0]?.url || '';
                    return {
                        operation,
                        method: method.toLowerCase(),
                        path,
                        baseUrl,
                    };
                }
            }
        }
        return null;
    }
    validateParameters(operation, parameters) {
        if (!operation.parameters) {
            return;
        }
        for (const param of operation.parameters) {
            if (param.required && !(param.name in parameters)) {
                throw new Error(`Required parameter missing: ${param.name}`);
            }
            // Basic type validation (simplified)
            if (param.name in parameters) {
                const value = parameters[param.name];
                const schema = param.schema;
                if (schema.type === 'integer' && !Number.isInteger(Number(value))) {
                    throw new Error(`Parameter ${param.name} must be an integer`);
                }
                if (schema.type === 'number' && isNaN(Number(value))) {
                    throw new Error(`Parameter ${param.name} must be a number`);
                }
                if (schema.type === 'boolean' && typeof value !== 'boolean') {
                    throw new Error(`Parameter ${param.name} must be a boolean`);
                }
            }
        }
    }
    async executeWithRetry(spec, operation, config) {
        const maxAttempts = config.retry?.max_attempts || 1;
        let lastError;
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                return await this.executeRequest(spec, operation, config);
            }
            catch (error) {
                lastError = error;
                // Don't retry on client errors (4xx)
                if (error instanceof Error && error.message.includes('status code 4')) {
                    break;
                }
                if (attempt < maxAttempts) {
                    const delay = this.calculateRetryDelay(config.retry, attempt);
                    await new Promise((resolve) => setTimeout(resolve, delay));
                }
            }
        }
        throw lastError;
    }
    async executeRequest(spec, operation, config) {
        const startTime = Date.now();
        // Build the full URL
        let url = operation.baseUrl + operation.path;
        // Replace path parameters
        const pathParams = {};
        const queryParams = {};
        const headerParams = {};
        if (operation.operation.parameters && config.parameters) {
            for (const param of operation.operation.parameters) {
                const value = config.parameters[param.name];
                if (value !== undefined) {
                    switch (param.in) {
                        case 'path':
                            pathParams[param.name] = value;
                            break;
                        case 'query':
                            queryParams[param.name] = value;
                            break;
                        case 'header':
                            headerParams[param.name] = String(value);
                            break;
                    }
                }
            }
        }
        // Replace path parameters in URL
        for (const [key, value] of Object.entries(pathParams)) {
            url = url.replace(`{${key}}`, encodeURIComponent(String(value)));
        }
        // Set up request configuration
        const requestConfig = {
            method: operation.method,
            url,
            params: queryParams,
            headers: {
                ...headerParams,
                ...config.headers,
            },
            timeout: config.timeout_ms || 30000,
            validateStatus: () => true, // Handle all status codes manually
        };
        // Add request body for POST/PUT/PATCH
        if (['post', 'put', 'patch'].includes(operation.method) &&
            config.request_body) {
            requestConfig.data = config.request_body;
            // Set content type if not specified
            if (!requestConfig.headers['Content-Type']) {
                requestConfig.headers['Content-Type'] = 'application/json';
            }
        }
        // Add authentication
        if (config.auth) {
            await this.addAuthentication(requestConfig, config.auth);
        }
        // Create axios instance
        const client = axios_1.default.create();
        // Execute request
        const response = await client(requestConfig);
        // Check for HTTP errors
        if (response.status >= 400) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        const duration = Date.now() - startTime;
        return {
            status: response.status,
            headers: this.normalizeHeaders(response.headers),
            data: response.data,
            duration_ms: duration,
            cached: false,
        };
    }
    async addAuthentication(requestConfig, auth) {
        switch (auth.type) {
            case 'bearer':
                if (auth.token) {
                    requestConfig.headers['Authorization'] = `Bearer ${auth.token}`;
                }
                break;
            case 'api_key':
                if (auth.api_key) {
                    if (auth.api_key.in === 'header') {
                        requestConfig.headers[auth.api_key.name] = auth.api_key.value;
                    }
                    else {
                        requestConfig.params = requestConfig.params || {};
                        requestConfig.params[auth.api_key.name] = auth.api_key.value;
                    }
                }
                break;
            case 'basic':
                if (auth.basic) {
                    const credentials = Buffer.from(`${auth.basic.username}:${auth.basic.password}`).toString('base64');
                    requestConfig.headers['Authorization'] = `Basic ${credentials}`;
                }
                break;
            case 'oauth2':
                if (auth.oauth2) {
                    const token = await this.getOAuth2Token(auth.oauth2);
                    requestConfig.headers['Authorization'] = `Bearer ${token}`;
                }
                break;
        }
    }
    normalizeHeaders(headers) {
        if (!headers) {
            return {};
        }
        const source = typeof headers.toJSON === 'function'
            ? headers.toJSON()
            : headers;
        return Object.entries(source).reduce((acc, [key, value]) => {
            if (typeof value === 'undefined' || value === null) {
                return acc;
            }
            acc[key] = Array.isArray(value) ? value.join(', ') : String(value);
            return acc;
        }, {});
    }
    async getOAuth2Token(oauth2) {
        const cacheKey = `${oauth2.client_id}:${oauth2.token_url}`;
        const cached = this.authTokenCache.get(cacheKey);
        if (cached && Date.now() < cached.expires) {
            return cached.token;
        }
        // Request new token
        const response = await axios_1.default.post(oauth2.token_url, {
            grant_type: 'client_credentials',
            client_id: oauth2.client_id,
            client_secret: oauth2.client_secret,
            scope: oauth2.scope,
        }, {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        });
        const tokenData = response.data;
        const expiresIn = tokenData.expires_in || 3600; // Default 1 hour
        const expires = Date.now() + expiresIn * 1000 - 60000; // Subtract 1 minute for safety
        this.authTokenCache.set(cacheKey, {
            token: tokenData.access_token,
            expires,
        });
        return tokenData.access_token;
    }
    calculateRetryDelay(retry, attempt) {
        if (!retry) {
            return 1000;
        }
        if (retry.exponential) {
            return retry.backoff_ms * Math.pow(2, attempt - 1);
        }
        else {
            return retry.backoff_ms;
        }
    }
    getCacheKey(config) {
        const key = {
            spec: config.spec,
            operation_id: config.operation_id,
            parameters: config.parameters,
            request_body: config.request_body,
        };
        return Buffer.from(JSON.stringify(key)).toString('base64');
    }
    checkCache(cacheKey, ttlSeconds) {
        const cached = this.responseCache.get(cacheKey);
        if (!cached) {
            return null;
        }
        const expired = Date.now() - cached.timestamp > ttlSeconds * 1000;
        if (expired) {
            this.responseCache.delete(cacheKey);
            return null;
        }
        return { ...cached.data, cached: true };
    }
    updateCache(cacheKey, response, ttlSeconds) {
        this.responseCache.set(cacheKey, {
            data: response,
            timestamp: Date.now(),
        });
        // Clean up expired entries periodically
        setTimeout(() => {
            const now = Date.now();
            for (const [key, entry] of this.responseCache.entries()) {
                if (now - entry.timestamp > ttlSeconds * 1000) {
                    this.responseCache.delete(key);
                }
            }
        }, ttlSeconds * 1000);
    }
    calculateCost(response, config) {
        // Basic cost calculation based on request/response size and duration
        const baseCost = 0.001; // $0.001 per API call
        const durationCost = (response.duration_ms / 1000) * 0.0001; // $0.0001 per second
        // Add cost based on response size
        let dataCost = 0;
        if (response.data) {
            const responseSize = JSON.stringify(response.data).length;
            dataCost = (responseSize / (1024 * 1024)) * 0.001; // $0.001 per MB
        }
        return baseCost + durationCost + dataCost;
    }
    validateAuthConfig(auth) {
        switch (auth.type) {
            case 'bearer':
                if (!auth.token) {
                    throw new Error('Bearer auth requires token');
                }
                break;
            case 'api_key':
                if (!auth.api_key?.name || !auth.api_key?.value) {
                    throw new Error('API key auth requires name and value');
                }
                break;
            case 'basic':
                if (!auth.basic?.username || !auth.basic?.password) {
                    throw new Error('Basic auth requires username and password');
                }
                break;
            case 'oauth2':
                if (!auth.oauth2?.client_id ||
                    !auth.oauth2?.client_secret ||
                    !auth.oauth2?.token_url) {
                    throw new Error('OAuth2 auth requires client_id, client_secret, and token_url');
                }
                break;
            default:
                throw new Error(`Unsupported auth type: ${auth.type}`);
        }
    }
}
exports.OpenAPIPlugin = OpenAPIPlugin;
