"use strict";
/**
 * REST API Framework
 *
 * Unified REST API framework with OpenAPI 3.0 specification support
 *
 * @example
 * ```typescript
 * import { createAPI } from '@intelgraph/rest-api';
 *
 * const api = createAPI({
 *   version: '1.0.0',
 *   title: 'Summit API',
 *   description: 'Intelligence analysis platform API',
 *   basePath: '/api/v1',
 * });
 *
 * api.router
 *   .get('/entities', async (req, res) => {
 *     const entities = await getEntities();
 *     res.success(entities);
 *   }, {
 *     openapi: {
 *       summary: 'List entities',
 *       tags: ['entities'],
 *       responses: {
 *         '200': { description: 'List of entities' }
 *       }
 *     }
 *   });
 *
 * api.listen(3000);
 * ```
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
exports.createAPI = createAPI;
const express_1 = __importDefault(require("express"));
const helmet_1 = __importDefault(require("helmet"));
const cors_1 = __importDefault(require("cors"));
const compression_1 = __importDefault(require("compression"));
const morgan_1 = __importDefault(require("morgan"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const router_js_1 = require("./router.js");
const generator_js_1 = require("./openapi/generator.js");
const middleware_js_1 = require("./middleware.js");
__exportStar(require("./types.js"), exports);
__exportStar(require("./router.js"), exports);
__exportStar(require("./middleware.js"), exports);
__exportStar(require("./openapi.js"), exports);
function createAPI(config) {
    const app = (0, express_1.default)();
    const router = new router_js_1.APIRouter(config);
    const versionRegistry = new middleware_js_1.VersionRegistry();
    // ===== Global Middleware =====
    // Security
    app.use((0, helmet_1.default)());
    // CORS
    if (config.cors?.enabled) {
        app.use((0, cors_1.default)({
            origin: config.cors.origin,
            credentials: config.cors.credentials,
            methods: config.cors.methods,
            allowedHeaders: config.cors.allowedHeaders,
            exposedHeaders: config.cors.exposedHeaders,
            maxAge: config.cors.maxAge,
        }));
    }
    // Compression
    app.use((0, compression_1.default)());
    // Body parsing
    app.use(express_1.default.json({ limit: '10mb' }));
    app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
    // Logging
    if (process.env.NODE_ENV !== 'test') {
        app.use((0, morgan_1.default)('combined'));
    }
    // Request context
    app.use((0, middleware_js_1.contextMiddleware)());
    // API versioning
    if (config.basePath) {
        app.use((0, middleware_js_1.versioningMiddleware)({
            strategy: 'url',
            defaultVersion: config.version,
        }));
    }
    // Response helpers
    app.use(middleware_js_1.responseMiddleware);
    // Pagination
    if (config.pagination) {
        app.use((0, middleware_js_1.paginationMiddleware)(config.pagination));
    }
    // Idempotency
    if (config.openapi?.enabled) {
        app.use((0, middleware_js_1.idempotencyMiddleware)({
            enabled: true,
        }));
    }
    // Metrics
    app.use((0, middleware_js_1.metricsMiddleware)());
    // Rate limiting
    if (config.rateLimit?.enabled) {
        app.use((0, express_rate_limit_1.default)({
            windowMs: config.rateLimit.windowMs || 15 * 60 * 1000, // 15 minutes
            max: config.rateLimit.max || 100,
            message: config.rateLimit.message || 'Too many requests',
            standardHeaders: config.rateLimit.standardHeaders ?? true,
            legacyHeaders: config.rateLimit.legacyHeaders ?? false,
            skip: (req) => {
                // Skip rate limiting for health checks
                return req.path === '/health' || req.path === '/ready';
            },
        }));
    }
    // ===== Routes =====
    // Health check
    app.get('/health', (req, res) => {
        res.json({ status: 'ok', timestamp: new Date().toISOString() });
    });
    // Readiness check
    app.get('/ready', (req, res) => {
        res.json({ status: 'ready', timestamp: new Date().toISOString() });
    });
    // OpenAPI documentation
    if (config.openapi?.enabled) {
        const openapiPath = config.openapi.path || '/openapi.json';
        app.get(openapiPath, (req, res) => {
            const generator = new generator_js_1.OpenAPIGenerator(config);
            generator.addRoutes(router.getRoutes());
            generator.addSchemas(generator_js_1.OpenAPIGenerator.generateCommonSchemas());
            generator.addSecurityScheme('bearerAuth', generator_js_1.OpenAPIGenerator.generateSecuritySchemes(config));
            res.json(generator.getSpec());
        });
        // Swagger UI (if requested)
        if (config.openapi.uiPath) {
            app.get(config.openapi.uiPath, (req, res) => {
                res.send(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>${config.title} - API Documentation</title>
            <link rel="stylesheet" type="text/css" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
          </head>
          <body>
            <div id="swagger-ui"></div>
            <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
            <script>
              SwaggerUIBundle({
                url: '${openapiPath}',
                dom_id: '#swagger-ui',
                presets: [
                  SwaggerUIBundle.presets.apis,
                  SwaggerUIBundle.SwaggerUIStandalonePreset
                ]
              })
            </script>
          </body>
          </html>
        `);
            });
        }
    }
    // Mount API router
    if (config.basePath) {
        app.use(config.basePath, router.getRouter());
    }
    else {
        app.use(router.getRouter());
    }
    // ===== Error Handling =====
    // 404 handler
    app.use(middleware_js_1.notFoundHandler);
    // Global error handler
    app.use((0, middleware_js_1.errorHandler)({
        includeStack: process.env.NODE_ENV !== 'production',
    }));
    // ===== API Interface =====
    return {
        app,
        router,
        versionRegistry,
        listen(port, callback) {
            app.listen(port, () => {
                console.log(`🚀 API server running on port ${port}`);
                console.log(`📚 OpenAPI spec: http://localhost:${port}${config.openapi?.path || '/openapi.json'}`);
                if (config.openapi?.uiPath) {
                    console.log(`📖 API docs: http://localhost:${port}${config.openapi.uiPath}`);
                }
                callback?.();
            });
        },
        getOpenAPISpec() {
            const generator = new generator_js_1.OpenAPIGenerator(config);
            generator.addRoutes(router.getRoutes());
            generator.addSchemas(generator_js_1.OpenAPIGenerator.generateCommonSchemas());
            return generator.getSpec();
        },
    };
}
