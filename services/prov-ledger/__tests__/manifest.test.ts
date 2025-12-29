import { buildManifestRoot, verifyManifest, hashEvidencePayload } from '../src/signature';
import { ledgerStore } from '../src/store';

describe('manifest generation', () => {
  it('computes a deterministic merkle root for a claim', () => {
    const e1 = ledgerStore.registerEvidence(hashEvidencePayload({ file: 'alpha', size: 10 }));
    const e2 = ledgerStore.registerEvidence(hashEvidencePayload({ file: 'beta', size: 20 }));
    const claim = ledgerStore.registerClaim('test-claim', [e1.id, e2.id]);
    const evidence = ledgerStore.listEvidence(claim.evidenceIds);
    const root = buildManifestRoot(claim.id, evidence);
    expect(root).toMatch(/^0x[0-9a-f]+$/);
    expect(verifyManifest(claim.id, evidence, root)).toBe(true);
  });

  it('rejects sealing empty manifest', () => {
    expect(() => buildManifestRoot('c1', [])).toThrow('Manifest must contain at least one evidence item');
  });
});
