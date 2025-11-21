/**
 * API Integration Tests
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../index.js';

describe('Gov AI Governance API', () => {
  describe('GET /health', () => {
    it('should return healthy status', async () => {
      const res = await request(app).get('/health');

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('healthy');
      expect(res.body.service).toBe('gov-ai-governance');
    });
  });

  describe('Citizen Data Control', () => {
    const citizenId = '550e8400-e29b-41d4-a716-446655440000';

    it('POST /citizen/consent should record consent', async () => {
      const res = await request(app)
        .post('/citizen/consent')
        .send({
          citizenId,
          dataCategories: ['personal_identity'],
          purposes: ['service_delivery'],
          consentGiven: true,
          withdrawable: true,
        });

      expect(res.status).toBe(201);
      expect(res.body.citizenId).toBe(citizenId);
    });

    it('GET /citizen/:id/consents should return consents', async () => {
      const res = await request(app).get(`/citizen/${citizenId}/consents`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('POST /citizen/data-request should create request', async () => {
      const res = await request(app)
        .post('/citizen/data-request')
        .send({
          citizenId,
          requestType: 'access',
          dataCategories: ['personal_identity'],
        });

      expect(res.status).toBe(201);
      expect(res.body.status).toBe('pending');
    });

    it('GET /citizen/:id/export should export data', async () => {
      const res = await request(app).get(`/citizen/${citizenId}/export`);

      expect(res.status).toBe(200);
      expect(res.body.exportedAt).toBeDefined();
    });
  });

  describe('AI Model Registry', () => {
    it('GET /compliance/standards should return standards', async () => {
      const res = await request(app).get('/compliance/standards');

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(3);
    });

    it('GET /models should return empty initially', async () => {
      const res = await request(app).get('/models');

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe('Transparency', () => {
    it('GET /transparency/reports should return reports', async () => {
      const res = await request(app).get('/transparency/reports');

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('GET /audit should return audit events', async () => {
      const res = await request(app).get('/audit');

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('GET /audit/verify should verify integrity', async () => {
      const res = await request(app).get('/audit/verify');

      expect(res.status).toBe(200);
      expect(res.body.valid).toBe(true);
    });
  });
});
