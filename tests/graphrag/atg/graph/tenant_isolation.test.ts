import { describe, it, expect, vi } from 'vitest';
import { ATGGraphQuery } from '../../../../src/graphrag/atg/graph/query.js';

describe('ATG Tenant Isolation', () => {
  const mockRun = vi.fn();
  const mockSession = {
    executeRead: vi.fn((fn) => fn({ run: mockRun })),
    close: vi.fn().mockResolvedValue(undefined)
  };
  const mockDriver = {
    session: vi.fn(() => mockSession)
  } as any;

  const query = new ATGGraphQuery(mockDriver);

  it('should include tenant_id in all match patterns to ensure isolation', async () => {
    mockRun.mockResolvedValue({ records: [] });
    await query.getActorActivities('tenant-A', 'user-1');

    const lastCall = mockRun.mock.calls[mockRun.mock.calls.length - 1];
    const cypher = lastCall[0];
    const params = lastCall[1];

    expect(cypher).toContain('tenant_id: $tenant_id');
    expect(params.tenant_id).toBe('tenant-A');
  });

  it('should throw an error if tenant_id is missing to prevent cross-tenant leakage', async () => {
    await expect(query.getActorActivities('', 'user-1')).rejects.toThrow('tenant_id is required');
  });

  it('should enforce tenant_id in lateral movement queries', async () => {
    mockRun.mockResolvedValue({ records: [] });
    await query.findPotentialLateralMovement('tenant-B');

    const lastCall = mockRun.mock.calls[mockRun.mock.calls.length - 1];
    const cypher = lastCall[0];
    const params = lastCall[1];

    expect(cypher).toContain('tenant_id: $tenant_id');
    expect(params.tenant_id).toBe('tenant-B');
  });
});
