import { MerkleTree } from 'merkletreejs';
import createKeccakHash from 'keccak';
import stringify from 'fast-json-stable-stringify';

export type EvidenceInput = {
  hash: string;
  metadata?: string | null;
  licenseTags?: string[];
  lineage?: Record<string, string>;
};

export type EvidenceRecord = EvidenceInput & { id: string; licenseTags: string[]; lineage: Record<string, string> };
export type ClaimRecord = { id: string; evidenceIds: string[]; statement: string; licenseTags: string[] };
export type ManifestRecord = {
  id: string;
  claimId: string;
  merkleRoot: string;
  createdAt: string;
  leaves: string[];
  licenseTags: string[];
  lineage: Record<string, string>;
  bundle: {
    claim: ClaimRecord;
    evidence: EvidenceRecord[];
  };
};

const hashLeaf = (value: string): Buffer => createKeccakHash('keccak256').update(value).digest();
const toHex = (buf: Buffer) => '0x' + buf.toString('hex');

export class Ledger {
  private evidences = new Map<string, EvidenceRecord>();
  private claims = new Map<string, ClaimRecord>();
  private manifests = new Map<string, ManifestRecord>();
  private evidenceCounter = 1;
  private claimCounter = 1;

  registerEvidence(input: EvidenceInput): EvidenceRecord {
    if (!input.hash) throw new Error('hash is required');
    const id = `e${this.evidenceCounter++}`;
    const licenseTags = input.licenseTags?.length ? Array.from(new Set(input.licenseTags)) : [];
    const lineage = input.lineage ?? {};
    const record: EvidenceRecord = { id, hash: input.hash, metadata: input.metadata ?? null, licenseTags, lineage };
    this.evidences.set(id, record);
    return record;
  }

  registerClaim(statement: string, evidenceIds: string[], licenseTags: string[] = []): ClaimRecord {
    if (!statement.trim()) throw new Error('statement is required');
    if (!evidenceIds.length) throw new Error('at least one evidenceId is required');
    evidenceIds.forEach((id) => {
      if (!this.evidences.has(id)) throw new Error(`evidence ${id} not found`);
    });
    const id = `c${this.claimCounter++}`;
    const record: ClaimRecord = { id, evidenceIds, statement, licenseTags: Array.from(new Set(licenseTags)) };
    this.claims.set(id, record);
    return record;
  }

  sealManifest(claimId: string): ManifestRecord {
    const claim = this.claims.get(claimId);
    if (!claim) throw new Error('claim not found');
    const evidence = claim.evidenceIds.map((id) => {
      const ev = this.evidences.get(id);
      if (!ev) throw new Error(`evidence ${id} missing`);
      return ev;
    });
    const leaves = evidence.map((ev) => stringify({ id: ev.id, hash: ev.hash, licenseTags: ev.licenseTags, lineage: ev.lineage }));
    const tree = new MerkleTree(leaves.map(hashLeaf), hashLeaf, { sortPairs: true });
    const merkleRoot = toHex(tree.getRoot());
    const manifest: ManifestRecord = {
      id: `m-${claim.id}`,
      claimId: claim.id,
      merkleRoot,
      createdAt: new Date().toISOString(),
      leaves,
      licenseTags: Array.from(new Set([...claim.licenseTags, ...evidence.flatMap((ev) => ev.licenseTags)])),
      lineage: evidence.reduce<Record<string, string>>((acc, ev) => ({ ...acc, ...ev.lineage }), {}),
      bundle: { claim, evidence },
    };
    this.manifests.set(manifest.id, manifest);
    return manifest;
  }

  getManifest(id: string): ManifestRecord | undefined {
    return this.manifests.get(id);
  }
}

export function verifyManifest(manifest: ManifestRecord): { valid: boolean; root: string } {
  const leaves = manifest.leaves.map(hashLeaf);
  const tree = new MerkleTree(leaves, hashLeaf, { sortPairs: true });
  const root = toHex(tree.getRoot());
  return { valid: root === manifest.merkleRoot, root };
}
