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

import express, { Express, Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';

import type { APIConfig } from './types';
import { APIRouter } from './router';
import { OpenAPIGenerator } from './openapi/generator';
import {
  contextMiddleware,
  errorHandler,
  notFoundHandler,
  paginationMiddleware,
  responseMiddleware,
  versioningMiddleware,
  idempotencyMiddleware,
  metricsMiddleware,
  VersionRegistry,
} from './middleware';

export * from './types';
export * from './router';
export * from './middleware';
export * from './openapi';

export interface APIFramework {
  app: Express;
  router: APIRouter;
  versionRegistry: VersionRegistry;
  listen: (port: number, callback?: () => void) => void;
  getOpenAPISpec: () => any;
}

export function createAPI(config: APIConfig): APIFramework {
  const app = express();
  const router = new APIRouter(config);
  const versionRegistry = new VersionRegistry();

  // ===== Global Middleware =====

  // Security
  app.use(helmet());

  // CORS
  if (config.cors?.enabled) {
    app.use(
      cors({
        origin: config.cors.origin,
        credentials: config.cors.credentials,
        methods: config.cors.methods,
        allowedHeaders: config.cors.allowedHeaders,
        exposedHeaders: config.cors.exposedHeaders,
        maxAge: config.cors.maxAge,
      })
    );
  }

  // Compression
  app.use(compression());

  // Body parsing
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Logging
  if (process.env.NODE_ENV !== 'test') {
    app.use(morgan('combined'));
  }

  // Request context
  app.use(contextMiddleware());

  // API versioning
  if (config.basePath) {
    app.use(
      versioningMiddleware({
        strategy: 'url',
        defaultVersion: config.version,
      })
    );
  }

  // Response helpers
  app.use(responseMiddleware);

  // Pagination
  if (config.pagination) {
    app.use(paginationMiddleware(config.pagination));
  }

  // Idempotency
  if (config.openapi?.enabled) {
    app.use(
      idempotencyMiddleware({
        enabled: true,
      })
    );
  }

  // Metrics
  app.use(metricsMiddleware());

  // Rate limiting
  if (config.rateLimit?.enabled) {
    app.use(
      rateLimit({
        windowMs: config.rateLimit.windowMs || 15 * 60 * 1000, // 15 minutes
        max: config.rateLimit.max || 100,
        message: config.rateLimit.message || 'Too many requests',
        standardHeaders: config.rateLimit.standardHeaders ?? true,
        legacyHeaders: config.rateLimit.legacyHeaders ?? false,
        skip: (req) => {
          // Skip rate limiting for health checks
          return req.path === '/health' || req.path === '/ready';
        },
      })
    );
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
      const generator = new OpenAPIGenerator(config);
      generator.addRoutes(router.getRoutes());
      generator.addSchemas(OpenAPIGenerator.generateCommonSchemas());
      generator.addSecurityScheme(
        'bearerAuth',
        OpenAPIGenerator.generateSecuritySchemes(config)
      );

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
  } else {
    app.use(router.getRouter());
  }

  // ===== Error Handling =====

  // 404 handler
  app.use(notFoundHandler);

  // Global error handler
  app.use(
    errorHandler({
      includeStack: process.env.NODE_ENV !== 'production',
    })
  );

  // ===== API Interface =====

  return {
    app,
    router,
    versionRegistry,

    listen(port: number, callback?: () => void) {
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
      const generator = new OpenAPIGenerator(config);
      generator.addRoutes(router.getRoutes());
      generator.addSchemas(OpenAPIGenerator.generateCommonSchemas());
      return generator.getSpec();
    },
  };
}
