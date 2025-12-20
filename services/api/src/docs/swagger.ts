/**
 * Swagger UI Integration for IntelGraph Platform API
 *
 * Provides interactive API documentation at /api/docs endpoint
 * MIT License - Copyright (c) 2025 IntelGraph
 */

import { Router, type Request, type Response } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const swaggerRouter = Router();

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
swaggerRouter.get('/', (_req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/html');
  res.send(swaggerHTML);
});

/**
 * Serve ReDoc alternative UI at /api/docs/redoc
 */
swaggerRouter.get('/redoc', (_req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/html');
  res.send(redocHTML);
});

/**
 * Serve OpenAPI spec as JSON at /api/docs/openapi.json
 */
swaggerRouter.get('/openapi.json', (_req: Request, res: Response) => {
  try {
    // Load OpenAPI YAML spec from repository root
    const specPath = path.resolve(process.cwd(), 'openapi', 'spec.yaml');

    if (!fs.existsSync(specPath)) {
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
    res.status(500).json({
      ok: false,
      error: 'Failed to load OpenAPI specification',
      details: String(error),
    });
  }
});

/**
 * Serve OpenAPI spec as YAML at /api/docs/openapi.yaml
 */
swaggerRouter.get('/openapi.yaml', (_req: Request, res: Response) => {
  try {
    const specPath = path.resolve(process.cwd(), 'openapi', 'spec.yaml');

    if (!fs.existsSync(specPath)) {
      return res.status(404).send('OpenAPI specification not found');
    }

    const yamlContent = fs.readFileSync(specPath, 'utf8');

    res.setHeader('Content-Type', 'text/yaml');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.send(yamlContent);
  } catch (error) {
    res.status(500).send('Failed to load OpenAPI specification');
  }
});

/**
 * Health check for documentation service
 */
swaggerRouter.get('/health', (_req: Request, res: Response) => {
  res.json({
    ok: true,
    service: 'api-docs',
    endpoints: {
      swagger: '/api/docs',
      redoc: '/api/docs/redoc',
      openapi_json: '/api/docs/openapi.json',
      openapi_yaml: '/api/docs/openapi.yaml',
    },
  });
});

/**
 * API documentation metadata
 */
swaggerRouter.get('/meta', (_req: Request, res: Response) => {
  try {
    const specPath = path.resolve(process.cwd(), 'openapi', 'spec.yaml');
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
    res.status(500).json({
      ok: false,
      error: 'Failed to load metadata',
    });
  }
});

export default swaggerRouter;
