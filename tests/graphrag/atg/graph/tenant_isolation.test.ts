import { describe, it, expect, vi } from 'vitest';
import { ATGGraphQuery } from '../../../../src/graphrag/atg/graph/query.js';
describe('ATG Tenant Isolation', () => {
  const mockRun = vi.fn();
  const mockSession = { executeRead: vi.fn((fn) => fn({ run: mockRun })), close: vi.fn() };
  const mockDriver = { session: vi.fn(() => mockSession) } as any;
  const query = new ATGGraphQuery(mockDriver);
  it('should enforce tenant_id', async () => {
    mockRun.mockResolvedValue({ records: [] });
    await query.getActorActivities('tenant-A', 'user-1');
    expect(mockRun.mock.calls[0][0]).toContain('tenant_id: $tenant_id');
    expect(mockRun.mock.calls[0][1].tenant_id).toBe('tenant-A');
  });
});
