// @ts-nocheck
import express from 'express';
import request from 'supertest';
import { operationsRouter } from '../operations-routes';
import { resetFeatureFlags } from '../../config/feature-flags';
import { pricingRefreshBlockedTotal } from '../../../metrics/federationMetrics.js';

let allowAuth = true;

jest.mock('../../auth/rbac-middleware', () => ({
  authenticateUser: (req: any, res: any, next: any) => {
    if (allowAuth) {
      req.user = {
        userId: 'tester',
        tenantId: 'tenant-1',
        roles: ['admin'],
        permissions: ['*'],
      };
      return next();
    }
    return res.status(401).json({ error: 'Authentication required' });
  },
  requireAnyPermission: () => (_req: any, _res: any, next: any) => next(),
  requirePermission: () => (_req: any, _res: any, next: any) => next(),
}));

describe('operations routes', () => {
  const app = express();
  app.use(express.json());
  app.use(operationsRouter);

  afterEach(() => {
    allowAuth = true;
    pricingRefreshBlockedTotal.reset();
    resetFeatureFlags();
  });

  test('returns feature flag snapshot for authorized users', async () => {
    resetFeatureFlags({
      PRICE_AWARE_ENABLED: 'false',
      PRICE_AWARE_FORCE_POOL_ID: 'snapshot-pool',
    } as NodeJS.ProcessEnv);

    const res = await request(app).get('/flags').expect(200);

    expect(res.body.flags.PRICE_AWARE_ENABLED).toBe(false);
    expect(res.body.flags.PRICE_AWARE_FORCE_POOL_ID).toBe('snapshot-pool');
  });

  test('requires authentication to read flags', async () => {
    allowAuth = false;
    await request(app).get('/flags').expect(401);
  });

  test('blocks pricing refresh when feature flag is disabled', async () => {
    const counterSpy = jest.spyOn(pricingRefreshBlockedTotal, 'inc');

    resetFeatureFlags({
      PRICING_REFRESH_ENABLED: 'false',
    } as NodeJS.ProcessEnv);

    const res = await request(app).post('/pricing/refresh').expect(409);

    expect(res.body.error).toBe(
      'pricing refresh disabled by feature flag',
    );
    expect(counterSpy).toHaveBeenCalledTimes(1);
  });
});
