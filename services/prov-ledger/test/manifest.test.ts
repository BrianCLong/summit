import fs from 'fs';
import path from 'path';
import { ledger, Manifest } from '../src/lib/ledger.js';
import { buildMerkleTree } from '../src/lib/merkle.js';

describe('provenance manifests', () => {
  const base = path.join(process.cwd(), 'testdata');

  beforeEach(() => {
    // reset singleton ledger by replacing internal maps
    (ledger as any).evidenceMap?.clear?.();
    (ledger as any).claimMap?.clear?.();
    (ledger as any).edges?.splice?.(0);
    (ledger as any).log?.splice?.(0);
  });

  it('creates and verifies manifest over three evidence items', () => {
    const files = ['evidence-1.txt', 'evidence-2.txt', 'evidence-3.txt'];
    const evidenceIds = files.map((file) => {
      const content = fs.readFileSync(path.join(base, file));
      return ledger.addEvidence({ content, mediaType: 'text/plain' }).id;
    });
    const claim = ledger.addClaim({ evidenceIds, assertion: { summary: 'alpha+beta->gamma' } });
    const { manifest, serialized } = ledger.exportManifest(claim.id);

    const parsed = JSON.parse(serialized) as Manifest;
    const verification = ledger.verifyManifest(parsed);

    expect(verification.valid).toBe(true);
    expect(parsed.leaves).toHaveLength( evidenceIds.length + parsed.adjacency.length + 1);
    const recomputedRoot = buildMerkleTree(parsed.leaves).root;
    expect(recomputedRoot).toEqual(parsed.merkleRoot);
  });

  it('flags tampering with pinpointed path', () => {
    const content = fs.readFileSync(path.join(base, 'golden-manifest.json'), 'utf-8');
    const manifest = JSON.parse(content) as Manifest;
    manifest.leaves[0]!.hash = '00badbeef';

    const result = ledger.verifyManifest(manifest);
    expect(result.valid).toBe(false);
    expect(result.reasons.some((reason) => reason.includes(manifest.leaves[0]!.id))).toBe(true);
  });

  it('renders lineage adjacency for claim chain', () => {
    const files = ['evidence-1.txt', 'evidence-2.txt'];
    const evidenceIds = files.map((file) => {
      const content = fs.readFileSync(path.join(base, file));
      return ledger.addEvidence({ content, mediaType: 'text/plain' }).id;
    });
    const claim = ledger.addClaim({ evidenceIds, assertion: { statement: 'linked' } });
    const manifest = ledger.getManifest(claim.id);

    const adjacency = manifest.adjacency.map((edge) => `${edge.from}->${edge.to}`);
    evidenceIds.forEach((id) => {
      expect(adjacency).toContain(`${id}->${claim.id}`);
    });
  });
});
