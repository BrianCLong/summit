import express, { Router } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { readFile, access } from 'fs/promises';
import yaml from 'js-yaml';
import { createHash } from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const swaggerUiHtml = (specUrl: string) => `<!doctype html>
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

const redocHtml = (specUrl: string) => `<!doctype html>
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

type ApiDocsRouterOptions = {
  /** Optional override for the OpenAPI spec path (useful for tests). */
  specPath?: string;
  /** Public URL for the JSON spec exposed to doc viewers. */
  specPublicPath?: string;
};

const computeEtag = (contents: string) =>
  `W/"${createHash('sha256').update(contents).digest('hex')}"`;

const loadSpec = async (specPath: string) => {
  await access(specPath);
  const yamlContents = await readFile(specPath, 'utf-8');
  const specDocument = yaml.load(yamlContents) as Record<string, unknown>;

  if (!specDocument || typeof specDocument !== 'object' || !('openapi' in specDocument)) {
    throw new Error(`Invalid OpenAPI document at ${specPath}`);
  }

  return {
    yamlContents,
    specDocument,
    etag: computeEtag(yamlContents),
  };
};

export const createApiDocsRouter = async (
  options: ApiDocsRouterOptions = {},
): Promise<Router> => {
  const router = express.Router();
  const specPath =
    options.specPath ?? path.resolve(__dirname, '../../..', 'openapi/spec.yaml');
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
