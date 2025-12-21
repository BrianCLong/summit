import { ledgerStore, verifyManifest, hashContent } from '../src/manifest';
import { ManifestBundle } from '../src/manifest';

describe('prov-ledger manifest sealing', () => {
  it('seals a manifest with a Merkle root that verifies offline', () => {
    const evidenceA = ledgerStore.registerEvidence(hashContent({ id: 'ev1', payload: 'alpha' }), { source: 'sensor-a' }, ['CC-BY'], { fieldA: 'sensor-a' });
    const evidenceB = ledgerStore.registerEvidence(hashContent({ id: 'ev2', payload: 'beta' }), { source: 'sensor-b' }, ['CC-BY'], { fieldB: 'sensor-b' });
    const claim = ledgerStore.createClaim([evidenceA.id, evidenceB.id], 'alpha implies beta');
    const manifest = ledgerStore.sealManifest(claim.id);

    const verification = verifyManifest(manifest, manifest.evidenceHashes);
    expect(verification.valid).toBe(true);
    expect(verification.expectedRoot).toBe(manifest.merkleRoot);
    expect(manifest.licenses).toContain('CC-BY');
    expect(Object.keys(manifest.lineage)).toEqual(expect.arrayContaining(['fieldA', 'fieldB']));
  });

  it('fails verification when evidence is tampered', () => {
    const evidence = ledgerStore.registerEvidence(hashContent('gamma'));
    const claim = ledgerStore.createClaim([evidence.id], 'gamma claim');
    const manifest = ledgerStore.sealManifest(claim.id);
    const tampered = manifest.evidenceHashes.map((h, idx) => (idx === 0 ? `${h}aa` : h));
    const verification = verifyManifest(manifest, tampered);
    expect(verification.valid).toBe(false);
  });

  it('exports bundles with lineage and verifies them offline', () => {
    const ev = ledgerStore.registerEvidence(hashContent('delta'), { origin: 'sensor-c' }, ['MIT'], { fieldC: 'sensor-c' });
    const claim = ledgerStore.createClaim([ev.id], 'delta claim');
    const bundle: ManifestBundle = ledgerStore.exportBundle(claim.id);
    expect(bundle.manifest.licenses).toContain('MIT');
    expect(bundle.evidences[0].lineage).toEqual({ fieldC: 'sensor-c' });
    const verification = ledgerStore.verifyBundle(bundle);
    expect(verification.valid).toBe(true);
  });
});
