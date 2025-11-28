import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import request from 'supertest';
import { createApiDocsRouter } from '../src/routes/api-docs.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const fixtureSpecPath = path.join(__dirname, '../../openapi/spec.yaml');

describe('API documentation routes', () => {
  const app = express();

  beforeAll(async () => {
    app.use('/api/docs', await createApiDocsRouter({ specPath: fixtureSpecPath }));
  });

  it('serves the OpenAPI spec as JSON with no-store caching', async () => {
    const response = await request(app).get('/api/docs/openapi.json');

    expect(response.status).toBe(200);
    expect(response.headers['cache-control']).toBe('no-store');
    expect(response.headers.etag).toMatch(/^W\/"[a-f0-9]{64}"$/);
    expect(response.body.openapi).toMatch(/^3\.0/);
    expect(response.body.info.title).toBe('IntelGraph Platform API');
  });

  it('serves the OpenAPI spec as YAML', async () => {
    const response = await request(app).get('/api/docs/openapi.yaml');

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toContain('application/yaml');
    expect(response.headers.etag).toBeDefined();
    expect(response.text).toContain('openapi: 3.0');
  });

  it('renders Swagger UI for interactive exploration', async () => {
    const response = await request(app).get('/api/docs');

    expect(response.status).toBe(200);
    expect(response.text).toContain('SwaggerUIBundle');
    expect(response.text).toContain('/api/docs/openapi.json');
  });

  it('renders ReDoc for reference documentation', async () => {
    const response = await request(app).get('/api/docs/redoc');

    expect(response.status).toBe(200);
    expect(response.text).toContain('redoc');
  });
});

describe('API documentation router bootstrap failures', () => {
  it('throws a helpful error when the spec is missing', async () => {
    const missingPath = path.join(__dirname, '../openapi/does-not-exist.yaml');

    await expect(createApiDocsRouter({ specPath: missingPath })).rejects.toThrow(
      /does-not-exist\.yaml/,
    );
  });

  it('throws when the spec cannot be parsed as OpenAPI', async () => {
    const invalidSpecPath = path.join(__dirname, 'fixtures/invalid-openapi.yaml');
    fs.mkdirSync(path.dirname(invalidSpecPath), { recursive: true });
    fs.writeFileSync(invalidSpecPath, 'not: openapi');

    await expect(createApiDocsRouter({ specPath: invalidSpecPath })).rejects.toThrow(
      /Invalid OpenAPI document/,
    );

    fs.rmSync(path.dirname(invalidSpecPath), { recursive: true, force: true });
  });
});
