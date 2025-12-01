
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OPAMiddleware } from '../../middleware/opa';

// Mock axios
const mockPost = vi.fn();
vi.mock('axios', () => ({
  default: {
    post: (...args) => mockPost(...args),
    get: vi.fn(),
  },
}));

// Mock database config to avoid import errors
vi.mock('../../config/database', () => ({
  getPostgresPool: vi.fn(),
}));

// Mock logger
vi.mock('../../utils/logger', () => ({
  default: { error: vi.fn(), warn: vi.fn(), info: vi.fn() }
}));

// Mock audit
vi.mock('../../utils/audit', () => ({
  writeAudit: vi.fn()
}));

describe('Tenant Isolation via OPAMiddleware', () => {
  let middleware: OPAMiddleware;
  const tenantA = 'tenant-a-uuid';
  const tenantB = 'tenant-b-uuid';

  beforeEach(() => {
    vi.clearAllMocks();
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

    const resolver = vi.fn();
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

    const resolver = vi.fn().mockReturnValue('success');
    const wrapped = middleware.createGraphQLMiddleware();

    const result = await wrapped(resolver, {}, args, context, info);
    expect(result).toBe('success');
  });
});
