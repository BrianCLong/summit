
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import * as crypto from 'crypto';
import stringify from 'fast-json-stable-stringify';
import { AttestationEngine } from '../../server/src/assurance/engine/AttestationEngine.js';
import { SecurityClaimProvider } from '../../server/src/assurance/engine/SecurityClaimProvider.js';
import { ProvenanceLedgerV2 } from '../../server/src/provenance/ledger.js';
import { ProvenanceClaimProvider } from '../../server/src/assurance/engine/ProvenanceClaimProvider.js';
import { AssuranceClaim } from '../../server/src/assurance/types.js';
import { AttestationRepository } from '../../server/src/assurance/db/AttestationRepository.js';

// Setup Mock DB
const mockDB: any = {
  rows: [],
  query: async (q: string, params: any[]) => {
      if (q.includes('INSERT INTO attestations')) {
          const [id, tenantId, timestamp, dataStr] = params;
          mockDB.rows.push({ id, tenantId, timestamp, data: JSON.parse(dataStr), revoked: false });
          return { rows: [] };
      }
      if (q.includes('SELECT data FROM attestations WHERE id')) {
           const row = mockDB.rows.find((r: any) => r.id === params[0]);
           return { rows: row ? [{ data: row.data, revoked: row.revoked }] : [] };
      }
      if (q.includes('SELECT revoked FROM attestations')) {
           const row = mockDB.rows.find((r: any) => r.id === params[0]);
           return { rows: row ? [{ revoked: row.revoked }] : [] };
      }
      if (q.includes('UPDATE attestations')) {
           const row = mockDB.rows.find((r: any) => r.id === params[0]);
           if (row) row.revoked = true;
           return { rows: [] };
      }
      if (q.includes('SELECT data FROM attestations')) {
           const rows = mockDB.rows.filter((r: any) => r.tenantId === params[0]);
           return { rows: rows.map((r: any) => ({ data: r.data })) };
      }
      return { rows: [] };
  }
};

const repo = AttestationRepository.getInstance();
(repo as any).save = async (attestation: any) => {
    mockDB.rows.push({ id: attestation.id, tenantId: attestation.tenantId, timestamp: attestation.timestamp, data: attestation, revoked: false });
};
(repo as any).getById = async (id: string) => {
    const row = mockDB.rows.find((r: any) => r.id === id);
    return row ? row.data : null;
};
(repo as any).listByTenant = async (tenantId: string) => {
    return mockDB.rows.filter((r: any) => r.tenantId === tenantId).map((r: any) => r.data);
};
(repo as any).isRevoked = async (id: string) => {
    const row = mockDB.rows.find((r: any) => r.id === id);
    return row ? row.revoked : false;
};
(repo as any).revoke = async (id: string) => {
     const row = mockDB.rows.find((r: any) => r.id === id);
     if (row) row.revoked = true;
};
(repo as any).createTableIfNotExists = async () => {};

// Mock Ledger
const mockLedger = {
  verifyChainIntegrity: async (tenantId: string) => ({ valid: true })
} as unknown as ProvenanceLedgerV2;

// Mock Security Provider
class MockSecurityProvider extends SecurityClaimProvider {
  async getClaims(tenantId: string): Promise<AssuranceClaim[]> {
     return [{
      id: `claim_sec_test_${Date.now()}`,
      domain: 'security',
      claim: 'security.vulnerability.scan.passed',
      value: true,
      evidence: [],
      timestamp: new Date().toISOString(),
      validUntil: new Date(Date.now() + 3600000).toISOString()
    }];
  }
}

describe('Assurance Verification Suite', async () => {
  const engine = AttestationEngine.getInstance();

  // Clean providers
  (engine as any).providers = [];

  engine.registerProvider(new MockSecurityProvider());
  engine.registerProvider(new ProvenanceClaimProvider(mockLedger));

  it('should emit claims with complete evidence', async () => {
    const attestation = await engine.generateAttestation('test-tenant');
    assert.ok(attestation.claims.length > 0);
  });

  it('should validate signatures using public key', async () => {
    const attestation = await engine.generateAttestation('test-tenant');
    const isValid = await engine.verifyAttestation(attestation);
    assert.strictEqual(isValid, true);

    // Verify manually with public key to ensure standard compliance
    const publicKey = engine.getPublicKey();
    assert.ok(publicKey);

    const payload = stringify({
      id: attestation.id,
      tenantId: attestation.tenantId,
      timestamp: attestation.timestamp,
      claims: attestation.claims
    });

    const verify = crypto.createVerify('SHA256');
    verify.update(payload);
    verify.end();

    assert.ok(verify.verify(publicKey!, attestation.signature, 'base64'));
  });

  it('should fail validation if signature is tampered', async () => {
    const attestation = await engine.generateAttestation('test-tenant');
    attestation.signature = Buffer.from('invalid_sig').toString('base64');
    const isValid = await engine.verifyAttestation(attestation);
    assert.strictEqual(isValid, false);
  });

  it('should persist attestations and allow retrieval', async () => {
    const attestation = await engine.generateAttestation('persist-tenant');
    const stored = await engine.getAttestation(attestation.id);
    assert.deepStrictEqual(stored, attestation);

    const list = await engine.listAttestations('persist-tenant');
    assert.ok(list.length >= 1);
    assert.strictEqual(list.find((a: any) => a.id === attestation.id)?.id, attestation.id);
  });

  it('should handle revocation', async () => {
    const attestation = await engine.generateAttestation('revoke-tenant');
    let isValid = await engine.verifyAttestation(attestation);
    assert.strictEqual(isValid, true);

    await engine.revokeAttestation(attestation.id, 'Test revocation');

    isValid = await engine.verifyAttestation(attestation);
    assert.strictEqual(isValid, false, 'Should be invalid after revocation');
  });
});
