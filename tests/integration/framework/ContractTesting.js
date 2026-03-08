"use strict";
/**
 * Contract Testing Utilities
 *
 * Provides tools for verifying API contracts between services.
 * Supports schema validation, response matching, and contract evolution.
 *
 * @module tests/integration/framework
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContractBuilder = exports.CommonSchemas = exports.ContractVerifier = void 0;
exports.defineContract = defineContract;
const ajv_1 = __importDefault(require("ajv"));
const ajv_formats_1 = __importDefault(require("ajv-formats"));
/**
 * Contract Verifier
 *
 * Verifies that service responses match defined contracts.
 *
 * @example
 * ```typescript
 * const verifier = new ContractVerifier();
 *
 * const contract: Contract = {
 *   name: 'API-GraphAPI-Contract',
 *   version: '1.0.0',
 *   provider: 'api',
 *   consumer: 'graph-api',
 *   interactions: [
 *     {
 *       description: 'Get entity by ID',
 *       request: {
 *         method: 'GET',
 *         path: '/api/entities/:id',
 *       },
 *       response: {
 *         status: 200,
 *         bodySchema: entitySchema,
 *       },
 *     },
 *   ],
 * };
 *
 * const result = await verifier.verify(contract, 'http://localhost:4000');
 * ```
 */
class ContractVerifier {
    ajv;
    schemaCache = new Map();
    constructor() {
        this.ajv = new ajv_1.default({
            allErrors: true,
            strict: false,
            validateFormats: true,
        });
        (0, ajv_formats_1.default)(this.ajv);
    }
    /**
     * Verify a contract against a service
     */
    async verify(contract, baseUrl) {
        const startTime = Date.now();
        const interactionResults = [];
        for (const interaction of contract.interactions) {
            const result = await this.verifyInteraction(interaction, baseUrl);
            interactionResults.push(result);
        }
        const success = interactionResults.every((r) => r.success);
        return {
            contract: contract.name,
            version: contract.version,
            success,
            interactions: interactionResults,
            timestamp: new Date(),
            duration: Date.now() - startTime,
        };
    }
    /**
     * Verify a single interaction
     */
    async verifyInteraction(interaction, baseUrl) {
        const startTime = Date.now();
        const requestErrors = [];
        let responseErrors = [];
        let receivedResponse = null;
        try {
            // Validate request if schema provided
            if (interaction.request.bodySchema && interaction.request.body) {
                const requestValidation = this.validateSchema(interaction.request.body, interaction.request.bodySchema);
                if (!requestValidation.valid) {
                    requestErrors.push(...requestValidation.errors);
                }
            }
            // Make the request
            const url = `${baseUrl}${interaction.request.path}`;
            const response = await fetch(url, {
                method: interaction.request.method,
                headers: {
                    'Content-Type': 'application/json',
                    ...interaction.request.headers,
                },
                body: interaction.request.body ? JSON.stringify(interaction.request.body) : undefined,
            });
            receivedResponse = {
                status: response.status,
                headers: Object.fromEntries(response.headers.entries()),
                body: await response.json().catch(() => null),
            };
            // Verify response status
            if (response.status !== interaction.response.status) {
                responseErrors.push(`Expected status ${interaction.response.status}, got ${response.status}`);
            }
            // Verify response body schema
            if (interaction.response.bodySchema && receivedResponse.body) {
                const bodyValidation = this.validateSchema(receivedResponse.body, interaction.response.bodySchema);
                if (!bodyValidation.valid) {
                    responseErrors.push(...bodyValidation.errors);
                }
            }
            // Verify response headers
            if (interaction.response.headers) {
                for (const [key, value] of Object.entries(interaction.response.headers)) {
                    const receivedHeader = receivedResponse.headers[key.toLowerCase()];
                    if (receivedHeader !== value) {
                        responseErrors.push(`Expected header ${key}="${value}", got "${receivedHeader}"`);
                    }
                }
            }
        }
        catch (error) {
            responseErrors.push(`Request failed: ${error.message}`);
        }
        const success = requestErrors.length === 0 && responseErrors.length === 0;
        return {
            description: interaction.description,
            success,
            request: {
                sent: interaction.request,
                valid: requestErrors.length === 0,
                errors: requestErrors.length > 0 ? requestErrors : undefined,
            },
            response: {
                received: receivedResponse,
                expected: interaction.response,
                valid: responseErrors.length === 0,
                errors: responseErrors.length > 0 ? responseErrors : undefined,
            },
            latency: Date.now() - startTime,
        };
    }
    /**
     * Validate data against a JSON schema
     */
    validateSchema(data, schema) {
        const schemaKey = JSON.stringify(schema);
        let validate = this.schemaCache.get(schemaKey);
        if (!validate) {
            validate = this.ajv.compile(schema);
            this.schemaCache.set(schemaKey, validate);
        }
        const valid = validate(data);
        const errors = validate.errors?.map((e) => formatAjvError(e)) || [];
        return { valid: valid, errors, data };
    }
    /**
     * Add a custom format to the validator
     */
    addFormat(name, format) {
        this.ajv.addFormat(name, format);
    }
    /**
     * Add a custom keyword to the validator
     */
    addKeyword(keyword, definition) {
        this.ajv.addKeyword({ keyword, ...definition });
    }
}
exports.ContractVerifier = ContractVerifier;
/**
 * Format AJV error for readable output
 */
function formatAjvError(error) {
    const path = error.instancePath || 'root';
    const message = error.message || 'validation failed';
    return `${path}: ${message}`;
}
/**
 * Common JSON Schemas for IntelGraph
 */
exports.CommonSchemas = {
    uuid: {
        type: 'string',
        format: 'uuid',
    },
    email: {
        type: 'string',
        format: 'email',
    },
    datetime: {
        type: 'string',
        format: 'date-time',
    },
    entity: {
        type: 'object',
        required: ['id', 'type', 'name'],
        properties: {
            id: { type: 'string', format: 'uuid' },
            type: { type: 'string' },
            name: { type: 'string' },
            description: { type: 'string' },
            properties: { type: 'object' },
            labels: { type: 'array', items: { type: 'string' } },
            confidence: { type: 'number', minimum: 0, maximum: 1 },
            source: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
        },
    },
    relationship: {
        type: 'object',
        required: ['id', 'type', 'sourceId', 'targetId'],
        properties: {
            id: { type: 'string', format: 'uuid' },
            type: { type: 'string' },
            sourceId: { type: 'string', format: 'uuid' },
            targetId: { type: 'string', format: 'uuid' },
            properties: { type: 'object' },
            weight: { type: 'number', minimum: 0, maximum: 1 },
            confidence: { type: 'number', minimum: 0, maximum: 1 },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
        },
    },
    investigation: {
        type: 'object',
        required: ['id', 'title', 'status'],
        properties: {
            id: { type: 'string', format: 'uuid' },
            title: { type: 'string', minLength: 1 },
            description: { type: 'string' },
            status: {
                type: 'string',
                enum: ['draft', 'open', 'in_progress', 'pending_review', 'closed', 'archived'],
            },
            priority: {
                type: 'string',
                enum: ['low', 'medium', 'high', 'critical', 'emergency'],
            },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
        },
    },
    user: {
        type: 'object',
        required: ['id', 'email', 'role'],
        properties: {
            id: { type: 'string', format: 'uuid' },
            email: { type: 'string', format: 'email' },
            username: { type: 'string' },
            firstName: { type: 'string' },
            lastName: { type: 'string' },
            role: { type: 'string', enum: ['admin', 'analyst', 'viewer', 'user'] },
            isActive: { type: 'boolean' },
            createdAt: { type: 'string', format: 'date-time' },
        },
    },
    graphqlResponse: {
        type: 'object',
        properties: {
            data: { type: ['object', 'null'] },
            errors: {
                type: 'array',
                items: {
                    type: 'object',
                    required: ['message'],
                    properties: {
                        message: { type: 'string' },
                        path: { type: 'array' },
                        extensions: { type: 'object' },
                    },
                },
            },
        },
    },
    healthResponse: {
        type: 'object',
        required: ['status'],
        properties: {
            status: { type: 'string', enum: ['ok', 'healthy', 'degraded', 'unhealthy'] },
            version: { type: 'string' },
            uptime: { type: 'number' },
            services: {
                type: 'object',
                additionalProperties: {
                    type: 'object',
                    properties: {
                        status: { type: 'string' },
                        latency: { type: 'number' },
                    },
                },
            },
        },
    },
    errorResponse: {
        type: 'object',
        required: ['error'],
        properties: {
            error: { type: 'string' },
            message: { type: 'string' },
            code: { type: 'string' },
            statusCode: { type: 'number' },
            details: { type: 'object' },
        },
    },
    paginatedResponse: (itemSchema) => ({
        type: 'object',
        required: ['items', 'total'],
        properties: {
            items: { type: 'array', items: itemSchema },
            total: { type: 'number', minimum: 0 },
            page: { type: 'number', minimum: 1 },
            pageSize: { type: 'number', minimum: 1 },
            hasMore: { type: 'boolean' },
        },
    }),
};
/**
 * Contract Builder for easier contract definition
 */
class ContractBuilder {
    contract = {
        interactions: [],
    };
    name(name) {
        this.contract.name = name;
        return this;
    }
    version(version) {
        this.contract.version = version;
        return this;
    }
    provider(provider) {
        this.contract.provider = provider;
        return this;
    }
    consumer(consumer) {
        this.contract.consumer = consumer;
        return this;
    }
    interaction(interaction) {
        this.contract.interactions.push(interaction);
        return this;
    }
    get(path, description) {
        return new InteractionBuilder(this, 'GET', path, description);
    }
    post(path, description) {
        return new InteractionBuilder(this, 'POST', path, description);
    }
    put(path, description) {
        return new InteractionBuilder(this, 'PUT', path, description);
    }
    delete(path, description) {
        return new InteractionBuilder(this, 'DELETE', path, description);
    }
    build() {
        if (!this.contract.name || !this.contract.version || !this.contract.provider || !this.contract.consumer) {
            throw new Error('Contract must have name, version, provider, and consumer');
        }
        return this.contract;
    }
}
exports.ContractBuilder = ContractBuilder;
/**
 * Interaction Builder for fluent API
 */
class InteractionBuilder {
    parent;
    interaction;
    constructor(parent, method, path, description) {
        this.parent = parent;
        this.interaction = {
            description,
            request: { method, path },
            response: { status: 200 },
        };
    }
    withRequestHeaders(headers) {
        this.interaction.request.headers = headers;
        return this;
    }
    withRequestBody(body, schema) {
        this.interaction.request.body = body;
        if (schema) {
            this.interaction.request.bodySchema = schema;
        }
        return this;
    }
    willRespondWith(status, body, schema) {
        this.interaction.response = {
            status,
            body,
            bodySchema: schema,
        };
        this.parent.interaction(this.interaction);
        return this.parent;
    }
}
/**
 * Create a new contract builder
 */
function defineContract() {
    return new ContractBuilder();
}
exports.default = ContractVerifier;
