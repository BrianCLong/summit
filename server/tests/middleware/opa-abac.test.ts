
import { jest } from '@jest/globals';
import { Request, Response } from 'express';
import { AuthenticationError } from 'apollo-server-express';

// Mock dependencies
const mockEvaluate = jest.fn() as jest.MockedFunction<
  (policy: string, input: any) => Promise<any>
>;

jest.mock('axios');
jest.mock('@opentelemetry/api', () => ({
  trace: {
    getTracer: () => ({
      startSpan: () => ({
        setAttributes: jest.fn(),
        setStatus: jest.fn(),
        recordException: jest.fn(),
        end: jest.fn(),
      }),
    }),
  },
}));

jest.mock('../../src/utils/logger.js', () => ({
  logger: {
    child: () => ({
      debug: jest.fn(),
      error: jest.fn(),
    }),
    error: jest.fn(),
  },
}));

// Import the module under test
import { opaAuthzMiddleware, OPAClient } from '../../src/middleware/opa-abac.js';

describe('opaAuthzMiddleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let next: jest.Mock;
  let opaClient: OPAClient;

  beforeEach(() => {
    mockEvaluate.mockReset();

    // Create a mock OPAClient that uses our mockEvaluate
    opaClient = new OPAClient('http://localhost:8181');
    opaClient.evaluate = mockEvaluate;

    mockReq = {
      user: {
        id: 'user-123',
        tenantId: 'tenant-abc',
        roles: ['user'],
        residency: 'US',
        clearance: 'restricted',
      },
      method: 'GET',
      params: { id: 'resource-123' },
      baseUrl: '/api/resource',
      ip: '127.0.0.1',
      headers: {},
      get: jest.fn((header) => {
        if (header === 'User-Agent') return 'jest-test';
        return undefined;
      }),
    } as any;

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    } as any;

    next = jest.fn();
  });

  it('should call next() when policy allows', async () => {
    mockEvaluate.mockImplementation(() =>
      Promise.resolve({
        allow: true,
        reason: 'allow',
        obligations: [],
      }),
    );

    const middleware = opaAuthzMiddleware(opaClient);
    await middleware(mockReq as Request, mockRes as Response, next);

    expect(next).toHaveBeenCalled();
    expect(mockRes.status).not.toHaveBeenCalled();

    // Verify OPA call structure
    expect(mockEvaluate).toHaveBeenCalledWith(
        'summit.abac.decision',
        expect.objectContaining({
            subject: expect.objectContaining({ id: 'user-123' }),
            action: 'read'
        })
    );
  });

  it('should return 403 when policy denies', async () => {
    mockEvaluate.mockImplementation(() =>
      Promise.resolve({
        allow: false,
        reason: 'insufficient_clearance',
        obligations: [],
      }),
    );

    const middleware = opaAuthzMiddleware(opaClient);
    await middleware(mockReq as Request, mockRes as Response, next);

    expect(next).not.toHaveBeenCalled();
    expect(mockRes.status).toHaveBeenCalledWith(403);
    expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        code: 'FORBIDDEN',
        reason: 'insufficient_clearance'
    }));
  });

  it('should return 401 when step-up is required but missing', async () => {
    // Policy allows but returns step_up obligation because currentAcr is low
    mockEvaluate.mockImplementation(() =>
      Promise.resolve({
        allow: true,
        reason: 'allow',
        obligations: [{ type: 'step_up', mechanism: 'webauthn' }],
      }),
    );

    const middleware = opaAuthzMiddleware(opaClient);
    await middleware(mockReq as Request, mockRes as Response, next);

    expect(next).not.toHaveBeenCalled();
    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        code: 'STEP_UP_REQUIRED',
        mechanism: 'webauthn'
    }));
  });

  it('should allow when step-up is required and present', async () => {
    // Note: The middleware logic now checks the header BEFORE calling OPA to determine ACR,
    // OR if OPA returns an obligation, it means ACR was insufficient.
    // If we provide the header, the middleware sets currentAcr = 'loa2'.
    // Then OPA *should* theoretically return no obligation if configured correctly.
    // However, for this unit test, we are mocking OPA response.
    // If we provide the header, and mock OPA to return NO obligation (simulating logic worked), it should pass.

    // Simulate OPA happy path (since we can't run Rego logic here)
    mockEvaluate.mockImplementation(() =>
      Promise.resolve({
        allow: true,
        reason: 'allow',
        obligations: [], // No obligation because we sent high ACR
      }),
    );

    mockReq.headers = { 'x-step-up-auth': 'valid-token' };

    const middleware = opaAuthzMiddleware(opaClient);
    await middleware(mockReq as Request, mockRes as Response, next);

    expect(next).toHaveBeenCalled();

    // Verify we sent LoA2 to OPA
    expect(mockEvaluate).toHaveBeenCalledWith(
        'summit.abac.decision',
        expect.objectContaining({
            context: expect.objectContaining({ currentAcr: 'loa2' })
        })
    );
  });
});
