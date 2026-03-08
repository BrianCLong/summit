"use strict";
/**
 * REST API Router
 *
 * Provides a fluent API for defining REST routes with automatic OpenAPI generation
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.APIRouter = void 0;
const express_1 = __importDefault(require("express"));
class APIRouter {
    router;
    routes = [];
    basePath;
    config;
    constructor(config) {
        this.router = express_1.default.Router();
        this.basePath = config.basePath || '';
        this.config = config;
    }
    /**
     * Define a GET route
     */
    get(path, handler, options) {
        return this.route('GET', path, handler, options);
    }
    /**
     * Define a POST route
     */
    post(path, handler, options) {
        return this.route('POST', path, handler, options);
    }
    /**
     * Define a PUT route
     */
    put(path, handler, options) {
        return this.route('PUT', path, handler, options);
    }
    /**
     * Define a PATCH route
     */
    patch(path, handler, options) {
        return this.route('PATCH', path, handler, options);
    }
    /**
     * Define a DELETE route
     */
    delete(path, handler, options) {
        return this.route('DELETE', path, handler, options);
    }
    /**
     * Define a route with any HTTP method
     */
    route(method, path, handler, options) {
        const routeDefinition = {
            method,
            path,
            handler,
            ...options,
        };
        this.routes.push(routeDefinition);
        // Apply middleware
        const middleware = options?.middleware || [];
        // Apply rate limiting if specified
        if (options?.rateLimit) {
            // Rate limiting middleware would be added here
        }
        // Apply caching if specified
        if (options?.cache) {
            // Cache middleware would be added here
        }
        // Register route with Express
        const handlers = Array.isArray(handler) ? handler : [handler];
        const allHandlers = [...middleware, ...handlers];
        switch (method) {
            case 'GET':
                this.router.get(path, ...allHandlers);
                break;
            case 'POST':
                this.router.post(path, ...allHandlers);
                break;
            case 'PUT':
                this.router.put(path, ...allHandlers);
                break;
            case 'PATCH':
                this.router.patch(path, ...allHandlers);
                break;
            case 'DELETE':
                this.router.delete(path, ...allHandlers);
                break;
        }
        return this;
    }
    /**
     * Create a resource router with CRUD operations
     */
    resource(resourceName, handlers, options) {
        const basePath = `/${resourceName}`;
        const idPath = `${basePath}/:id`;
        if (handlers.list) {
            this.get(basePath, handlers.list, {
                middleware: options?.middleware,
                openapi: options?.openapi?.list || {
                    summary: `List ${resourceName}`,
                    tags: [resourceName],
                    responses: {
                        '200': {
                            description: `List of ${resourceName}`,
                        },
                    },
                },
            });
        }
        if (handlers.get) {
            this.get(idPath, handlers.get, {
                middleware: options?.middleware,
                openapi: options?.openapi?.get || {
                    summary: `Get ${resourceName} by ID`,
                    tags: [resourceName],
                    parameters: [
                        {
                            name: 'id',
                            in: 'path',
                            required: true,
                            schema: { type: 'string' },
                        },
                    ],
                    responses: {
                        '200': {
                            description: `${resourceName} details`,
                        },
                        '404': {
                            description: 'Not found',
                        },
                    },
                },
            });
        }
        if (handlers.create) {
            this.post(basePath, handlers.create, {
                middleware: options?.middleware,
                openapi: options?.openapi?.create || {
                    summary: `Create ${resourceName}`,
                    tags: [resourceName],
                    responses: {
                        '201': {
                            description: `${resourceName} created`,
                        },
                        '400': {
                            description: 'Validation error',
                        },
                    },
                },
            });
        }
        if (handlers.update) {
            this.put(idPath, handlers.update, {
                middleware: options?.middleware,
                openapi: options?.openapi?.update || {
                    summary: `Update ${resourceName}`,
                    tags: [resourceName],
                    parameters: [
                        {
                            name: 'id',
                            in: 'path',
                            required: true,
                            schema: { type: 'string' },
                        },
                    ],
                    responses: {
                        '200': {
                            description: `${resourceName} updated`,
                        },
                        '404': {
                            description: 'Not found',
                        },
                    },
                },
            });
        }
        if (handlers.patch) {
            this.patch(idPath, handlers.patch, {
                middleware: options?.middleware,
                openapi: options?.openapi?.patch || {
                    summary: `Partially update ${resourceName}`,
                    tags: [resourceName],
                    parameters: [
                        {
                            name: 'id',
                            in: 'path',
                            required: true,
                            schema: { type: 'string' },
                        },
                    ],
                    responses: {
                        '200': {
                            description: `${resourceName} updated`,
                        },
                        '404': {
                            description: 'Not found',
                        },
                    },
                },
            });
        }
        if (handlers.delete) {
            this.delete(idPath, handlers.delete, {
                middleware: options?.middleware,
                openapi: options?.openapi?.delete || {
                    summary: `Delete ${resourceName}`,
                    tags: [resourceName],
                    parameters: [
                        {
                            name: 'id',
                            in: 'path',
                            required: true,
                            schema: { type: 'string' },
                        },
                    ],
                    responses: {
                        '204': {
                            description: 'Deleted successfully',
                        },
                        '404': {
                            description: 'Not found',
                        },
                    },
                },
            });
        }
        return this;
    }
    /**
     * Get the Express router
     */
    getRouter() {
        return this.router;
    }
    /**
     * Get all route definitions
     */
    getRoutes() {
        return this.routes;
    }
    /**
     * Get the base path
     */
    getBasePath() {
        return this.basePath;
    }
}
exports.APIRouter = APIRouter;
