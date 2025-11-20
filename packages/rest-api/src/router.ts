/**
 * REST API Router
 *
 * Provides a fluent API for defining REST routes with automatic OpenAPI generation
 */

import express, { Router, RequestHandler } from 'express';
import type {
  RouteDefinition,
  HTTPMethod,
  RouteOpenAPISpec,
  APIConfig,
  RateLimitOptions,
  CacheOptions,
} from './types';

export class APIRouter {
  private router: Router;
  private routes: RouteDefinition[] = [];
  private basePath: string;
  private config: APIConfig;

  constructor(config: APIConfig) {
    this.router = express.Router();
    this.basePath = config.basePath || '';
    this.config = config;
  }

  /**
   * Define a GET route
   */
  get(
    path: string,
    handler: RequestHandler | RequestHandler[],
    options?: Partial<Omit<RouteDefinition, 'method' | 'path' | 'handler'>>
  ): this {
    return this.route('GET', path, handler, options);
  }

  /**
   * Define a POST route
   */
  post(
    path: string,
    handler: RequestHandler | RequestHandler[],
    options?: Partial<Omit<RouteDefinition, 'method' | 'path' | 'handler'>>
  ): this {
    return this.route('POST', path, handler, options);
  }

  /**
   * Define a PUT route
   */
  put(
    path: string,
    handler: RequestHandler | RequestHandler[],
    options?: Partial<Omit<RouteDefinition, 'method' | 'path' | 'handler'>>
  ): this {
    return this.route('PUT', path, handler, options);
  }

  /**
   * Define a PATCH route
   */
  patch(
    path: string,
    handler: RequestHandler | RequestHandler[],
    options?: Partial<Omit<RouteDefinition, 'method' | 'path' | 'handler'>>
  ): this {
    return this.route('PATCH', path, handler, options);
  }

  /**
   * Define a DELETE route
   */
  delete(
    path: string,
    handler: RequestHandler | RequestHandler[],
    options?: Partial<Omit<RouteDefinition, 'method' | 'path' | 'handler'>>
  ): this {
    return this.route('DELETE', path, handler, options);
  }

  /**
   * Define a route with any HTTP method
   */
  route(
    method: HTTPMethod,
    path: string,
    handler: RequestHandler | RequestHandler[],
    options?: Partial<Omit<RouteDefinition, 'method' | 'path' | 'handler'>>
  ): this {
    const routeDefinition: RouteDefinition = {
      method,
      path,
      handler,
      ...options,
    };

    this.routes.push(routeDefinition);

    // Apply middleware
    const middleware: RequestHandler[] = options?.middleware || [];

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
  resource(
    resourceName: string,
    handlers: {
      list?: RequestHandler;
      get?: RequestHandler;
      create?: RequestHandler;
      update?: RequestHandler;
      patch?: RequestHandler;
      delete?: RequestHandler;
    },
    options?: {
      middleware?: RequestHandler[];
      openapi?: Record<string, RouteOpenAPISpec>;
    }
  ): this {
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
  getRouter(): Router {
    return this.router;
  }

  /**
   * Get all route definitions
   */
  getRoutes(): RouteDefinition[] {
    return this.routes;
  }

  /**
   * Get the base path
   */
  getBasePath(): string {
    return this.basePath;
  }
}
