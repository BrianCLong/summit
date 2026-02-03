import { jest, describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import express from 'express';
import request from 'supertest';
import nock from 'nock';
import type { PreflightRequest } from '../../../../packages/policy-audit/src/types.js';

// Mock functions declared before mocks
const mockGetPostgresPool = jest.fn();

// ESM-compatible mocking using unstable_mockModule
jest.unstable_mockModule('../../db/postgres.js', () => ({
  getPostgresPool: mockGetPostgresPool,
}));

jest.unstable_mockModule('../../middleware/auth.js', () => ({
  ensureAuthenticated: (_req: any, _res: any, next: any) => next(),
}));

// Dynamic imports AFTER mocks are set up
const { actionsRouter } = await import('../actions.js');
const { calculateRequestHash } = await import('../../services/ActionPolicyService.js');

const buildApp = () => {
  const app = express();
  app.use((req, _res, next) => {
    // Inject a deterministic correlation ID for assertions.
    (req as any).correlationId = 'corr-test';
    // Provide an authenticated user.
    (req as any).user = {
      id: 'user-1',
      role: 'ADMIN',
      tenantId: 'tenant-1',
    };
    next();
  });
  app.use('/api/actions', actionsRouter);
  return app;
};

const describeIf =
  process.env.NO_NETWORK_LISTEN === 'true' ? describe.skip : describe;

describeIf('actions router', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    nock.cleanAll();
  });

  it('approves preflight when dual-control obligations are satisfied', async () => {
    const query = jest.fn().mockResolvedValue({ rows: [] });
    mockGetPostgresPool.mockReturnValue({ query } as any);

    nock('http://localhost:8181')
      .post('/v1/data/actions/decision')
      .reply(200, {
        result: {
          allow: true,
          reason: 'dual_control_satisfied',
          obligations: [{ type: 'dual_control', satisfied: true }],
          expires_at: '2099-01-01T00:00:00Z',
        },
      });

    const app = buildApp();
    const res = await request(app)
      .post('/api/actions/preflight')
      .send({
        action: 'EXPORT_CASE',
        approvers: ['approver-a', 'approver-b'],
        payload: { id: 'case-1' },
      });

    expect(res.status).toBe(200);
    expect(res.body.decision.obligations[0].satisfied).toBe(true);
    expect(res.body.preflight_id).toBeDefined();
    expect(query).toHaveBeenCalledTimes(1);
  });

  it('denies preflight when approvers overlap and dual-control is unmet', async () => {
    const query = jest.fn().mockResolvedValue({ rows: [] });
    mockGetPostgresPool.mockReturnValue({ query } as any);

    nock('http://localhost:8181')
      .post('/v1/data/actions/decision')
      .reply(200, {
        result: {
          allow: false,
          reason: 'dual_control_required',
          obligations: [{ type: 'dual_control', satisfied: false }],
        },
      });

    const app = buildApp();
    const res = await request(app)
      .post('/api/actions/preflight')
      .send({
        action: 'DELETE_CASE',
        approvers: ['approver-a', 'approver-a'],
      });

    expect(res.status).toBe(403);
    expect(res.body.decision.allow).toBe(false);
    expect(query).toHaveBeenCalledTimes(1);
  });

  it('enforces preflight hash and expiry before executing', async () => {
    const query = jest.fn();
    const preflightRequest: PreflightRequest = {
      action: 'ROTATE_KEYS',
      actor: { id: 'user-1', tenantId: 'tenant-1', role: 'ADMIN' },
      payload: { scope: 'tenant' },
      approvers: ['approver-a', 'approver-b'],
    };
    const requestHash = calculateRequestHash(preflightRequest);
    query.mockResolvedValueOnce({
      rows: [
        {
          decision_id: 'pf-123',
          policy_name: 'actions',
          decision: 'ALLOW',
          resource_id: requestHash,
          reason: JSON.stringify({
            reason: 'dual_control_satisfied',
            obligations: [{ type: 'dual_control', satisfied: true }],
            requestHash,
            expiresAt: '2099-01-01T00:00:00Z',
          }),
        },
      ],
    });
    mockGetPostgresPool.mockReturnValue({ query } as any);

    const app = buildApp();
    const res = await request(app)
      .post('/api/actions/execute')
      .send({
        preflight_id: 'pf-123',
        action: 'ROTATE_KEYS',
        payload: { scope: 'tenant' },
        approvers: ['approver-a', 'approver-b'],
      });

    expect(res.status).toBe(200);
    expect(res.body.request_hash).toBe(requestHash);
  });

  it('rejects execution when the preflight window has expired', async () => {
    const preflightRequest: PreflightRequest = {
      action: 'EXPORT_CASE',
      actor: { id: 'user-1', tenantId: 'tenant-1', role: 'ADMIN' },
    };
    const requestHash = calculateRequestHash(preflightRequest);
    const query = jest.fn().mockResolvedValue({
      rows: [
        {
          decision_id: 'pf-expired',
          policy_name: 'actions',
          decision: 'ALLOW',
          resource_id: requestHash,
          reason: JSON.stringify({
            reason: 'dual_control_satisfied',
            obligations: [{ type: 'dual_control', satisfied: true }],
            requestHash,
            expiresAt: '2000-01-01T00:00:00Z',
          }),
        },
      ],
    });
    mockGetPostgresPool.mockReturnValue({ query } as any);

    const app = buildApp();
    const res = await request(app)
      .post('/api/actions/execute')
      .send({
        preflight_id: 'pf-expired',
        action: 'EXPORT_CASE',
      });

    expect(res.status).toBe(410);
    expect(res.body.error).toMatch(/expired/);
  });

  it('rejects execution when the request hash differs from the preflight record', async () => {
    const query = jest.fn().mockResolvedValue({
      rows: [
        {
          decision_id: 'pf-hash',
          policy_name: 'actions',
          decision: 'ALLOW',
          resource_id: 'expected-hash',
          reason: JSON.stringify({
            reason: 'dual_control_satisfied',
            obligations: [{ type: 'dual_control', satisfied: true }],
            requestHash: 'expected-hash',
            expiresAt: '2099-01-01T00:00:00Z',
          }),
        },
      ],
    });
    mockGetPostgresPool.mockReturnValue({ query } as any);

    const app = buildApp();
    const res = await request(app)
      .post('/api/actions/execute')
      .send({
        preflight_id: 'pf-hash',
        action: 'EXPORT_CASE',
        payload: { scope: 'different' },
      });

    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/hash/);
  });
});
