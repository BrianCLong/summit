/**
 * API Documentation Routes Tests
 * Issue: #11814 - API Documentation with OpenAPI/Swagger
 */

import request from 'supertest';
import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect, beforeAll } from '@jest/globals';
import { createApiDocsRouter } from '../api-docs.js';

const specPath = path.resolve(process.cwd(), 'openapi', 'spec.yaml');
const runNetwork =
  process.env.NO_NETWORK_LISTEN !== 'true' && fs.existsSync(specPath);
const describeIf = runNetwork ? describe : describe.skip;

describeIf('API Documentation Routes', () => {
  let app: express.Application;

  beforeAll(async () => {
    app = express();
    const router = await createApiDocsRouter({ specPath });
    app.use('/api/docs', router);
  });

  describe('GET /api/docs', () => {
    it('should return Swagger UI HTML', async () => {
      const response = await request(app).get('/api/docs');

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('text/html');
      expect(response.text).toContain('IntelGraph API Explorer');
      expect(response.text).toContain('swagger-ui');
    });
  });

  describe('GET /api/docs/redoc', () => {
    it('should return ReDoc HTML', async () => {
      const response = await request(app).get('/api/docs/redoc');

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('text/html');
      expect(response.text).toContain('redoc');
    });
  });

  describe('GET /api/docs/openapi.json', () => {
    it('should return OpenAPI specification as JSON', async () => {
      const response = await request(app).get('/api/docs/openapi.json');

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('application/json');
      expect(response.body).toHaveProperty('openapi');
      expect(response.body).toHaveProperty('info');
      expect(response.body).toHaveProperty('paths');
      expect(response.body.info.title).toContain('IntelGraph');
    });
  });

  describe('GET /api/docs/openapi.yaml', () => {
    it('should return OpenAPI specification as YAML', async () => {
      const response = await request(app).get('/api/docs/openapi.yaml');

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('text/yaml');
      expect(response.text).toContain('openapi:');
      expect(response.text).toContain('paths:');
    });
  });
});
