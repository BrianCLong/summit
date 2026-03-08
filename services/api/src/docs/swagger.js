"use strict";
/**
 * Swagger UI Integration for IntelGraph Platform API
 *
 * Provides interactive API documentation at /api/docs endpoint
 * MIT License - Copyright (c) 2025 IntelGraph
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.swaggerRouter = void 0;
const express_1 = require("express");
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const node_url_1 = require("node:url");
const js_yaml_1 = __importDefault(require("js-yaml"));
const __filename = (0, node_url_1.fileURLToPath)(import.meta.url);
const __dirname = node_path_1.default.dirname(__filename);
exports.swaggerRouter = (0, express_1.Router)();
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
exports.swaggerRouter.get('/', (_req, res) => {
    res.setHeader('Content-Type', 'text/html');
    res.send(swaggerHTML);
});
/**
 * Serve ReDoc alternative UI at /api/docs/redoc
 */
exports.swaggerRouter.get('/redoc', (_req, res) => {
    res.setHeader('Content-Type', 'text/html');
    res.send(redocHTML);
});
/**
 * Serve OpenAPI spec as JSON at /api/docs/openapi.json
 */
exports.swaggerRouter.get('/openapi.json', (_req, res) => {
    try {
        // Load OpenAPI YAML spec from repository root
        const specPath = node_path_1.default.resolve(process.cwd(), 'openapi', 'spec.yaml');
        if (!node_fs_1.default.existsSync(specPath)) {
            return res.status(404).json({
                ok: false,
                error: 'OpenAPI specification not found',
                path: specPath,
            });
        }
        const yamlContent = node_fs_1.default.readFileSync(specPath, 'utf8');
        const specObject = js_yaml_1.default.load(yamlContent);
        // Update server URLs based on current request
        const protocol = _req.protocol;
        const host = _req.get('host');
        const baseUrl = `${protocol}://${host}`;
        if (specObject && typeof specObject === 'object' && 'servers' in specObject) {
            specObject.servers = [
                {
                    url: baseUrl,
                    description: 'Current server',
                },
                ...(specObject.servers || []),
            ];
        }
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.json(specObject);
    }
    catch (error) {
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
exports.swaggerRouter.get('/openapi.yaml', (_req, res) => {
    try {
        const specPath = node_path_1.default.resolve(process.cwd(), 'openapi', 'spec.yaml');
        if (!node_fs_1.default.existsSync(specPath)) {
            return res.status(404).send('OpenAPI specification not found');
        }
        const yamlContent = node_fs_1.default.readFileSync(specPath, 'utf8');
        res.setHeader('Content-Type', 'text/yaml');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.send(yamlContent);
    }
    catch (error) {
        res.status(500).send('Failed to load OpenAPI specification');
    }
});
/**
 * Health check for documentation service
 */
exports.swaggerRouter.get('/health', (_req, res) => {
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
exports.swaggerRouter.get('/meta', (_req, res) => {
    try {
        const specPath = node_path_1.default.resolve(process.cwd(), 'openapi', 'spec.yaml');
        const yamlContent = node_fs_1.default.readFileSync(specPath, 'utf8');
        const spec = js_yaml_1.default.load(yamlContent);
        res.json({
            ok: true,
            version: spec.info?.version || 'unknown',
            title: spec.info?.title || 'IntelGraph Platform API',
            description: spec.info?.description || '',
            paths: Object.keys(spec.paths || {}).length,
            schemas: Object.keys(spec.components?.schemas || {}).length,
            tags: (spec.tags || []).map((t) => t.name),
        });
    }
    catch (error) {
        res.status(500).json({
            ok: false,
            error: 'Failed to load metadata',
        });
    }
});
exports.default = exports.swaggerRouter;
