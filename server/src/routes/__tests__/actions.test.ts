import express from 'express';
import request from 'supertest';
import { buildActionsRouter } from '../actions.js';
import { ActionPolicyError } from '../../services/ActionPolicyService.js';

const baseDecision = {
  allow: true,
  reason: 'allow',
  obligations: [],
  requestHash: 'hash-1',
  preflightId: 'pf-1',
  expiresAt: new Date(Date.now() + 1000),
  request: {
    action: 'DELETE_ACCOUNT',
    subject: { id: 'user-1' },
  },
};

function buildApp(serviceOverrides: Partial<any> = {}) {
  const router = buildActionsRouter({
    runPreflight: jest.fn().mockResolvedValue({
      ...baseDecision,
      ...serviceOverrides.preflightResult,
    }),
    assertExecutable:
      serviceOverrides.assertExecutable ||
      jest.fn().mockResolvedValue({
        ...baseDecision,
        ...serviceOverrides.executeResult,
      }),
  } as any);

  const app = express();
  app.use(express.json());
  app.use((req: any, _res, next) => {
    req.correlationId = 'corr-test';
    next();
  });
  app.use('/actions', router);
  return app;
}

describe('actions router', () => {
  it('returns preflight decision details', async () => {
    const app = buildApp();

    const res = await request(app)
      .post('/actions/preflight')
      .send(baseDecision.request);

    expect(res.status).toBe(200);
    expect(res.body.preflight_id).toBeDefined();
    expect(res.body.request_hash).toBe(baseDecision.requestHash);
    expect(res.body.decision.obligations).toEqual([]);
  });

  it('propagates deny responses with 403', async () => {
    const app = buildApp({
      preflightResult: { allow: false, reason: 'deny' },
    });

    const res = await request(app)
      .post('/actions/preflight')
      .send(baseDecision.request);

    expect(res.status).toBe(403);
    expect(res.body.decision.allow).toBe(false);
  });

  it('returns errors from execution guard with the provided status', async () => {
    const app = buildApp({
      assertExecutable: jest.fn().mockRejectedValue(
        new ActionPolicyError('missing preflight', 'preflight_missing', 404),
      ),
    });

    const res = await request(app)
      .post('/actions/execute')
      .send({ preflight_id: 'unknown', request: baseDecision.request });

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('preflight_missing');
  });
});
