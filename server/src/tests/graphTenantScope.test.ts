import { describe, it, expect, beforeEach, jest } from '@jest/globals';

const generateReceipt = jest
  .fn()
  .mockImplementation(async () => ({ id: 'receipt-1' }));

jest.mock('../services/ReceiptService.js', () => ({
  ReceiptService: {
    getInstance: () => ({
      generateReceipt,
    }),
  },
}));

import { enforceTenantScopeForCypher } from '../services/graphTenantScope.js';

describe('graph tenant scope enforcement', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('injects tenant filter when missing', async () => {
    const result = await enforceTenantScopeForCypher(
      'MATCH (n) RETURN n',
      { tenantId: 'tenant-1' },
      { tenantId: 'tenant-1', actorId: 'user-1' },
    );

    expect(result.cypher).toContain('WHERE n.tenantId = $tenantId');
    expect(result.params.tenantId).toBe('tenant-1');
    expect(generateReceipt).not.toHaveBeenCalled();
  });

  it('preserves existing tenant filter', async () => {
    const result = await enforceTenantScopeForCypher(
      'MATCH (n:Entity {tenantId: $tenantId}) RETURN n',
      { tenantId: 'tenant-2' },
      { tenantId: 'tenant-2', actorId: 'user-2' },
    );

    expect(result.cypher).toBe('MATCH (n:Entity {tenantId: $tenantId}) RETURN n');
    expect(result.params.tenantId).toBe('tenant-2');
  });

  it('denies execution when tenant scope is missing', async () => {
    await expect(
      enforceTenantScopeForCypher('MATCH (n) RETURN n', {}, {}),
    ).rejects.toThrow(/Tenant scope required/);

    expect(generateReceipt).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'GRAPH_TENANT_SCOPE_DENIED',
        actor: { id: 'system', tenantId: 'unknown' },
      }),
    );
  });

  it('denies execution when tenant scope mismatches', async () => {
    await expect(
      enforceTenantScopeForCypher(
        'MATCH (n) RETURN n',
        { tenantId: 'tenant-a' },
        { tenantId: 'tenant-b', actorId: 'user-3' },
      ),
    ).rejects.toThrow(/Tenant scope mismatch/);

    expect(generateReceipt).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'GRAPH_TENANT_SCOPE_DENIED',
        actor: { id: 'user-3', tenantId: 'tenant-b' },
      }),
    );
  });
});
