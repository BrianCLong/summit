/**
 * API Documentation Routes Tests
 * Issue: #11814 - API Documentation with OpenAPI/Swagger
 */

import request from 'supertest';
import express from 'express';
import apiDocsRouter from '../api-docs.js';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect, beforeAll, jest } from '@jest/globals';

describe('API Documentation Routes', () => {
  let app: express.Application;

  beforeAll(() => {
    app = express();
    app.use('/api/docs', apiDocsRouter);
  });

  describe('GET /api/docs', () => {
    it('should return Swagger UI HTML', async () => {
      const response = await request(app).get('/api/docs');

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('text/html');
      expect(response.text).toContain('IntelGraph API Documentation');
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
      const specPath = path.resolve(process.cwd(), 'openapi', 'spec.yaml');

      // Skip test if spec file doesn't exist
      if (!fs.existsSync(specPath)) {
        console.warn('OpenAPI spec.yaml not found, skipping test');
        return;
      }

      const response = await request(app).get('/api/docs/openapi.json');

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('application/json');
      expect(response.body).toHaveProperty('openapi');
      expect(response.body).toHaveProperty('info');
      expect(response.body).toHaveProperty('paths');
      expect(response.body.info.title).toContain('IntelGraph');
    });

    it('should include current server URL in spec', async () => {
      const specPath = path.resolve(process.cwd(), 'openapi', 'spec.yaml');

      if (!fs.existsSync(specPath)) {
        console.warn('OpenAPI spec.yaml not found, skipping test');
        return;
      }

      const response = await request(app).get('/api/docs/openapi.json');

      expect(response.status).toBe(200);
      expect(response.body.servers).toBeDefined();
      expect(response.body.servers[0]).toHaveProperty('url');
      expect(response.body.servers[0].description).toBe('Current server');
    });

    it('should return 404 if OpenAPI spec does not exist', async () => {
      const specPath = path.resolve(process.cwd(), 'openapi', 'spec.yaml');

      if (fs.existsSync(specPath)) {
        console.warn('OpenAPI spec.yaml exists, skipping 404 test');
        return;
      }

      const response = await request(app).get('/api/docs/openapi.json');

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('ok', false);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/docs/openapi.yaml', () => {
    it('should return OpenAPI specification as YAML', async () => {
      const specPath = path.resolve(process.cwd(), 'openapi', 'spec.yaml');

      if (!fs.existsSync(specPath)) {
        console.warn('OpenAPI spec.yaml not found, skipping test');
        return;
      }

      const response = await request(app).get('/api/docs/openapi.yaml');

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('text/yaml');
      expect(response.text).toContain('openapi:');
      expect(response.text).toContain('paths:');
    });
  });

  describe('GET /api/docs/graphql-schema', () => {
    it('should return GraphQL schema', async () => {
      const response = await request(app).get('/api/docs/graphql-schema');

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('text/plain');
      expect(response.text.length).toBeGreaterThan(0);
    });
  });

  describe('GET /api/docs/graphql-playground', () => {
    it('should return GraphQL Playground HTML', async () => {
      const response = await request(app).get('/api/docs/graphql-playground');

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('text/html');
      expect(response.text).toContain('GraphQL Playground');
      expect(response.text).toContain('endpoint: \'/graphql\'');
    });
  });

  describe('GET /api/docs/health', () => {
    it('should return health status', async () => {
      const response = await request(app).get('/api/docs/health');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('ok', true);
      expect(response.body).toHaveProperty('service', 'api-docs');
      expect(response.body).toHaveProperty('endpoints');
      expect(response.body.endpoints).toHaveProperty('swagger');
      expect(response.body.endpoints).toHaveProperty('redoc');
      expect(response.body.endpoints).toHaveProperty('openapi_json');
      expect(response.body.endpoints).toHaveProperty('graphql_schema');
    });
  });

  describe('GET /api/docs/meta', () => {
    it('should return API metadata', async () => {
      const specPath = path.resolve(process.cwd(), 'openapi', 'spec.yaml');

      if (!fs.existsSync(specPath)) {
        console.warn('OpenAPI spec.yaml not found, skipping test');
        return;
      }

      const response = await request(app).get('/api/docs/meta');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('ok', true);
      expect(response.body).toHaveProperty('version');
      expect(response.body).toHaveProperty('title');
      expect(response.body).toHaveProperty('paths');
      expect(response.body).toHaveProperty('schemas');
      expect(response.body).toHaveProperty('tags');
    });
  });

  describe('CORS Headers', () => {
    it('should include CORS headers for OpenAPI JSON', async () => {
      const specPath = path.resolve(process.cwd(), 'openapi', 'spec.yaml');

      if (!fs.existsSync(specPath)) {
        console.warn('OpenAPI spec.yaml not found, skipping test');
        return;
      }

      const response = await request(app).get('/api/docs/openapi.json');

      expect(response.headers['access-control-allow-origin']).toBe('*');
    });

    it('should include CORS headers for OpenAPI YAML', async () => {
      const specPath = path.resolve(process.cwd(), 'openapi', 'spec.yaml');

      if (!fs.existsSync(specPath)) {
        console.warn('OpenAPI spec.yaml not found, skipping test');
        return;
      }

      const response = await request(app).get('/api/docs/openapi.yaml');

      expect(response.headers['access-control-allow-origin']).toBe('*');
    });
  });
});
