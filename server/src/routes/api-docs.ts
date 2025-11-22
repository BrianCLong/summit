/**
 * API Documentation Routes
 * Provides Swagger UI, ReDoc, and OpenAPI specification endpoints
 *
 * Issue: #11814 - API Documentation with OpenAPI/Swagger
 * MIT License - Copyright (c) 2025 IntelGraph
 */

import { Router, type Request, type Response } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';
import pino from 'pino';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const logger = pino({ name: 'api-docs' });

export const apiDocsRouter = Router();

// Swagger UI HTML template
const swaggerHTML = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>IntelGraph API Documentation</title>
  <link rel="stylesheet" type="text/css" href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui.css">
  <style>
    html {
      box-sizing: border-box;
      overflow: -moz-scrollbars-vertical;
      overflow-y: scroll;
    }
    *, *:before, *:after {
      box-sizing: inherit;
    }
    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    }
    .topbar {
      background-color: #1a1a1a !important;
    }
    .swagger-ui .topbar .download-url-wrapper {
      display: none;
    }
    .swagger-ui .info {
      margin: 30px 0;
    }
    .swagger-ui .info .title {
      font-size: 36px;
      color: #2c3e50;
    }
    .custom-header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 20px 40px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    .custom-header h1 {
      margin: 0;
      font-size: 28px;
      font-weight: 600;
    }
    .custom-header p {
      margin: 8px 0 0 0;
      opacity: 0.9;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="custom-header">
    <h1>🔍 IntelGraph Platform API</h1>
    <p>Next-generation intelligence analysis with AI-augmented graph analytics</p>
  </div>
  <div id="swagger-ui"></div>
  <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-standalone-preset.js"></script>
  <script>
    window.onload = function() {
      const ui = SwaggerUIBundle({
        url: '/api/docs/openapi.json',
        dom_id: '#swagger-ui',
        deepLinking: true,
        presets: [
          SwaggerUIBundle.presets.apis,
          SwaggerUIStandalonePreset
        ],
        plugins: [
          SwaggerUIBundle.plugins.DownloadUrl
        ],
        layout: 'StandaloneLayout',
        defaultModelsExpandDepth: 1,
        defaultModelExpandDepth: 1,
        docExpansion: 'list',
        filter: true,
        showExtensions: true,
        showCommonExtensions: true,
        tryItOutEnabled: true,
        persistAuthorization: true,
        syntaxHighlight: {
          activate: true,
          theme: 'monokai'
        }
      });
      window.ui = ui;
    }
  </script>
</body>
</html>
`;

// ReDoc HTML template (alternative documentation renderer)
const redocHTML = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>IntelGraph API Documentation - ReDoc</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    }
  </style>
</head>
<body>
  <redoc spec-url='/api/docs/openapi.json'></redoc>
  <script src="https://cdn.jsdelivr.net/npm/redoc@latest/bundles/redoc.standalone.js"></script>
</body>
</html>
`;

/**
 * Serve Swagger UI at /api/docs
 */
apiDocsRouter.get('/', (_req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/html');
  res.send(swaggerHTML);
});

/**
 * Serve ReDoc alternative UI at /api/docs/redoc
 */
apiDocsRouter.get('/redoc', (_req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/html');
  res.send(redocHTML);
});

/**
 * Serve OpenAPI spec as JSON at /api/docs/openapi.json
 */
apiDocsRouter.get('/openapi.json', (_req: Request, res: Response) => {
  try {
    // Load OpenAPI YAML spec from repository root
    const specPath = path.resolve(process.cwd(), 'openapi', 'spec.yaml');

    if (!fs.existsSync(specPath)) {
      logger.error({ specPath }, 'OpenAPI specification not found');
      return res.status(404).json({
        ok: false,
        error: 'OpenAPI specification not found',
        path: specPath,
      });
    }

    const yamlContent = fs.readFileSync(specPath, 'utf8');
    const specObject = yaml.load(yamlContent);

    // Update server URLs based on current request
    const protocol = _req.protocol;
    const host = _req.get('host');
    const baseUrl = `${protocol}://${host}`;

    if (specObject && typeof specObject === 'object' && 'servers' in specObject) {
      (specObject as any).servers = [
        {
          url: baseUrl,
          description: 'Current server',
        },
        ...(((specObject as any).servers || []) as any[]),
      ];
    }

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.json(specObject);
  } catch (error) {
    logger.error({ error }, 'Failed to load OpenAPI specification');
    res.status(500).json({
      ok: false,
      error: 'Failed to load OpenAPI specification',
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * Serve OpenAPI spec as YAML at /api/docs/openapi.yaml
 */
apiDocsRouter.get('/openapi.yaml', (_req: Request, res: Response) => {
  try {
    const specPath = path.resolve(process.cwd(), 'openapi', 'spec.yaml');

    if (!fs.existsSync(specPath)) {
      logger.error({ specPath }, 'OpenAPI specification not found');
      return res.status(404).send('OpenAPI specification not found');
    }

    const yamlContent = fs.readFileSync(specPath, 'utf8');

    res.setHeader('Content-Type', 'text/yaml');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.send(yamlContent);
  } catch (error) {
    logger.error({ error }, 'Failed to load OpenAPI specification');
    res.status(500).send('Failed to load OpenAPI specification');
  }
});

/**
 * Serve GraphQL schema documentation
 */
apiDocsRouter.get('/graphql-schema', async (_req: Request, res: Response) => {
  try {
    const { typeDefs } = await import('../graphql/schema.js');

    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.send(typeDefs);
  } catch (error) {
    logger.error({ error }, 'Failed to load GraphQL schema');
    res.status(500).send('Failed to load GraphQL schema');
  }
});

/**
 * GraphQL Playground HTML
 */
apiDocsRouter.get('/graphql-playground', (_req: Request, res: Response) => {
  const playgroundHTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>GraphQL Playground - IntelGraph</title>
  <link rel="stylesheet" href="https://unpkg.com/graphql-playground-react@1.7.28/build/static/css/index.css" />
  <link rel="shortcut icon" href="https://unpkg.com/graphql-playground-react@1.7.28/build/favicon.png" />
  <script src="https://unpkg.com/graphql-playground-react@1.7.28/build/static/js/middleware.js"></script>
</head>
<body>
  <div id="root"></div>
  <script>
    window.addEventListener('load', function (event) {
      GraphQLPlayground.init(document.getElementById('root'), {
        endpoint: '/graphql',
        settings: {
          'editor.theme': 'dark',
          'editor.cursorShape': 'line',
          'editor.reuseHeaders': true,
          'tracing.hideTracingResponse': true,
          'editor.fontSize': 14,
          'editor.fontFamily': "'Source Code Pro', 'Consolas', 'Inconsolata', 'Droid Sans Mono', 'Monaco', monospace",
          'request.credentials': 'include',
        },
      })
    })
  </script>
</body>
</html>
`;
  res.setHeader('Content-Type', 'text/html');
  res.send(playgroundHTML);
});

/**
 * Health check for documentation service
 */
apiDocsRouter.get('/health', (_req: Request, res: Response) => {
  res.json({
    ok: true,
    service: 'api-docs',
    endpoints: {
      swagger: '/api/docs',
      redoc: '/api/docs/redoc',
      openapi_json: '/api/docs/openapi.json',
      openapi_yaml: '/api/docs/openapi.yaml',
      graphql_schema: '/api/docs/graphql-schema',
      graphql_playground: '/api/docs/graphql-playground',
    },
  });
});

/**
 * API documentation metadata
 */
apiDocsRouter.get('/meta', (_req: Request, res: Response) => {
  try {
    const specPath = path.resolve(process.cwd(), 'openapi', 'spec.yaml');

    if (!fs.existsSync(specPath)) {
      return res.status(404).json({
        ok: false,
        error: 'OpenAPI specification not found',
      });
    }

    const yamlContent = fs.readFileSync(specPath, 'utf8');
    const spec = yaml.load(yamlContent) as any;

    res.json({
      ok: true,
      version: spec.info?.version || 'unknown',
      title: spec.info?.title || 'IntelGraph Platform API',
      description: spec.info?.description || '',
      paths: Object.keys(spec.paths || {}).length,
      schemas: Object.keys(spec.components?.schemas || {}).length,
      tags: (spec.tags || []).map((t: any) => t.name),
    });
  } catch (error) {
    logger.error({ error }, 'Failed to load metadata');
    res.status(500).json({
      ok: false,
      error: 'Failed to load metadata',
    });
  }
});

export default apiDocsRouter;
