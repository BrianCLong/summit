import { wormAuditChain } from '../src/federal/worm-audit-chain.js';
import fs from 'node:fs/promises';
import path from 'node:path';

describe('WORM Audit Chain Integrity', () => {
  it('should maintain hash chain integrity across entries', async () => {
    const entry1 = {
      eventType: 'security_violation',
      userId: 'test-user',
      action: 'unauthorized_access',
      resource: 'sensitive-data',
      details: { ip: '192.168.1.1' },
      classification: 'SECRET'
    };

    const entry2 = {
      eventType: 'crypto_key_rotation',
      userId: 'admin',
      action: 'rotate',
      resource: 'hsm-key',
      details: { keyId: 'k1' },
      classification: 'TOP_SECRET'
    };

    await wormAuditChain.addAuditEntry(entry1);
    await wormAuditChain.addAuditEntry(entry2);

    // Force finalize segment
    await (wormAuditChain as any).finalizeSegment((wormAuditChain as any).currentSegment);

    const segment = (wormAuditChain as any).currentSegment;
    expect(segment.entries).toHaveLength(2);
    expect(segment.hashChain).toHaveLength(2);

    // Verify linkage
    expect(segment.hashChain[1].previousHash).toBe(segment.hashChain[0].dataHash || (wormAuditChain as any).lastHash);
    
    const result = await wormAuditChain.verifyHashChain(segment.hashChain);
    expect(result.valid).toBe(true);
  });
});
