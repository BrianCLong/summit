import crypto from 'crypto';
import stringify from 'fast-json-stable-stringify';
import { MerkleTree } from 'merkletreejs';
import keccak from 'keccak';
import type { Evidence } from './store';

function leafHash(evidence: Evidence): Buffer {
  const payload = stringify({ id: evidence.id, hash: evidence.hash, metadata: evidence.metadata ?? null });
  return keccak('keccak256').update(payload).digest();
}

export function buildManifestRoot(claimId: string, evidence: Evidence[]): string {
  if (!evidence.length) {
    throw new Error('Manifest must contain at least one evidence item');
  }
  const sorted = [...evidence].sort((a, b) => a.id.localeCompare(b.id));
  const leaves = sorted.map(leafHash);
  const tree = new MerkleTree(leaves, (data: Buffer) => keccak('keccak256').update(data).digest(), {
    sortLeaves: true,
    sortPairs: true,
  });
  const root = tree.getRoot();
  const claimDigest = keccak('keccak256')
    .update(Buffer.concat([Buffer.from(claimId), root]))
    .digest('hex');
  return `0x${claimDigest}`;
}

export function verifyManifest(claimId: string, evidence: Evidence[], merkleRoot: string): boolean {
  return buildManifestRoot(claimId, evidence) === merkleRoot;
}

export function hashEvidencePayload(payload: Record<string, unknown>): string {
  const normalized = stringify(payload);
  return crypto.createHash('sha256').update(normalized).digest('hex');
}
