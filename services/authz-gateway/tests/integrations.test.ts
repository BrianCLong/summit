import type { Request, Response } from 'express';
import { createPolicyPlugin } from '../src/integrations/graphqlPlugin';
import { createPolicyMiddleware } from '../src/integrations/expressAdapter';
import { resetAuditLog } from '../src/audit';
import { setFeatureOverrides } from '../src/config';
import type { PolicyDecision } from '../src/policy';

type TestGraphQLContext = {
  request: { http: { headers: Map<string, string>; url: string } };
  contextValue: Record<string, unknown>;
  errors?: Error[];
};

type TestRequest = Request & {
  user?: Record<string, unknown>;
  policyDecision?: PolicyDecision;
};

function mockExpressResponse() {
  const res = {
    status: jest.fn(),
    json: jest.fn(),
    setHeader: jest.fn(),
  };
  (res.status as jest.Mock).mockReturnValue(res);
  (res.json as jest.Mock).mockReturnValue(res);
  return res as unknown as Response;
}

describe('integration adapters', () => {
  beforeEach(() => {
    resetAuditLog();
    jest.clearAllMocks();
  });

  it('graphql plugin surfaces deny errors', async () => {
    const plugin = createPolicyPlugin();
    const hooks = await plugin.requestDidStart?.();
    const ctx: TestGraphQLContext = {
      request: {
        http: {
          headers: new Map<string, string>(),
          url: '/protected/resource',
        },
      },
      contextValue: {
        user: {
          sub: 'alice',
          tenantId: 'tenantA',
          roles: ['reader'],
          clearance: 'confidential',
          status: 'active',
        },
      },
    };
    await hooks?.didResolveOperation?.(ctx);
    expect(ctx.errors?.[0]?.message).toContain('Access denied');
    expect(ctx.errors?.[0]?.extensions?.policyId).toBe(
      'policy.require-purpose',
    );
    expect(ctx.contextValue.policyAuditId).toBeDefined();
  });

  it('graphql plugin allows when purpose and authority are present', async () => {
    const plugin = createPolicyPlugin();
    const hooks = await plugin.requestDidStart?.();
    const headers = new Map([
      ['x-purpose', 'treatment'],
      ['x-authority', 'hipaa'],
    ]);
    const ctx: TestGraphQLContext = {
      request: { http: { headers, url: '/protected/resource' } },
      contextValue: {
        user: {
          sub: 'alice',
          tenantId: 'tenantA',
          roles: ['reader'],
          clearance: 'confidential',
          status: 'active',
        },
      },
    };
    await hooks?.didResolveOperation?.(ctx);
    expect(ctx.errors).toBeUndefined();
    expect(ctx.contextValue.policyDecision.allowed).toBe(true);
  });

  it('express adapter enforces policy decisions', async () => {
    const middleware = createPolicyMiddleware({ action: 'read' });
    const req = {
      originalUrl: '/protected/resource',
      headers: {
        'x-tenant-id': 'tenantB',
        'x-purpose': 'treatment',
        'x-authority': 'hipaa',
      },
      user: {
        sub: 'alice',
        tenantId: 'tenantA',
        roles: ['reader'],
        clearance: 'confidential',
        status: 'active',
      },
    } as unknown as TestRequest;
    const res = mockExpressResponse();
    const next = jest.fn();
    await middleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ policy: 'policy.tenant-isolation' }),
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('express adapter allows compliant requests and forwards audit id', async () => {
    const middleware = createPolicyMiddleware({ action: 'read' });
    const req = {
      originalUrl: '/protected/resource',
      headers: {
        'x-tenant-id': 'tenantA',
        'x-needtoknow': 'reader',
        'x-purpose': 'treatment',
        'x-authority': 'hipaa',
      },
      user: {
        sub: 'alice',
        tenantId: 'tenantA',
        roles: ['reader'],
        clearance: 'confidential',
        status: 'active',
      },
    } as unknown as TestRequest;
    const res = mockExpressResponse();
    const next = jest.fn();
    await middleware(req, res, next);
    expect(res.setHeader).toHaveBeenCalledWith(
      'X-Audit-Id',
      expect.any(String),
    );
    expect(next).toHaveBeenCalled();
    expect(req.policyDecision.allowed).toBe(true);
  });

  it('express adapter bypasses enforcement when the feature flag is disabled', async () => {
    setFeatureOverrides({ policyReasoner: false });
    const middleware = createPolicyMiddleware({ action: 'read' });
    const req = {
      originalUrl: '/protected/resource',
      headers: {},
      user: { sub: 'anonymous' },
    } as unknown as TestRequest;
    const res = mockExpressResponse();
    const next = jest.fn();
    await middleware(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
    expect(res.setHeader).not.toHaveBeenCalled();
    setFeatureOverrides({ policyReasoner: true });
  });
});
