import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';

vi.mock('fs', () => ({
  existsSync: vi.fn().mockReturnValue(true),
  readFileSync: vi.fn().mockReturnValue(`
policies:
  - action: "*"
    classification: "restricted"
    role: "admin"
    requirements:
      rfa_required: true
      min_reason_len: 10
      ticket_required: true
  - action: "export"
    classification: "restricted"
    role: "user"
    requirements:
      step_up_required: true
      rfa_required: true
      min_reason_len: 15
  `),
}));

vi.mock('@opentelemetry/api', () => ({
  trace: {
    getTracer: vi.fn().mockReturnValue({
      startSpan: vi.fn().mockReturnValue({
        end: vi.fn(),
        recordException: vi.fn(),
      }),
    }),
  },
}));

const mockEmitAudit = vi.fn().mockResolvedValue(undefined);
vi.mock('@intelgraph/audit/index', () => ({
  emitAudit: (...args: any[]) => mockEmitAudit(...args),
}));

import { auditRfaMiddleware } from '../audit_rfa';

describe('auditRfaMiddleware', () => {
  let req: any;
  let res: any;
  let next: NextFunction;

  beforeEach(() => {
    vi.clearAllMocks();

    req = {
      method: 'GET',
      path: '/api/reports/public/1',
      headers: {},
      ip: '127.0.0.1',
      params: {},
      user: { id: 'anonymous', roles: [], mfa_method: 'none', clearance: 0 },
      tenantId: 'test-tenant'
    };

    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
      send: vi.fn(),
      statusCode: 200,
    };

    next = vi.fn();
  });

  it('allows public access without RFA', async () => {
    await auditRfaMiddleware(req as Request, res as Response, next);
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
    res.send('ok');
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(mockEmitAudit).toHaveBeenCalled();
  });

  it('requires RFA with ticket for restricted routes as admin', async () => {
    req.path = '/api/admin/users';
    req.method = 'GET';
    req.user = { roles: ['admin'], id: 'admin1', mfa_method: 'okta' };

    await auditRfaMiddleware(req as Request, res as Response, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      error: 'RFA_REQUIRED',
    }));
  });

  it('requires min length reason for restricted routes as admin', async () => {
    req.path = '/api/admin/users';
    req.user = { roles: ['admin'], id: 'admin1', mfa_method: 'okta' };
    req.headers = { 'x-rfa-reason': 'short' };

    await auditRfaMiddleware(req as Request, res as Response, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      error: 'RFA_INVALID',
    }));
  });

  it('requires ticket for restricted routes as admin', async () => {
    req.path = '/api/admin/users';
    req.user = { roles: ['admin'], id: 'admin1', mfa_method: 'okta' };
    req.headers = { 'x-rfa-reason': 'this is a long enough reason' };

    await auditRfaMiddleware(req as Request, res as Response, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      error: 'RFA_TICKET_REQUIRED',
    }));
  });

  it('allows restricted access when valid RFA and ticket provided', async () => {
    req.path = '/api/admin/users';
    req.user = { roles: ['admin'], id: 'admin1', mfa_method: 'okta' };
    req.headers = {
      'x-rfa-reason': 'this is a long enough reason',
      'x-rfa-ticket': 'PROJ-1234'
    };

    await auditRfaMiddleware(req as Request, res as Response, next);
    expect(next).toHaveBeenCalled();
    res.send('ok');
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(mockEmitAudit).toHaveBeenCalledWith(expect.objectContaining({
      rfa: expect.objectContaining({
        required: true,
        reason: 'this is a long enough reason',
        ticket: 'PROJ-1234'
      })
    }));
  });

  it('requires step-up token for restricted export as user', async () => {
    req.path = '/api/export/data';
    req.method = 'GET';
    req.user = { roles: ['user'], id: 'user1', mfa_method: 'okta' };
    req.headers = {
      'x-rfa-reason': 'exporting data for analysis',
      'x-rfa-ticket': 'PROJ-1234'
    };

    await auditRfaMiddleware(req as Request, res as Response, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      error: 'STEP_UP_REQUIRED',
    }));
  });

  it('allows restricted export as user with step-up token', async () => {
    req.path = '/api/export/data';
    req.method = 'GET';
    req.user = { roles: ['user'], id: 'user1', mfa_method: 'okta' };
    req.headers = {
      'x-rfa-reason': 'exporting data for analysis',
      'x-rfa-ticket': 'PROJ-1234',
      'x-step-up-token': 'valid-token'
    };

    await auditRfaMiddleware(req as Request, res as Response, next);
    expect(next).toHaveBeenCalled();
  });
});
