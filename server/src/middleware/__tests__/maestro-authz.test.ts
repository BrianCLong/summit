import { jest, describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import { maestroAuthzMiddleware } from '../maestro-authz';
import { opaPolicyEngine } from '../../conductor/governance/opa-integration';
import {
  requestFactory,
  responseFactory,
  nextFactory,
} from '../../../../tests/factories/requestFactory';

jest.mock('../../conductor/governance/opa-integration', () => ({
  opaPolicyEngine: {
    evaluatePolicy: jest.fn(),
  },
}));

jest.mock('../../utils/logger', () => {
  const logger = {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };

  return {
    __esModule: true,
    default: logger,
    logger,
  };
});

const mockLogger = require('../../utils/logger').default as {
  info: jest.Mock;
  warn: jest.Mock;
  error: jest.Mock;
};

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
    (opaPolicyEngine.evaluatePolicy as jest.Mock).mockResolvedValue({
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

    expect(mockLogger.info).toHaveBeenCalledWith(
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
    (opaPolicyEngine.evaluatePolicy as jest.Mock).mockResolvedValue({
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

    expect(mockLogger.warn).toHaveBeenCalledWith(
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
