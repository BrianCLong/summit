/**
 * Health Check Endpoint Tests
 */

import request from 'supertest';
import { createApp } from '../server.js';

describe('Health Check Endpoints', () => {
  const app = createApp();

  describe('GET /health', () => {
    it('should return 200 and healthy status', async () => {
      const response = await request(app).get('/health');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'healthy');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('uptime');
      expect(response.body).toHaveProperty('version');
    });

    it('should include database status', async () => {
      const response = await request(app).get('/health');

      expect(response.body).toHaveProperty('database');
      expect(['connected', 'disconnected']).toContain(response.body.database);
    });
  });

  describe('GET /ready', () => {
    it('should return readiness status', async () => {
      const response = await request(app).get('/ready');

      expect(response.status).toBeGreaterThanOrEqual(200);
      expect(response.body).toHaveProperty('status');
    });
  });

  describe('GET /live', () => {
    it('should return 200 and alive status', async () => {
      const response = await request(app).get('/live');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'alive');
    });
  });
});
