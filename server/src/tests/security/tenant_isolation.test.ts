import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { OPAMiddleware } from '../../middleware/opa.js';

// Mock axios
const mockPost: any = jest.fn();
jest.mock('axios', () => ({
  __esModule: true,
  default: {
    post: (...args: unknown[]) => mockPost(...args),
    get: jest.fn(),
  },
}));

// Mock database config to avoid import errors
jest.mock('../../config/database.js', () => ({
  getPostgresPool: jest.fn(),
}));

// Mock logger
jest.mock('../../utils/logger.js', () => ({
  __esModule: true,
  default: { error: jest.fn(), warn: jest.fn(), info: jest.fn() },
}));

// Mock audit
jest.mock('../../utils/audit.js', () => ({
  writeAudit: jest.fn()
}));

describe('Tenant Isolation via OPAMiddleware', () => {
  let middleware: OPAMiddleware;
  const tenantA = 'tenant-a-uuid';
  const tenantB = 'tenant-b-uuid';

  beforeEach(() => {
    jest.clearAllMocks();
    middleware = new OPAMiddleware({ enabled: true, cacheEnabled: false });
  });

  it('should block access if OPA returns deny', async () => {
    // Mock OPA returning deny
    mockPost.mockResolvedValueOnce({
      data: { result: { allow: false, reason: 'Tenant mismatch' } }
    });

    const user = { id: 'u1', tenantId: tenantA, permissions: ['read'] };
    const context = { user };
    const info = {
      operation: { operation: 'query' },
      fieldName: 'getData',
      parentType: { name: 'Query' }
    };
    const args = { tenantId: tenantB }; // User A accessing Tenant B data

    const resolver = jest.fn();
    const wrapped = middleware.createGraphQLMiddleware();

    await expect(wrapped(resolver, {}, args, context, info))
      .rejects.toThrow('Access denied: Tenant mismatch');

    // Verify OPA was called with correct context
    expect(mockPost).toHaveBeenCalledWith(
      expect.stringContaining('/v1/data/intelgraph/allow'),
      expect.objectContaining({
        input: expect.objectContaining({
          context: expect.objectContaining({
            tenantId: tenantB // Should use args.tenantId as it takes precedence/is the target
          }),
          user: expect.objectContaining({
            tenantId: tenantA
          })
        })
      }),
      expect.any(Object)
    );
  });

  it('should allow access if OPA returns allow', async () => {
    mockPost.mockResolvedValueOnce({
      data: { result: { allow: true } }
    });

    const user = { id: 'u1', tenantId: tenantA, permissions: ['read'] };
    const context = { user };
    const info = {
      operation: { operation: 'query' },
      fieldName: 'getData',
      parentType: { name: 'Query' }
    };
    const args = { tenantId: tenantA };

    const resolver = jest.fn().mockReturnValue('success');
    const wrapped = middleware.createGraphQLMiddleware();

    const result = await wrapped(resolver, {}, args, context, info);
    expect(result).toBe('success');
  });
});
