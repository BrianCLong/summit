// @ts-nocheck
import { randomUUID } from 'crypto';
import { canonicalStringify, hmacSha256, sha256 } from './canonical.js';
import { buildMerkleTree, MerkleLeaf, MerkleTree } from './merkle.js';

export interface EvidenceInput {
  content: Buffer | string | Record<string, unknown>;
  mediaType?: string;
  attributes?: Record<string, unknown>;
}

export interface EvidenceRecord {
  id: string;
  contentHash: string;
  recordHash: string;
  mediaType?: string;
  attributes?: Record<string, unknown>;
  receivedAt: string;
  signature: string;
  prevHash: string;
}

export interface ClaimInput {
  evidenceIds: string[];
  assertion: Record<string, unknown>;
  actor?: string;
}

export interface ClaimRecord {
  id: string;
  assertionHash: string;
  recordHash: string;
  evidenceIds: string[];
  actor?: string;
  issuedAt: string;
  signature: string;
  prevHash: string;
}

export interface EdgeRecord {
  id: string;
  from: string;
  to: string;
  kind: string;
  createdAt: string;
  recordHash: string;
  signature: string;
  prevHash: string;
}

export interface LedgerEntry {
  index: number;
  type: 'evidence' | 'claim' | 'edge';
  hash: string;
  prevHash: string;
  signature: string;
  timestamp: string;
  payload: EvidenceRecord | ClaimRecord | EdgeRecord;
}

export interface Manifest {
  schemaVersion: string;
  claimId: string;
  merkleRoot: string;
  tree: MerkleTree;
  adjacency: { from: string; to: string; kind: string; signature: string; prevHash?: string; recordHash?: string }[];
  leaves: MerkleLeaf[];
  manifestSignature: string;
  generatedAt: string;
}

export interface VerificationResult {
  valid: boolean;
  reasons: string[];
}

export class AppendOnlyLedger {
  private readonly log: LedgerEntry[] = [];
  private readonly evidenceMap = new Map<string, EvidenceRecord>();
  private readonly claimMap = new Map<string, ClaimRecord>();
  private readonly edges: EdgeRecord[] = [];
  private readonly secret: string;

  constructor(secret = process.env.LEDGER_SECRET || 'prov-ledger-secret') {
    this.secret = secret;
  }

  private currentTailHash(): string {
    return this.log.length ? this.log[this.log.length - 1]!.hash : '';
  }

  private append<T extends EvidenceRecord | ClaimRecord | EdgeRecord>(type: LedgerEntry['type'], payload: T): LedgerEntry {
    const prevHash = this.currentTailHash();
    const hash = sha256({ prevHash, payload });
    const signature = hmacSha256(this.secret, { hash, prevHash });
    const entry: LedgerEntry = {
      index: this.log.length,
      type,
      hash,
      prevHash,
      signature,
      timestamp: new Date().toISOString(),
      payload,
    };
    this.log.push(entry);
    return entry;
  }

  addEvidence(input: EvidenceInput): EvidenceRecord {
    const contentHash = sha256(input.content);
    const id = `evidence_${randomUUID()}`;
    const receivedAt = new Date().toISOString();
    const record: EvidenceRecord = {
      id,
      contentHash,
      recordHash: '',
      mediaType: input.mediaType,
      attributes: input.attributes,
      receivedAt,
      signature: '',
      prevHash: this.currentTailHash(),
    };
    const recordHash = sha256({ id, contentHash, mediaType: input.mediaType, attributes: input.attributes, receivedAt });
    record.recordHash = recordHash;
    record.signature = hmacSha256(this.secret, { hash: recordHash, prevHash: record.prevHash });
    this.append('evidence', record);
    this.evidenceMap.set(id, record);
    return record;
  }

  addClaim(input: ClaimInput): ClaimRecord {
    for (const id of input.evidenceIds) {
      if (!this.evidenceMap.has(id)) {
        throw new Error(`Unknown evidence id ${id}`);
      }
    }

    const id = `claim_${randomUUID()}`;
    const issuedAt = new Date().toISOString();
    const assertionHash = sha256(input.assertion);
    const claim: ClaimRecord = {
      id,
      assertionHash,
      recordHash: '',
      evidenceIds: [...input.evidenceIds],
      actor: input.actor,
      issuedAt,
      signature: '',
      prevHash: this.currentTailHash(),
    };
    const claimHash = sha256({ id, assertionHash, evidenceIds: claim.evidenceIds, actor: claim.actor, issuedAt });
    claim.recordHash = claimHash;
    claim.signature = hmacSha256(this.secret, { hash: claimHash, prevHash: claim.prevHash });
    this.append('claim', claim);
    this.claimMap.set(id, claim);

    // link edges evidence -> claim
    for (const evidenceId of claim.evidenceIds) {
      const edgeId = `edge_${randomUUID()}`;
      const createdAt = new Date().toISOString();
      const edge: EdgeRecord = {
        id: edgeId,
        from: evidenceId,
        to: id,
        kind: 'supports',
        createdAt,
        recordHash: '',
        signature: '',
        prevHash: this.currentTailHash(),
      };
      const edgeHash = sha256({ id: edgeId, from: evidenceId, to: id, kind: edge.kind, createdAt });
      edge.recordHash = edgeHash;
      edge.signature = hmacSha256(this.secret, { hash: edgeHash, prevHash: edge.prevHash });
      this.append('edge', edge);
      this.edges.push(edge);
    }

    return claim;
  }

  getManifest(claimId: string): Manifest {
    const claim = this.claimMap.get(claimId);
    if (!claim) {
      throw new Error('Claim not found');
    }

    const evidence = claim.evidenceIds.map((id) => this.evidenceMap.get(id)).filter(Boolean) as EvidenceRecord[];
    const adjacency = this.edges
      .filter((edge) => edge.to === claimId)
      .map((edge) => ({ from: edge.from, to: edge.to, kind: edge.kind, signature: edge.signature, prevHash: edge.prevHash, recordHash: edge.recordHash }));

    const leaves: MerkleLeaf[] = [
      ...evidence.map((ev) => ({ id: ev.id, type: 'evidence', hash: ev.recordHash, signature: ev.signature, prevHash: ev.prevHash })),
      { id: claim.id, type: 'claim', hash: claim.recordHash, signature: claim.signature, prevHash: claim.prevHash },
      ...adjacency.map((edge) => ({ id: `${edge.from}->${edge.to}`, type: 'edge', hash: edge.recordHash || '', signature: edge.signature, prevHash: edge.prevHash })),
    ];

    const tree = buildMerkleTree(leaves);
    const manifestSignature = hmacSha256(this.secret, { root: tree.root, claimId });

    return {
      schemaVersion: '1.0',
      claimId,
      merkleRoot: tree.root,
      tree,
      adjacency,
      leaves,
      manifestSignature,
      generatedAt: new Date().toISOString(),
    };
  }

  verifyManifest(manifest: Manifest): VerificationResult {
    const reasons: string[] = [];

    // recompute root
    const recomputed = buildMerkleTree(manifest.leaves);
    if (recomputed.root !== manifest.merkleRoot) {
      reasons.push('merkle root mismatch');
    }

    // check signatures per leaf
    for (const leaf of manifest.leaves) {
      const derivedSignature = hmacSha256(this.secret, { hash: leaf.hash, prevHash: leaf.prevHash || '' });
      if (leaf.signature && leaf.signature !== derivedSignature) {
        reasons.push(`signature mismatch for ${leaf.type}:${leaf.id}`);
      }
    }

    // manifest signature validation
    const expectedManifestSignature = hmacSha256(this.secret, { root: manifest.merkleRoot, claimId: manifest.claimId });
    if (manifest.manifestSignature !== expectedManifestSignature) {
      reasons.push('manifest signature invalid');
    }

    // adjacency validation
    const leafIds = new Set(manifest.leaves.map((l) => l.id));
    for (const edge of manifest.adjacency) {
      if (!leafIds.has(edge.from)) {
        reasons.push(`missing source leaf for ${edge.from}`);
      }
      if (!leafIds.has(edge.to)) {
        reasons.push(`missing target leaf for ${edge.to}`);
      }
      const expectedEdgeSignature = hmacSha256(this.secret, {
        hash: edge.recordHash || sha256({ from: edge.from, to: edge.to, kind: edge.kind }),
        prevHash: edge.prevHash || '',
      });
      if (edge.signature && edge.signature !== expectedEdgeSignature) {
        reasons.push(`edge signature mismatch ${edge.from}->${edge.to}`);
      }
    }

    return {
      valid: reasons.length === 0,
      reasons,
    };
  }

  exportManifest(claimId: string): { manifest: Manifest; serialized: string } {
    const manifest = this.getManifest(claimId);
    return { manifest, serialized: canonicalStringify(manifest) };
  }

  getLog(): LedgerEntry[] {
    return [...this.log];
  }
}

export const ledger = new AppendOnlyLedger();
