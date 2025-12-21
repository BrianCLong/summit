import { Ledger, verifyManifest } from '../src/ledger';

const ledger = new Ledger();

describe('ledger manifests', () => {
  const evidenceA = ledger.registerEvidence({ hash: '0xaaa', metadata: 'A', licenseTags: ['MIT'], lineage: { field1: 'raw->hashed' } });
  const evidenceB = ledger.registerEvidence({ hash: '0xbbb', metadata: 'B', licenseTags: ['MIT', 'CC'], lineage: { field2: 'normalized' } });
  const claim = ledger.registerClaim('Claim between nodes', [evidenceA.id, evidenceB.id], ['EXPORT']);

  it('computes merkle root deterministically', () => {
    const manifest = ledger.sealManifest(claim.id);
    const verification = verifyManifest(manifest);
    expect(verification.valid).toBe(true);
    expect(manifest.licenseTags.sort()).toEqual(['CC', 'EXPORT', 'MIT']);
    expect(manifest.lineage.field1).toBe('raw->hashed');
    expect(manifest.bundle.evidence).toHaveLength(2);
  });

  it('rejects missing claim', () => {
    expect(() => ledger.sealManifest('missing')).toThrow('claim not found');
  });
});
