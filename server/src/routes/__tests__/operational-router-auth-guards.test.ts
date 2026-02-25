import express from 'express';
import request from 'supertest';

import { airgapRouter } from '../airgap.js';
import analyticsRouter from '../analytics.js';
import drRouter from '../dr.js';

const describeIf =
  process.env.NO_NETWORK_LISTEN === 'true' ? describe.skip : describe;

const mount = (basePath: string, router: express.Router) => {
  const app = express();
  app.use(express.json());
  app.use(basePath, router);
  return app;
};

describeIf('operational routers auth guardrails', () => {
  it('rejects unauthenticated airgap import lookups', async () => {
    const res = await request(mount('/airgap', airgapRouter)).get('/airgap/imports/test-import');

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Unauthorized');
  });

  it('rejects unauthenticated analytics path queries', async () => {
    const res = await request(mount('/analytics', analyticsRouter)).get('/analytics/path');

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Unauthorized');
  });

  it('rejects unauthenticated dr backup inventory reads', async () => {
    const res = await request(mount('/dr', drRouter)).get('/dr/backups');

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Unauthorized');
  });
});
