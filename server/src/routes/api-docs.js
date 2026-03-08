"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createApiDocsRouter = void 0;
const express_1 = __importDefault(require("express"));
const path_1 = __importDefault(require("path"));
const promises_1 = require("fs/promises");
const js_yaml_1 = __importDefault(require("js-yaml"));
const crypto_1 = require("crypto");
const swaggerUiHtml = (specUrl) => `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>IntelGraph API Explorer</title>
    <link
      rel="stylesheet"
      href="https://unpkg.com/swagger-ui-dist@5.18.2/swagger-ui.css"
    />
  </head>
  <body>
    <div id="swagger-ui"></div>
    <script src="https://unpkg.com/swagger-ui-dist@5.18.2/swagger-ui-bundle.js"></script>
    <script>
      window.onload = () => {
        window.ui = SwaggerUIBundle({
          url: '${specUrl}',
          dom_id: '#swagger-ui',
          deepLinking: true,
          filter: true,
          displayRequestDuration: true,
        });
      };
    </script>
  </body>
</html>`;
const redocHtml = (specUrl) => `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>IntelGraph API Docs</title>
    <script src="https://cdn.redoc.ly/redoc/latest/bundles/redoc.standalone.js"></script>
  </head>
  <body>
    <redoc spec-url="${specUrl}"></redoc>
  </body>
</html>`;
const computeEtag = (contents) => `W/"${(0, crypto_1.createHash)('sha256').update(contents).digest('hex')}"`;
const loadSpec = async (specPath) => {
    await (0, promises_1.access)(specPath);
    const yamlContents = await (0, promises_1.readFile)(specPath, { encoding: 'utf-8' });
    const yamlText = String(yamlContents);
    const specDocument = js_yaml_1.default.load(yamlText);
    if (!specDocument || typeof specDocument !== 'object' || !('openapi' in specDocument)) {
        throw new Error(`Invalid OpenAPI document at ${specPath}`);
    }
    return {
        yamlContents: yamlText,
        specDocument,
        etag: computeEtag(yamlText),
    };
};
const createApiDocsRouter = async (options = {}) => {
    const router = express_1.default.Router();
    const specPath = options.specPath ?? path_1.default.resolve(process.cwd(), 'openapi', 'spec.yaml');
    const specPublicPath = options.specPublicPath ?? '/api/docs/openapi.json';
    const { yamlContents, specDocument, etag } = await loadSpec(specPath);
    router.get('/openapi.yaml', (_req, res) => {
        res
            .type('application/yaml')
            .set({
            'Cache-Control': 'no-store',
            ETag: etag,
        })
            .send(yamlContents);
    });
    router.get('/openapi.json', (_req, res) => {
        res
            .type('application/json')
            .set({
            'Cache-Control': 'no-store',
            ETag: etag,
        })
            .json(specDocument);
    });
    router.get('/redoc', (_req, res) => {
        res.type('html').send(redocHtml(specPublicPath));
    });
    router.get('/', (_req, res) => {
        res.type('html').send(swaggerUiHtml(specPublicPath));
    });
    return router;
};
exports.createApiDocsRouter = createApiDocsRouter;
