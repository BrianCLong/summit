/**
 * OpenAPI Documentation Middleware
 * Serves Swagger UI and validates all routes are documented
 */

import { Request, Response, NextFunction, Router } from 'express';
import swaggerUi from 'swagger-ui-express';
import { generateOpenAPIDocument } from './spec.js';
import { registry } from './spec.js';

/**
 * Creates a router with Swagger UI documentation
 */
export function createDocsRouter() {
  const router = Router();
  const openApiDocument = generateOpenAPIDocument();

  // Serve OpenAPI JSON spec
  router.get('/openapi.json', (_req: Request, res: Response) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(openApiDocument);
  });

  // Serve Swagger UI
  router.use(
    '/',
    swaggerUi.serve,
    swaggerUi.setup(openApiDocument, {
      customCss: '.swagger-ui .topbar { display: none }',
      customSiteTitle: 'IntelGraph API Documentation',
      customfavIcon: '/favicon.ico',
      swaggerOptions: {
        persistAuthorization: true,
        displayRequestDuration: true,
        filter: true,
        tryItOutEnabled: true,
      },
    }),
  );

  return router;
}

/**
 * Validates that all registered routes have OpenAPI documentation
 * Used in CI/build pipeline to enforce documentation
 */
export function validateRouteDocumentation(app: any): {
  documented: string[];
  undocumented: string[];
  valid: boolean;
} {
  const registeredPaths = new Set<string>();

  // Get all registered OpenAPI paths
  const openApiDoc = generateOpenAPIDocument();
  Object.keys(openApiDoc.paths || {}).forEach((path) => {
    registeredPaths.add(path);
  });

  // Get all Express routes
  const expressRoutes: string[] = [];
  const undocumentedRoutes: string[] = [];

  function extractRoutes(stack: any[], prefix = '') {
    stack.forEach((middleware: any) => {
      if (middleware.route) {
        // Routes registered directly on the app
        const path = prefix + middleware.route.path;
        expressRoutes.push(path);

        if (!isPathDocumented(path, registeredPaths)) {
          undocumentedRoutes.push(path);
        }
      } else if (middleware.name === 'router' && middleware.handle?.stack) {
        // Routers mounted on the app
        const routerPath = prefix + (middleware.regexp?.source || '');
        const cleanPath = cleanRegexpPath(routerPath);
        extractRoutes(middleware.handle.stack, cleanPath);
      }
    });
  }

  if (app._router?.stack) {
    extractRoutes(app._router.stack);
  }

  return {
    documented: expressRoutes.filter((route) =>
      isPathDocumented(route, registeredPaths),
    ),
    undocumented: undocumentedRoutes,
    valid: undocumentedRoutes.length === 0,
  };
}

/**
 * Helper to check if a path is documented
 */
function isPathDocumented(
  expressPath: string,
  openApiPaths: Set<string>,
): boolean {
  // Skip internal/system routes
  if (
    expressPath.includes('/*') ||
    expressPath === '' ||
    expressPath === '/' ||
    expressPath.includes('swagger') ||
    expressPath.includes('docs')
  ) {
    return true;
  }

  // Check exact match
  if (openApiPaths.has(expressPath)) {
    return true;
  }

  // Convert Express params to OpenAPI params: /users/:id -> /users/{id}
  const openApiPath = expressPath.replace(/:([^/]+)/g, '{$1}');
  return openApiPaths.has(openApiPath);
}

/**
 * Clean up Express regexp paths for comparison
 */
function cleanRegexpPath(regexpPath: string): string {
  return regexpPath
    .replace(/\\/g, '')
    .replace(/\^/g, '')
    .replace(/\$/g, '')
    .replace(/\?/g, '')
    .replace(/\(\?=\/\|\$\)/g, '');
}

/**
 * Middleware to log undocumented routes in development
 */
export function logUndocumentedRoutes() {
  return (req: Request, res: Response, next: NextFunction) => {
    if (process.env.NODE_ENV === 'development') {
      const openApiDoc = generateOpenAPIDocument();
      const registeredPaths = new Set(Object.keys(openApiDoc.paths || {}));
      const requestPath = req.path;

      if (!isPathDocumented(requestPath, registeredPaths)) {
        console.warn(
          `⚠️  Undocumented route accessed: ${req.method} ${requestPath}`,
        );
      }
    }
    next();
  };
}
