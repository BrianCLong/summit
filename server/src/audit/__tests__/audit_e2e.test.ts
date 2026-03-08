import { jest, describe, it, expect, beforeEach } from '@jest/globals';

// Define mock instances
const mPool = {
  query: jest.fn<any>(),
  connect: jest.fn(),
  on: jest.fn(),
};
const mRedis = {
  publish: jest.fn(),
  subscribe: jest.fn(),
  on: jest.fn(),
};

// Mock modules using unstable_mockModule for ESM support
jest.unstable_mockModule('pg', () => ({
  Pool: jest.fn(() => mPool),
}));

jest.unstable_mockModule('ioredis', () => ({
  default: jest.fn(() => mRedis),
}));

// Dynamic import for the system under test
const { getAuditSystem } = await import('../index.js');

describe('Audit Logging End-to-End', () => {
  let auditSystem: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mPool.query.mockResolvedValue({ rows: [], rowCount: 1 });
    auditSystem = getAuditSystem();
  });

  it('should emit and store an audit event (who saw what when)', async () => {
    const event = {
      action: 'VIEW_DOCUMENT',
      actor: { id: 'user-123', role: 'admin' },
      target: { id: 'doc-456', type: 'document' },
      tenantId: 'tenant-1',
      details: { foo: 'bar' },
    };

    await auditSystem.recordEvent(event);

    expect(mPool.query).toHaveBeenCalled();
    const callArgs = mPool.query.mock.calls[0];
    const sql = callArgs[0] as string;
    const params = callArgs[1] as any[];

    expect(sql).toMatch(/INSERT INTO audit_log/i);
    // Verify payload contains critical fields
    const paramString = JSON.stringify(params);
    expect(paramString).toContain('user-123');
    expect(paramString).toContain('doc-456');
    expect(paramString).toContain('VIEW_DOCUMENT');
  });

  it('should query events from the store', async () => {
    const mockRow = {
      id: 'evt-1',
      action: 'VIEW_DOCUMENT',
      actor_id: 'user-123',
      timestamp: new Date(),
      details: { foo: 'bar' }
    };

    mPool.query.mockResolvedValueOnce({ rows: [mockRow], rowCount: 1 });

    // The queryEvents signature depends on implementation, passing generic filter
    const results = await auditSystem.queryEvents({ actorId: 'user-123' });

    expect(mPool.query).toHaveBeenCalled();
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe('evt-1');
  });
});
