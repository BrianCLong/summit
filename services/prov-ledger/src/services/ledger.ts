import keccak from 'keccak';
import { MerkleTree } from 'merkletreejs';
import { Claim, Evidence, EvidenceMetadata, Lineage, Manifest } from '../types';

function hashLeaf(value: string): Buffer {
  return keccak('keccak256').update(value).digest();
}

function normalizeMetadata(metadata?: Partial<EvidenceMetadata>): EvidenceMetadata {
  const licenseTags = metadata?.licenseTags?.length ? metadata.licenseTags : ['unlicensed'];
  const lineage = metadata?.lineage?.length ? metadata.lineage : [];
  return { licenseTags, lineage };
}

class LedgerService {
  private evidences = new Map<string, Evidence>();
  private claims = new Map<string, Claim>();
  private manifests = new Map<string, Manifest>();
  private evidenceCounter = 1;
  private claimCounter = 1;

  registerEvidence(hash: string, metadata?: Partial<EvidenceMetadata>): Evidence {
    if (!hash) throw new Error('hash is required');
    const id = `e${this.evidenceCounter++}`;
    const normalizedMetadata = normalizeMetadata(metadata);
    const evidence: Evidence = { id, hash, metadata: normalizedMetadata };
    this.evidences.set(id, evidence);
    return evidence;
  }

  registerClaim(evidenceIds: string[], statement: string): Claim {
    if (!statement.trim()) throw new Error('statement is required');
    if (!evidenceIds.length) throw new Error('claims require at least one evidence id');
    evidenceIds.forEach((id) => {
      if (!this.evidences.has(id)) {
        throw new Error(`evidence ${id} not found`);
      }
    });
    const id = `c${this.claimCounter++}`;
    const claim: Claim = { id, evidenceIds, statement };
    this.claims.set(id, claim);
    return claim;
  }

  sealManifest(claimId: string): Manifest {
    const claim = this.claims.get(claimId);
    if (!claim) throw new Error('claim not found');
    const evidences = claim.evidenceIds.map((id) => this.requireEvidence(id));
    const tree = new MerkleTree(
      evidences.map((e) => hashLeaf(e.hash)),
      (data: Buffer) => keccak('keccak256').update(data).digest(),
      { sortPairs: true }
    );
    const merkleRoot = tree.getHexRoot();
    const licenseTags = Array.from(new Set(evidences.flatMap((e) => e.metadata.licenseTags)));
    const lineage: Lineage[] = evidences.flatMap((e) => e.metadata.lineage.map((line) => ({ ...line })));
    const manifest: Manifest = {
      id: claim.id,
      merkleRoot,
      createdAt: new Date().toISOString(),
      licenseTags,
      lineage
    };
    this.manifests.set(manifest.id, manifest);
    return manifest;
  }

  verifyBundle(bundle: { manifest: Manifest; evidences: Evidence[] }): boolean {
    const tree = new MerkleTree(
      bundle.evidences.map((e) => hashLeaf(e.hash)),
      (data: Buffer) => keccak('keccak256').update(data).digest(),
      { sortPairs: true }
    );
    return tree.getHexRoot() === bundle.manifest.merkleRoot;
  }

  getClaim(id: string): Claim | undefined {
    return this.claims.get(id);
  }

  getManifest(id: string): Manifest | undefined {
    return this.manifests.get(id);
  }

  reset(): void {
    this.evidences.clear();
    this.claims.clear();
    this.manifests.clear();
    this.evidenceCounter = 1;
    this.claimCounter = 1;
  }

  private requireEvidence(id: string): Evidence {
    const evidence = this.evidences.get(id);
    if (!evidence) throw new Error(`evidence ${id} not found`);
    return evidence;
  }
}

export const ledger = new LedgerService();
