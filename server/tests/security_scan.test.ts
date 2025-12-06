
import { describe, it, expect, beforeAll, afterAll, jest } from '@jest/globals';
import request from 'supertest';
import { createApp } from '../src/app';

// Mock dependencies
jest.mock('../src/config/production-security.js', () => ({
  productionAuthMiddleware: (req, res, next) => {
    // Simulate auth failure for testing if header missing
    if (!req.headers.authorization) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    next();
  },
  applyProductionSecurity: jest.fn(),
}));

jest.mock('../src/routes/health.js', () => ({
  default: (req, res) => res.status(200).json({ status: 'ok' }),
}));

jest.mock('../src/routes/monitoring.js', () => (req, res) => res.status(200).send('monitoring'));
jest.mock('../src/routes/ai.js', () => (req, res) => res.status(200).send('ai'));
jest.mock('../src/routes/webhooks.js', () => (req, res) => res.status(200).send('webhooks'));
jest.mock('../src/config', () => ({
  cfg: {
    NODE_ENV: 'production', // Force production to test strict auth
    CORS_ORIGIN: '*',
    LOG_LEVEL: 'silent',
  },
}));

describe('Security Controls', () => {
  let app;

  beforeAll(async () => {
    app = await createApp();
  });

  it('should allow public access to /health', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
  });

  it('should deny unauthenticated access to /api/ai', async () => {
    const res = await request(app).get('/api/ai');
    expect(res.status).toBe(401);
  });

  it('should deny unauthenticated access to /api/webhooks', async () => {
    const res = await request(app).get('/api/webhooks');
    expect(res.status).toBe(401);
  });

  it('should deny unauthenticated access to /monitoring', async () => {
    const res = await request(app).get('/monitoring');
    expect(res.status).toBe(401);
  });

  it('should deny unauthenticated access to /search/evidence', async () => {
    const res = await request(app).get('/search/evidence?q=test');
    expect(res.status).toBe(401);
  });

  it('should allow authenticated access to /api/ai', async () => {
    const res = await request(app)
      .get('/api/ai')
      .set('Authorization', 'Bearer valid_token');
    expect(res.status).toBe(200);
  });
});
