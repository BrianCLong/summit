import { jest, describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import express from 'express';
import request from 'supertest';
import { conductorRoutes } from '../conductor-routes.js';
import { refreshPricing } from '../../scheduling/pricing-refresh.js';

jest.mock('../../scheduling/pricing-refresh.js', () => ({
  refreshPricing: jest.fn(),
}));

const buildApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/conductor', conductorRoutes);
  return app;
};

describe('POST /api/conductor/pricing/refresh', () => {
  const originalBypass = process.env.AUTH_BYPASS;

  afterEach(() => {
    (refreshPricing as jest.Mock).mockReset();
    if (originalBypass === undefined) {
      delete process.env.AUTH_BYPASS;
    } else {
      process.env.AUTH_BYPASS = originalBypass;
    }
  });

  test('rejects unauthorized requests', async () => {
    delete process.env.AUTH_BYPASS;
    const app = buildApp();

    const res = await request(app)
      .post('/api/conductor/pricing/refresh')
      .send({});

    expect(res.status).toBe(401);
  });

  test('returns refresh result when authorized', async () => {
    process.env.AUTH_BYPASS = 'true';
    const app = buildApp();
    (refreshPricing as jest.Mock).mockResolvedValue({
      updatedPools: 2,
      skippedPools: 1,
      effectiveAt: new Date('2024-02-01T00:00:00.000Z'),
    });

    const res = await request(app)
      .post('/api/conductor/pricing/refresh')
      .send({});

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      updatedPools: 2,
      skippedPools: 1,
      effectiveAt: '2024-02-01T00:00:00.000Z',
    });
    expect(refreshPricing).toHaveBeenCalledTimes(1);
  });
});
