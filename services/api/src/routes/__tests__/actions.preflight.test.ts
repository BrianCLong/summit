/**
 * Preflight route tests
 */

import { actionsPreflightRouter, mapRedactions } from '../actions/preflight.js';

jest.mock('../../middleware/auth.js', () => ({
  authMiddleware: (_req: any, _res: any, next: any) => next(),
  requirePermission: () => (_req: any, _res: any, next: any) => next(),
}));

jest.mock('../../db/postgres.js', () => ({
  postgresPool: {
    insert: jest.fn(),
  },
}));

const postgresPool = jest.requireMock('../../db/postgres.js')
  .postgresPool as { insert: jest.Mock };

describe('mapRedactions', () => {
  it('collects redact obligations and deduplicates', () => {
    const obligations = [
      { type: 'redact', target: 'ssn' },
      { type: 'redact_fields', fields: ['dob', 'ssn'] },
      { type: 'mask', target: 'email' },
    ];
    expect(mapRedactions(obligations as any)).toEqual(['ssn', 'dob']);
  });
});

describe('actionsPreflightRouter', () => {
  const handler = (() => {
    const layer = (actionsPreflightRouter as any).stack.find(
      (l: any) => l.route?.path === '/preflight',
    );
    return layer.route.stack[layer.route.stack.length - 1].handle;
  })();

  beforeEach(() => {
    jest.resetAllMocks();
    global.fetch = jest.fn();
  });

  it('returns allow decision and persists it', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        allow: true,
        reason: 'allow',
        obligations: [{ type: 'redact', target: 'ssn' }],
      }),
    });

    const req: any = {
      body: { action: 'entity:read', resource: { id: 'r1' } },
      user: { id: 'u1', tenantId: 't1', role: 'analyst', permissions: [] },
    };
    const json = jest.fn();
    const res: any = {
      json,
      status: jest.fn().mockReturnThis(),
    };

    await handler(req, res);

    expect(json).toHaveBeenCalledWith({
      ok: true,
      decision: expect.objectContaining({
        allow: true,
        reason: 'allow',
        obligations: [{ type: 'redact', target: 'ssn' }],
        redactions: ['ssn'],
      }),
    });
    expect(postgresPool.insert).toHaveBeenCalledWith(
      'policy_decisions',
      expect.objectContaining({
        subject_id: 'u1',
        action: 'entity:read',
        resource_id: 'r1',
        allowed: true,
      }),
    );
  });

  it('returns 400 when action missing', async () => {
    const req: any = { body: {}, user: { id: 'u1' } };
    const json = jest.fn();
    const res: any = {
      json,
      status: jest.fn().mockReturnThis(),
    };

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith({
      ok: false,
      error: 'action_required',
      decision: null,
    });
  });
});
