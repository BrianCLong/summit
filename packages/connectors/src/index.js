"use strict";
/**
 * Integration Connectors Framework
 * Extensible connector system for integrating with external services
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConnectorDiscoveryApi = exports.ConnectorRegistry = exports.DatabaseConnector = exports.RestAPIConnector = exports.BaseConnector = void 0;
const events_1 = require("events");
const axios_1 = __importDefault(require("axios"));
class BaseConnector extends events_1.EventEmitter {
    config;
    httpClient;
    requestQueue = [];
    isProcessingQueue = false;
    constructor(config) {
        super();
        this.config = config;
        this.httpClient = this.createHttpClient();
    }
    /**
     * Create HTTP client with authentication and configuration
     */
    createHttpClient() {
        const instance = axios_1.default.create({
            baseURL: this.config.baseUrl,
            timeout: this.config.timeout || 30000,
            headers: this.getAuthHeaders(),
        });
        // Add request interceptor for authentication
        instance.interceptors.request.use((config) => {
            this.emit('request.start', { url: config.url, method: config.method });
            return config;
        }, (error) => {
            this.emit('request.error', error);
            return Promise.reject(error);
        });
        // Add response interceptor for error handling
        instance.interceptors.response.use((response) => {
            this.emit('request.success', {
                url: response.config.url,
                status: response.status,
            });
            return response;
        }, async (error) => {
            this.emit('request.error', error);
            // Handle retries
            if (this.config.retryConfig && !error.config.__retryCount) {
                error.config.__retryCount = 0;
            }
            if (this.config.retryConfig &&
                error.config.__retryCount < this.config.retryConfig.maxRetries) {
                error.config.__retryCount++;
                const delay = this.config.retryConfig.exponentialBackoff
                    ? this.config.retryConfig.retryDelay *
                        Math.pow(2, error.config.__retryCount - 1)
                    : this.config.retryConfig.retryDelay;
                await new Promise((resolve) => setTimeout(resolve, delay));
                return instance(error.config);
            }
            return Promise.reject(error);
        });
        return instance;
    }
    /**
     * Get authentication headers
     */
    getAuthHeaders() {
        const headers = {};
        switch (this.config.authentication.type) {
            case 'api_key':
                if (this.config.authentication.credentials?.apiKey) {
                    headers['X-API-Key'] = this.config.authentication.credentials.apiKey;
                }
                break;
            case 'bearer':
                if (this.config.authentication.credentials?.token) {
                    headers['Authorization'] =
                        `Bearer ${this.config.authentication.credentials.token}`;
                }
                break;
            case 'basic':
                if (this.config.authentication.credentials?.username &&
                    this.config.authentication.credentials?.password) {
                    const credentials = Buffer.from(`${this.config.authentication.credentials.username}:${this.config.authentication.credentials.password}`).toString('base64');
                    headers['Authorization'] = `Basic ${credentials}`;
                }
                break;
        }
        return headers;
    }
    /**
     * Execute a connector operation
     */
    async execute(operation, params = {}) {
        const startTime = Date.now();
        const retries = 0;
        try {
            // Apply rate limiting if configured
            if (this.config.rateLimiting) {
                await this.applyRateLimiting();
            }
            const result = await this.executeOperation(operation, params);
            return {
                success: true,
                data: result,
                metadata: {
                    duration: Date.now() - startTime,
                    retries,
                    timestamp: new Date(),
                },
            };
        }
        catch (error) {
            return {
                success: false,
                error: {
                    code: error.code || 'EXECUTION_ERROR',
                    message: error.message,
                    details: error.response?.data,
                },
                metadata: {
                    duration: Date.now() - startTime,
                    retries,
                    timestamp: new Date(),
                },
            };
        }
    }
    /**
     * Apply rate limiting
     */
    async applyRateLimiting() {
        // Simple rate limiting implementation
        // Production version would use a more sophisticated approach
        await new Promise((resolve) => {
            if (this.config.rateLimiting) {
                const delay = 1000 / this.config.rateLimiting.maxRequestsPerSecond;
                setTimeout(resolve, delay);
            }
            else {
                resolve();
            }
        });
    }
    /**
     * Validate configuration (can be overridden by subclasses)
     */
    validate() {
        if (!this.config.id || !this.config.name || !this.config.type) {
            throw new Error('Invalid connector configuration');
        }
        return true;
    }
    /**
     * Get configuration
     */
    getConfig() {
        return this.config;
    }
}
exports.BaseConnector = BaseConnector;
/**
 * REST API Connector
 */
class RestAPIConnector extends BaseConnector {
    operations = new Map();
    constructor(config, operations = []) {
        super(config);
        operations.forEach((op) => this.operations.set(op.name, op));
    }
    async executeOperation(operationName, params) {
        const operation = this.operations.get(operationName);
        if (!operation) {
            throw new Error(`Operation ${operationName} not found`);
        }
        // Build request
        const requestConfig = {
            method: operation.method,
            url: this.buildUrl(operation.endpoint, params),
            headers: this.buildHeaders(operation, params),
            params: this.buildQueryParams(operation, params),
            data: this.buildBody(operation, params),
        };
        const response = await this.httpClient.request(requestConfig);
        return response.data;
    }
    buildUrl(endpoint, params) {
        let url = endpoint;
        // Replace path parameters
        Object.entries(params).forEach(([key, value]) => {
            url = url.replace(`{${key}}`, encodeURIComponent(String(value)));
        });
        return url;
    }
    buildHeaders(operation, params) {
        const headers = {};
        operation.parameters
            ?.filter((p) => p.type === 'header')
            .forEach((param) => {
            if (params[param.name] !== undefined) {
                headers[param.name] = String(params[param.name]);
            }
        });
        return headers;
    }
    buildQueryParams(operation, params) {
        const queryParams = {};
        operation.parameters
            ?.filter((p) => p.type === 'query')
            .forEach((param) => {
            if (params[param.name] !== undefined) {
                queryParams[param.name] = params[param.name];
            }
        });
        return queryParams;
    }
    buildBody(operation, params) {
        const bodyParams = operation.parameters?.filter((p) => p.type === 'body');
        if (!bodyParams || bodyParams.length === 0) {
            return undefined;
        }
        if (bodyParams.length === 1) {
            return params[bodyParams[0].name];
        }
        const body = {};
        bodyParams.forEach((param) => {
            if (params[param.name] !== undefined) {
                body[param.name] = params[param.name];
            }
        });
        return body;
    }
    async testConnection() {
        try {
            // Try a simple GET request to base URL or health endpoint
            await this.httpClient.get('/health');
            return true;
        }
        catch {
            return false;
        }
    }
    getOperations() {
        return Array.from(this.operations.values());
    }
    addOperation(operation) {
        this.operations.set(operation.name, operation);
    }
}
exports.RestAPIConnector = RestAPIConnector;
/**
 * Database Connector
 */
class DatabaseConnector extends BaseConnector {
    async executeOperation(_operation, _params) {
        // Database operation execution
        // Would use pg, mysql2, mongodb, etc. based on database type
        await Promise.resolve();
        throw new Error('Database connector not fully implemented');
    }
    async testConnection() {
        // Test database connection
        await Promise.resolve();
        return true;
    }
    getOperations() {
        return [
            {
                id: 'query',
                name: 'query',
                method: 'POST',
                endpoint: '/query',
                description: 'Execute a database query',
                parameters: [
                    {
                        name: 'sql',
                        type: 'body',
                        dataType: 'string',
                        required: true,
                        description: 'SQL query to execute',
                    },
                    {
                        name: 'params',
                        type: 'body',
                        dataType: 'array',
                        required: false,
                        description: 'Query parameters',
                    },
                ],
            },
        ];
    }
}
exports.DatabaseConnector = DatabaseConnector;
/**
 * Connector Registry
 */
class ConnectorRegistry extends events_1.EventEmitter {
    connectors = new Map();
    connectorTypes = new Map();
    constructor() {
        super();
        this.registerBuiltInConnectors();
    }
    registerBuiltInConnectors() {
        // Register built-in connector types
        this.registerConnectorType('rest_api', RestAPIConnector);
        this.registerConnectorType('database', DatabaseConnector);
    }
    registerConnectorType(type, connectorClass) {
        this.connectorTypes.set(type, connectorClass);
        this.emit('connector_type.registered', type);
    }
    registerConnector(config, options = {}) {
        const ConnectorClass = this.connectorTypes.get(config.type);
        if (!ConnectorClass) {
            throw new Error(`Unknown connector type: ${config.type}`);
        }
        const connector = new ConnectorClass(config);
        connector.validate();
        if ('addOperation' in connector && typeof connector.addOperation === 'function') {
            (options.operations ?? []).forEach((operation) => connector.addOperation(operation));
        }
        this.connectors.set(config.id, connector);
        this.emit('connector.registered', config);
        return connector;
    }
    registerInstance(connector) {
        const config = connector.getConfig();
        connector.validate();
        this.connectors.set(config.id, connector);
        this.emit('connector.registered', config);
        return connector;
    }
    getConnector(id) {
        return this.connectors.get(id);
    }
    getAllConnectors() {
        return Array.from(this.connectors.values());
    }
    removeConnector(id) {
        this.connectors.delete(id);
        this.emit('connector.removed', id);
    }
    async testAllConnections() {
        const results = {};
        for (const [id, connector] of this.connectors) {
            try {
                const success = await connector.testConnection();
                results[id] = { success };
            }
            catch (error) {
                results[id] = { success: false, error: error.message };
            }
        }
        return results;
    }
}
exports.ConnectorRegistry = ConnectorRegistry;
function uniqueStrings(values) {
    return Array.from(new Set(values.filter(Boolean)));
}
function resolveTags(config) {
    const metadataTags = Array.isArray(config.metadata?.tags)
        ? config.metadata?.tags
        : [];
    return uniqueStrings([...(config.tags ?? []), ...metadataTags]);
}
function resolveCapabilities(connector, operations) {
    const config = connector.getConfig();
    const configCaps = Array.isArray(config.capabilities)
        ? config.capabilities
        : [];
    const metadataCaps = Array.isArray(config.metadata?.capabilities)
        ? config.metadata?.capabilities
        : [];
    const operationCaps = operations.flatMap((operation) => operation.capabilities?.length ? operation.capabilities : [operation.name]);
    return uniqueStrings([...configCaps, ...metadataCaps, ...operationCaps]);
}
function describeConnector(connector) {
    const config = connector.getConfig();
    const operations = connector.getOperations().map((operation) => ({
        id: operation.id,
        name: operation.name,
        method: operation.method,
        endpoint: operation.endpoint,
        parameters: operation.parameters ?? [],
        requestSchema: operation.requestSchema,
        responseSchema: operation.responseSchema,
        capabilities: operation.capabilities?.length
            ? operation.capabilities
            : [operation.name],
    }));
    return {
        id: config.id,
        name: config.name,
        type: config.type,
        description: config.description,
        authentication: config.authentication.type,
        capabilities: resolveCapabilities(connector, operations),
        tags: resolveTags(config),
        reliabilityScore: config.reliabilityScore ?? config.metadata?.reliability,
        operations,
        metadata: config.metadata,
    };
}
class ConnectorDiscoveryApi {
    registry;
    constructor(registry) {
        this.registry = registry;
    }
    discover(filter = {}) {
        const descriptors = this.registry.getAllConnectors().map(describeConnector);
        return descriptors
            .filter((descriptor) => {
            if (filter.type && descriptor.type !== filter.type) {
                return false;
            }
            if (filter.capabilities &&
                !filter.capabilities.every((cap) => descriptor.capabilities.includes(cap))) {
                return false;
            }
            if (filter.tags &&
                filter.tags.length > 0 &&
                !filter.tags.every((tag) => descriptor.tags.includes(tag))) {
                return false;
            }
            if (filter.authTypes &&
                !filter.authTypes.includes(descriptor.authentication)) {
                return false;
            }
            return true;
        })
            .sort((a, b) => (b.reliabilityScore ?? 0) - (a.reliabilityScore ?? 0));
    }
    negotiateCapabilities(request) {
        const candidates = this.discover({ authTypes: request.authTypes });
        const required = request.required ?? [];
        const matches = [];
        for (const connector of candidates) {
            const matched = required.filter((cap) => connector.capabilities.includes(cap));
            const missing = required.filter((cap) => !connector.capabilities.includes(cap));
            if (missing.length > 0) {
                continue;
            }
            const preferredMatches = (request.preferred ?? []).filter((cap) => connector.capabilities.includes(cap));
            const authBonus = request.authTypes?.includes(connector.authentication)
                ? 0.25
                : 0;
            const score = matched.length * 2 +
                preferredMatches.length +
                (connector.reliabilityScore ?? 0) +
                authBonus;
            matches.push({ connector, score, matched, missing });
        }
        return matches.sort((a, b) => b.score - a.score);
    }
    introspectSchema(connectorId) {
        const connector = this.registry.getConnector(connectorId);
        if (!connector) {
            throw new Error(`Connector ${connectorId} not found`);
        }
        const descriptor = describeConnector(connector);
        const operations = descriptor.operations.map((operation) => ({
            ...operation,
            stability: connector
                .getOperations()
                .find((candidate) => candidate.name === operation.name)?.stability,
        }));
        return { connector: descriptor, operations };
    }
    generateAdapter(connectorId, operationName) {
        const connector = this.registry.getConnector(connectorId);
        if (!connector) {
            throw new Error(`Connector ${connectorId} not found`);
        }
        const operation = connector
            .getOperations()
            .find((candidate) => candidate.name === operationName || candidate.id === operationName);
        if (!operation) {
            throw new Error(`Operation ${operationName} not found on connector ${connectorId}`);
        }
        const parameters = operation.parameters ?? [];
        const requiredParams = parameters
            .filter((param) => param.required)
            .map((param) => param.name);
        const optionalParams = parameters
            .filter((param) => !param.required)
            .map((param) => param.name);
        return {
            connectorId,
            operation: operation.name,
            requiredParams,
            optionalParams,
            schema: { request: operation.requestSchema, response: operation.responseSchema },
            invoke: async (params = {}) => {
                const missing = requiredParams.filter((param) => params[param] === undefined);
                if (missing.length > 0) {
                    throw new Error(`Missing required parameters: ${missing.join(', ')}`);
                }
                const response = await connector.execute(operation.name, params);
                return response;
            },
        };
    }
}
exports.ConnectorDiscoveryApi = ConnectorDiscoveryApi;
__exportStar(require("./conformance/index"), exports);
exports.default = ConnectorRegistry;
