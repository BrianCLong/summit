import { ledger } from '../src/services/ledger';
import { Manifest } from '../src/types';

describe('prov-ledger manifest sealing', () => {
  beforeEach(() => ledger.reset());

  it('computes deterministic merkle roots and preserves license tags', () => {
    const e1 = ledger.registerEvidence('hash-a', { licenseTags: ['MIT'], lineage: [{ field: 'name', source: 'formA' }] });
    const e2 = ledger.registerEvidence('hash-b', { licenseTags: ['Apache-2.0'], lineage: [{ field: 'email', source: 'formB' }] });
    const claim = ledger.registerClaim([e1.id, e2.id], 'two pieces of evidence');

    const manifest: Manifest = ledger.sealManifest(claim.id);

    expect(manifest.merkleRoot).toMatch(/^0x/);
    expect(manifest.licenseTags.sort()).toEqual(['Apache-2.0', 'MIT'].sort());
    expect(manifest.lineage).toEqual([
      { field: 'name', source: 'formA' },
      { field: 'email', source: 'formB' }
    ]);
  });

  it('verifies bundles offline', () => {
    const evidence = ledger.registerEvidence('hash-c', {
      licenseTags: ['GPL-3.0'],
      lineage: [{ field: 'statement', source: 'attestation' }]
    });
    const claim = ledger.registerClaim([evidence.id], 'single evidence claim');
    const manifest = ledger.sealManifest(claim.id);

    const isValid = ledger.verifyBundle({ manifest, evidences: [evidence] });
    expect(isValid).toBe(true);
  });
});
