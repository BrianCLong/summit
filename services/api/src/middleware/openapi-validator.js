"use strict";
/**
 * OpenAPI Request/Response Validation Middleware
 *
 * Validates incoming requests and outgoing responses against OpenAPI specification
 * MIT License - Copyright (c) 2025 IntelGraph
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateResponse = exports.validateRequest = void 0;
exports.validateData = validateData;
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const js_yaml_1 = __importDefault(require("js-yaml"));
const ajv_1 = __importDefault(require("ajv"));
const ajv_formats_1 = __importDefault(require("ajv-formats"));
class OpenAPIValidator {
    spec = null;
    ajv;
    validators = new Map();
    constructor() {
        this.ajv = new ajv_1.default({
            allErrors: true,
            strict: false,
            coerceTypes: true,
        });
        (0, ajv_formats_1.default)(this.ajv);
        this.loadSpec();
    }
    /**
     * Load OpenAPI specification from file
     */
    loadSpec() {
        try {
            const specPath = node_path_1.default.resolve(process.cwd(), 'openapi', 'spec.yaml');
            if (!node_fs_1.default.existsSync(specPath)) {
                console.warn('OpenAPI spec not found at', specPath);
                return;
            }
            const yamlContent = node_fs_1.default.readFileSync(specPath, 'utf8');
            this.spec = js_yaml_1.default.load(yamlContent);
            // Compile schemas for all request/response bodies
            this.compileSchemas();
            console.log('✓ OpenAPI specification loaded and schemas compiled');
        }
        catch (error) {
            console.error('Failed to load OpenAPI spec:', error);
        }
    }
    /**
     * Compile JSON schemas for validation
     */
    compileSchemas() {
        if (!this.spec?.components?.schemas)
            return;
        // Add all component schemas to AJV
        for (const [name, schema] of Object.entries(this.spec.components.schemas)) {
            try {
                this.ajv.addSchema(schema, `#/components/schemas/${name}`);
            }
            catch (error) {
                console.warn(`Failed to compile schema ${name}:`, error);
            }
        }
    }
    /**
     * Find operation spec for a given request
     */
    findOperationSpec(method, path) {
        if (!this.spec?.paths)
            return null;
        // Normalize path - remove /api prefix if present
        const normalizedPath = path.replace(/^\/api/, '/api');
        // Try exact match first
        const pathItem = this.spec.paths[normalizedPath];
        if (pathItem) {
            return pathItem[method.toLowerCase()];
        }
        // Try pattern matching for path parameters
        for (const [specPath, pathItem] of Object.entries(this.spec.paths)) {
            const pattern = specPath.replace(/\{[^}]+\}/g, '[^/]+');
            const regex = new RegExp(`^${pattern}$`);
            if (regex.test(normalizedPath)) {
                return pathItem[method.toLowerCase()];
            }
        }
        return null;
    }
    /**
     * Validate request body against schema
     */
    validateRequestBody(req, operationSpec) {
        if (!operationSpec?.requestBody?.content?.['application/json']?.schema) {
            return null;
        }
        const schema = operationSpec.requestBody.content['application/json'].schema;
        // Resolve schema reference if needed
        let schemaToValidate = schema;
        if (schema.$ref) {
            const schemaName = schema.$ref.split('/').pop();
            schemaToValidate = this.spec?.components?.schemas?.[schemaName];
        }
        if (!schemaToValidate)
            return null;
        const validate = this.ajv.compile(schemaToValidate);
        const valid = validate(req.body);
        if (!valid && validate.errors) {
            return validate.errors.map((err) => ({
                path: err.instancePath || '/',
                message: err.message || 'Validation error',
                value: err.data,
            }));
        }
        return null;
    }
    /**
     * Validate response body against schema
     */
    validateResponseBody(statusCode, body, operationSpec) {
        const responseSpec = operationSpec?.responses?.[String(statusCode)];
        if (!responseSpec?.content?.['application/json']?.schema) {
            return null;
        }
        const schema = responseSpec.content['application/json'].schema;
        // Resolve schema reference if needed
        let schemaToValidate = schema;
        if (schema.$ref) {
            const schemaName = schema.$ref.split('/').pop();
            schemaToValidate = this.spec?.components?.schemas?.[schemaName];
        }
        if (!schemaToValidate)
            return null;
        const validate = this.ajv.compile(schemaToValidate);
        const valid = validate(body);
        if (!valid && validate.errors) {
            return validate.errors.map((err) => ({
                path: err.instancePath || '/',
                message: err.message || 'Validation error',
                value: err.data,
            }));
        }
        return null;
    }
    /**
     * Express middleware for request validation
     */
    validateRequest() {
        return (req, res, next) => {
            // Skip validation if spec not loaded
            if (!this.spec) {
                return next();
            }
            // Skip validation for non-API routes
            if (!req.path.startsWith('/api/')) {
                return next();
            }
            const operationSpec = this.findOperationSpec(req.method, req.path);
            // If no spec found, allow request (graceful degradation)
            if (!operationSpec) {
                return next();
            }
            // Validate request body for POST/PUT/PATCH
            if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
                const errors = this.validateRequestBody(req, operationSpec);
                if (errors && errors.length > 0) {
                    return res.status(400).json({
                        ok: false,
                        error: 'Request validation failed',
                        validationErrors: errors,
                    });
                }
            }
            next();
        };
    }
    /**
     * Response validation wrapper
     */
    validateResponse() {
        return (req, res, next) => {
            // Skip validation if spec not loaded or not in development
            if (!this.spec || process.env.NODE_ENV === 'production') {
                return next();
            }
            const originalJson = res.json.bind(res);
            res.json = function (body) {
                const operationSpec = this.findOperationSpec(req.method, req.path);
                if (operationSpec) {
                    const errors = this.validateResponseBody(res.statusCode, body, operationSpec);
                    if (errors && errors.length > 0) {
                        console.warn('Response validation failed:', {
                            method: req.method,
                            path: req.path,
                            statusCode: res.statusCode,
                            errors,
                        });
                    }
                }
                return originalJson(body);
            }.bind(this);
            next();
        };
    }
}
// Singleton instance
const validatorInstance = new OpenAPIValidator();
/**
 * Middleware to validate requests against OpenAPI spec
 */
exports.validateRequest = validatorInstance.validateRequest();
/**
 * Middleware to validate responses against OpenAPI spec (dev only)
 */
exports.validateResponse = validatorInstance.validateResponse();
/**
 * Manual validation function for testing
 */
function validateData(schema, data) {
    const ajv = new ajv_1.default({ allErrors: true });
    (0, ajv_formats_1.default)(ajv);
    const validate = ajv.compile(schema);
    const valid = validate(data);
    if (!valid && validate.errors) {
        return validate.errors.map((err) => ({
            path: err.instancePath || '/',
            message: err.message || 'Validation error',
            value: err.data,
        }));
    }
    return null;
}
exports.default = validatorInstance;
