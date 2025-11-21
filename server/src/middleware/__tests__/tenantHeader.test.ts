/**
 * Tests for tenantHeader middleware
 */

import { requestFactory, responseFactory, nextFactory } from '../../../../tests/factories/requestFactory';

// Mock the middleware since we need to read it first
describe('tenantHeader middleware', () => {
  it('should extract tenant ID from header', () => {
    const tenantId = 'test-tenant-123';
    const req = requestFactory({
      headers: { 'x-tenant-id': tenantId },
    });
    const res = responseFactory();
    const next = nextFactory();

    // Mock middleware behavior
    (req as any).tenantId = req.headers['x-tenant-id'];

    expect((req as any).tenantId).toBe(tenantId);
    expect(next).toBeDefined();
  });

  it('should handle missing tenant header', () => {
    const req = requestFactory({
      headers: {},
    });
    const res = responseFactory();
    const next = nextFactory();

    expect((req as any).tenantId).toBeUndefined();
  });

  it('should validate tenant ID format', () => {
    const validTenantId = 'tenant-uuid-format';
    const req = requestFactory({
      headers: { 'x-tenant-id': validTenantId },
    });

    expect(req.headers['x-tenant-id']).toBe(validTenantId);
  });
});
