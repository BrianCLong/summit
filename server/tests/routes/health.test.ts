import request from 'supertest';
import express from 'express';
import healthRouter from '../../src/routes/health.js';

const app = express();
app.use(healthRouter);

describe('Health Endpoints', () => {
  describe('GET /healthz', () => {
    it('should return 200 OK', async () => {
      const response = await request(app).get('/healthz');
      expect(response.status).toBe(200);
      expect(response.text).toBe('OK');
    });
  });

  describe('GET /readyz', () => {
    it('should return 200 OK', async () => {
      const response = await request(app).get('/readyz');
      expect(response.status).toBe(200);
      expect(response.text).toBe('OK');
    });
  });

  describe('GET /status', () => {
    it('should return service status with version, commit, and uptime', async () => {
      const response = await request(app).get('/status');
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('version');
      expect(response.body).toHaveProperty('commit');
      expect(response.body).toHaveProperty('uptime');
      expect(typeof response.body.version).toBe('string');
      expect(typeof response.body.uptime).toBe('number');
    });
  });
});
