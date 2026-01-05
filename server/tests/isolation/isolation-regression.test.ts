import { describe, it, expect } from '@jest/globals';
import fs from 'fs';
import path from 'path';
import { buildCypherFromDSL } from '../../src/graph/dsl/execution.js';
import { calculateReceiptHash } from '../../src/receipts/hash.js';

describe('Isolation Regression Suite', () => {
  it('scopes graph DSL queries to tenantId', () => {
    const { cypher, params } = buildCypherFromDSL(
      {
        start: { type: 'Person' },
        filter: { status: 'active' },
      },
      'tenant-graph-1',
    );

    expect(cypher).toContain('MATCH (n:GraphNode { tenantId: $tenantId })');
    expect(params.tenantId).toBe('tenant-graph-1');
  });

  it('isolates WORM storage keys by tenant namespace', async () => {
    const { putLocked, getLocked } = await import('../../src/audit/worm.js');
    const wormDir = path.resolve(process.cwd(), 'worm_storage');
    const tenantAKey = `tenant-a/receipts/${Date.now()}-a`;
    const tenantBKey = `tenant-b/receipts/${Date.now()}-b`;

    const tenantAPath = path.join(wormDir, tenantAKey.replace(/\//g, '_'));
    const tenantBPath = path.join(wormDir, tenantBKey.replace(/\//g, '_'));

    try {
      await putLocked('local', tenantAKey, 'payload-a');
      await putLocked('local', tenantBKey, 'payload-b');

      const tenantAResult = await getLocked(tenantAKey);
      const tenantBResult = await getLocked(tenantBKey);

      expect(tenantAResult?.toString()).toBe('payload-a');
      expect(tenantBResult?.toString()).toBe('payload-b');
      expect(tenantAPath).not.toBe(tenantBPath);
      expect(fs.existsSync(tenantAPath)).toBe(true);
      expect(fs.existsSync(tenantBPath)).toBe(true);
    } finally {
      if (fs.existsSync(tenantAPath)) {
        fs.chmodSync(tenantAPath, 0o644);
        fs.unlinkSync(tenantAPath);
      }
      if (fs.existsSync(tenantBPath)) {
        fs.chmodSync(tenantBPath, 0o644);
        fs.unlinkSync(tenantBPath);
      }
    }
  });

  it('isolates receipt hashes across tenants', () => {
    const baseReceipt = {
      receiptId: 'receipt-1',
      issuedAt: '2024-01-01T00:00:00Z',
      payload: { action: 'ingest', count: 1 },
    };

    const hashTenantA = calculateReceiptHash({
      ...baseReceipt,
      tenantId: 'tenant-a',
    });
    const hashTenantB = calculateReceiptHash({
      ...baseReceipt,
      tenantId: 'tenant-b',
    });

    expect(hashTenantA).not.toBe(hashTenantB);
  });
});
