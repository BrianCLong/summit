import { jest, describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import {
  requestFactory,
  responseFactory,
  nextFactory,
} from '../../../../tests/factories/requestFactory';

// Mock functions declared before mocks
const mockEvaluatePolicy = jest.fn();
const mockLoggerInfo = jest.fn();
const mockLoggerWarn = jest.fn();
const mockLoggerError = jest.fn();

// ESM-compatible mocking using unstable_mockModule
jest.unstable_mockModule('../../conductor/governance/opa-integration', () => ({
  opaPolicyEngine: {
    evaluatePolicy: mockEvaluatePolicy,
  },
}));

jest.unstable_mockModule('../../utils/logger', () => {
  const logger = {
    info: mockLoggerInfo,
    warn: mockLoggerWarn,
    error: mockLoggerError,
  };

  return {
    __esModule: true,
    default: logger,
    logger,
  };
});

// Dynamic imports AFTER mocks are set up
const { maestroAuthzMiddleware } = await import('../maestro-authz');
const { opaPolicyEngine } = await import('../../conductor/governance/opa-integration');

describe('maestroAuthzMiddleware', () => {
  const createRequest = () => {
    const req = requestFactory({
      method: 'POST',
      path: '/runs/run-123',
      params: { runId: 'run-123' },
      query: { verbose: 'true' },
      body: { foo: 'bar' },
      user: {
        id: 'user-1',
        sub: 'user-1',
        role: 'analyst',
        tenant_id: 'tenant-1',
      },
    }) as any;

    req.baseUrl = '/api/maestro';
    req.traceId = 'trace-123';
    req.correlationId = 'corr-123';
    req.context = {
      tenantId: 'tenant-1',
      correlationId: 'corr-123',
      traceId: 'trace-123',
      principal: { id: 'user-1', role: 'analyst' },
    };

    return req;
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('allows a request when OPA approves and logs decision metadata', async () => {
    mockEvaluatePolicy.mockResolvedValue({
      allow: true,
      reason: 'allowed',
    });

    const middleware = maestroAuthzMiddleware({ resource: 'runs' });
    const req = createRequest();
    const res = responseFactory();
    const next = nextFactory();

    await middleware(req as any, res as any, next);

    expect(opaPolicyEngine.evaluatePolicy).toHaveBeenCalledWith(
      'maestro/authz',
      expect.objectContaining({
        action: 'post',
        resource: 'runs',
        tenantId: 'tenant-1',
        userId: 'user-1',
        role: 'analyst',
      }),
    );

    expect(req.policyDecision).toEqual(
      expect.objectContaining({ allow: true, reason: 'allowed' }),
    );
    expect(next).toHaveBeenCalled();

    expect(mockLoggerInfo).toHaveBeenCalledWith(
      'Maestro authorization allowed by OPA',
      expect.objectContaining({
        traceId: 'trace-123',
        principalId: 'user-1',
        resource: 'runs',
        decision: 'allow',
        resourceAttributes: expect.objectContaining({
          runId: 'run-123',
          foo: 'bar',
          verbose: 'true',
        }),
      }),
    );
  });

  it('denies a request when OPA blocks and records decision context', async () => {
    mockEvaluatePolicy.mockResolvedValue({
      allow: false,
      reason: 'policy block',
      auditLog: { message: 'denied' },
    });

    const middleware = maestroAuthzMiddleware({ resource: 'runs' });
    const req = createRequest();
    const res = responseFactory();
    const next = nextFactory();

    await middleware(req as any, res as any, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'policy block',
        auditContext: { message: 'denied' },
      }),
    );
    expect(next).not.toHaveBeenCalled();

    expect(mockLoggerWarn).toHaveBeenCalledWith(
      'Maestro authorization denied by OPA',
      expect.objectContaining({
        traceId: 'trace-123',
        principalId: 'user-1',
        resource: 'runs',
        decision: 'deny',
        reason: 'policy block',
        resourceAttributes: expect.objectContaining({
          runId: 'run-123',
          foo: 'bar',
          verbose: 'true',
        }),
      }),
    );
  });
});
