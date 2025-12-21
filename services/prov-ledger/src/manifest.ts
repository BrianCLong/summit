import { randomUUID, createHash } from 'crypto';
import MerkleTree from 'merkletreejs';
import stringify from 'fast-json-stable-stringify';
import { Evidence, Claim, Manifest } from './types';
import keccak from 'keccak';

export interface ManifestBundle {
  manifest: Manifest;
  evidences: Evidence[];
}

export function hashContent(content: unknown): string {
  const serialized = typeof content === 'string' ? content : stringify(content);
  return createHash('sha256').update(serialized).digest('hex');
}

function keccakLeaf(hash: string): Buffer {
  return keccak('keccak256').update(Buffer.from(hash.replace(/^0x/, ''), 'hex')).digest();
}

export class LedgerStore {
  private evidences: Map<string, Evidence> = new Map();
  private claims: Map<string, Claim> = new Map();
  private manifests: Map<string, Manifest> = new Map();

  registerEvidence(hash: string, metadata?: Record<string, unknown> | null, licenses: string[] = [], lineage: Record<string, string> = {}): Evidence {
    if (!hash || typeof hash !== 'string') {
      throw new Error('Evidence hash is required');
    }
    const id = randomUUID();
    const evidence: Evidence = { id, hash, metadata: metadata ?? null, licenses, lineage };
    this.evidences.set(id, evidence);
    return evidence;
  }

  createClaim(evidenceIds: string[], statement: string): Claim {
    evidenceIds.forEach(id => {
      if (!this.evidences.has(id)) {
        throw new Error(`Missing evidence ${id}`);
      }
    });
    const id = randomUUID();
    const claim: Claim = { id, evidenceIds, statement };
    this.claims.set(id, claim);
    return claim;
  }

  sealManifest(claimId: string): Manifest {
    const claim = this.claims.get(claimId);
    if (!claim) {
      throw new Error('Unknown claim');
    }
    const evidenceRecords = claim.evidenceIds.map(id => this.evidences.get(id) as Evidence);
    const evidenceHashes = evidenceRecords.map(e => e.hash.startsWith('0x') ? e.hash : `0x${e.hash}`);
    const merkleRoot = this.computeMerkleRoot(evidenceHashes);
    const licenses = Array.from(new Set(evidenceRecords.flatMap(e => e.licenses ?? [])));
    const lineage = evidenceRecords.reduce<Record<string, string>>((acc, ev) => ({ ...acc, ...(ev.lineage ?? {}) }), {});
    const manifest: Manifest = {
      id: randomUUID(),
      claimId: claim.id,
      merkleRoot,
      createdAt: new Date().toISOString(),
      evidenceHashes,
      licenses,
      lineage
    };
    this.manifests.set(manifest.id, manifest);
    return manifest;
  }

  exportBundle(claimId: string): ManifestBundle {
    const manifest = this.sealManifest(claimId);
    const evidences = manifest.evidenceHashes.map(hash => {
      const evidence = Array.from(this.evidences.values()).find(ev => ev.hash === hash || `0x${ev.hash}` === hash);
      if (!evidence) {
        throw new Error(`Evidence for hash ${hash} not found`);
      }
      return evidence;
    });
    return { manifest, evidences };
  }

  verifyBundle(bundle: ManifestBundle): { valid: boolean; expectedRoot: string; manifestRoot: string } {
    const evidenceHashes = bundle.evidences.map(ev => (ev.hash.startsWith('0x') ? ev.hash : `0x${ev.hash}`));
    return verifyManifest(bundle.manifest, evidenceHashes);
  }

  getManifest(id: string): Manifest | undefined {
    return this.manifests.get(id);
  }

  getEvidence(id: string): Evidence | undefined {
    return this.evidences.get(id);
  }

  private computeMerkleRoot(hashes: string[]): string {
    if (hashes.length === 0) {
      throw new Error('Cannot seal manifest without evidence');
    }
    const tree = new MerkleTree(
      hashes.map(keccakLeaf),
      data => keccak('keccak256').update(data).digest(),
      { sortPairs: true }
    );
    return `0x${tree.getRoot().toString('hex')}`;
  }
}

export function verifyManifest(manifest: Manifest, evidenceHashes: string[]): { valid: boolean; expectedRoot: string; manifestRoot: string } {
  const tree = new MerkleTree(
    evidenceHashes.map(keccakLeaf),
    data => keccak('keccak256').update(data).digest(),
    { sortPairs: true }
  );
  const expectedRoot = `0x${tree.getRoot().toString('hex')}`;
  return { valid: expectedRoot === manifest.merkleRoot, expectedRoot, manifestRoot: manifest.merkleRoot };
}

export const ledgerStore = new LedgerStore();
