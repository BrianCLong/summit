import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import express from 'express';
import { createRoutes } from '../api/routes.js';
import { DataDiscoveryFusionEngine } from '../DataDiscoveryFusionEngine.js';

// Simple request helper for testing
async function request(app: express.Application, method: string, path: string, body?: unknown) {
  const http = await import('http');

  return new Promise<{ status: number; body: unknown }>((resolve, reject) => {
    const server = app.listen(0, () => {
      const address = server.address() as { port: number };
      const options = {
        hostname: 'localhost',
        port: address.port,
        path,
        method,
        headers: body ? { 'Content-Type': 'application/json' } : {},
      };

      const req = http.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          server.close();
          try {
            resolve({ status: res.statusCode || 500, body: data ? JSON.parse(data) : null });
          } catch {
            resolve({ status: res.statusCode || 500, body: data });
          }
        });
      });

      req.on('error', (e) => {
        server.close();
        reject(e);
      });

      if (body) {
        req.write(JSON.stringify(body));
      }
      req.end();
    });
  });
}

describe('API Routes', () => {
  let app: express.Application;
  let engine: DataDiscoveryFusionEngine;

  beforeAll(() => {
    engine = new DataDiscoveryFusionEngine({
      enableAutoDiscovery: false,
      enableEventPublishing: false,
    });

    app = express();
    app.use(express.json());
    app.use('/api/v1', createRoutes(engine));
  });

  afterAll(async () => {
    await engine.stop();
  });

  describe('GET /api/v1/health', () => {
    it('should return health status', async () => {
      const res = await request(app, 'GET', '/api/v1/health');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('status', 'healthy');
      expect(res.body).toHaveProperty('stats');
    });
  });

  describe('GET /api/v1/sources', () => {
    it('should return empty sources list initially', async () => {
      const res = await request(app, 'GET', '/api/v1/sources');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('sources');
      expect(Array.isArray((res.body as { sources: unknown[] }).sources)).toBe(true);
    });
  });

  describe('POST /api/v1/fuse', () => {
    it('should fuse records', async () => {
      const res = await request(app, 'POST', '/api/v1/fuse', {
        records: [
          { sourceId: 'src1', recordId: '1', data: { name: 'John', email: 'john@example.com' } },
          { sourceId: 'src2', recordId: '2', data: { name: 'John', phone: '555-1234' } },
        ],
        matchFields: ['name'],
      });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('results');
    });
  });

  describe('POST /api/v1/deduplicate', () => {
    it('should deduplicate records', async () => {
      const res = await request(app, 'POST', '/api/v1/deduplicate', {
        records: [
          { sourceId: 'src1', recordId: '1', data: { name: 'John', email: 'john@example.com' } },
          { sourceId: 'src1', recordId: '2', data: { name: 'John', email: 'john@example.com' } },
        ],
        matchFields: ['name', 'email'],
      });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('results');
    });
  });

  describe('GET /api/v1/recipes', () => {
    it('should return automation recipes', async () => {
      const res = await request(app, 'GET', '/api/v1/recipes');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('recipes');
      expect(Array.isArray((res.body as { recipes: unknown[] }).recipes)).toBe(true);
    });
  });

  describe('GET /api/v1/learning/stats', () => {
    it('should return learning statistics', async () => {
      const res = await request(app, 'GET', '/api/v1/learning/stats');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('stats');
    });
  });

  describe('GET /api/v1/fusion/:id (not found)', () => {
    it('should return 404 for non-existent fusion', async () => {
      const res = await request(app, 'GET', '/api/v1/fusion/non-existent-id');

      expect(res.status).toBe(404);
    });
  });
});
