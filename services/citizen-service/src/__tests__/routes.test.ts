import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../index.js';

describe('Citizen Service API', () => {
  describe('GET /health', () => {
    it('should return healthy status', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('healthy');
    });
  });

  describe('POST /api/v1/citizens', () => {
    it('should register a new citizen', async () => {
      const res = await request(app)
        .post('/api/v1/citizens')
        .send({
          nationalId: 'API-001',
          firstName: 'API',
          lastName: 'Test',
          source: 'test',
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body.nationalId).toBe('API-001');
    });

    it('should reject invalid data', async () => {
      const res = await request(app)
        .post('/api/v1/citizens')
        .send({
          firstName: 'Missing',
          // missing nationalId and lastName
        });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
    });
  });

  describe('GET /api/v1/citizens/:id', () => {
    it('should return 404 for non-existent citizen', async () => {
      const res = await request(app).get('/api/v1/citizens/00000000-0000-0000-0000-000000000000');
      expect(res.status).toBe(404);
    });
  });
});
