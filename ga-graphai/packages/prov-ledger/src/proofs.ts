import { createHash } from 'node:crypto';
import { stableHash } from '@ga-graphai/data-integrity';
import type { EvidenceAtomProof, LedgerEntry } from 'common-types';

export interface MerklePathNode {
  position: 'left' | 'right';
  hash: string;
}

function computeLeaf(entry: LedgerEntry): string {
  return createHash('sha256')
    .update(stableHash({ id: entry.id, hash: entry.hash, prev: entry.previousHash }))
    .digest('hex');
}

function pairHash(left: string, right: string): string {
  return createHash('sha256').update(left + right).digest('hex');
}

export function buildMerkleTree(entries: readonly LedgerEntry[]): {
  root: string;
  leaves: string[];
  proofs: MerklePathNode[][];
} {
  if (entries.length === 0) {
    return { root: '', leaves: [], proofs: [] };
  }
  const leaves = entries.map(computeLeaf);
  const proofs: MerklePathNode[][] = entries.map(() => []);
  let layer = [...leaves];
  while (layer.length > 1) {
    const next: string[] = [];
    for (let i = 0; i < layer.length; i += 2) {
      const left = layer[i];
      const right = layer[i + 1] ?? left;
      next.push(pairHash(left, right));
      const rightIndex = Math.min(i + 1, layer.length - 1);
      if (i < proofs.length) {
        proofs[i].push({ position: 'right', hash: right });
      }
      if (rightIndex < proofs.length && rightIndex !== i) {
        proofs[rightIndex].push({ position: 'left', hash: left });
      }
    }
    layer = next;
  }
  return { root: layer[0], leaves, proofs };
}

export function verifyMerkleProof(leaf: string, root: string, proof: MerklePathNode[]): boolean {
  if (!root) return false;
  let hash = leaf;
  for (const node of proof) {
    hash = node.position === 'left' ? pairHash(node.hash, hash) : pairHash(hash, node.hash);
  }
  return hash === root;
}

export function mapEntriesToAtoms(
  entries: readonly LedgerEntry[],
  proofs: MerklePathNode[][],
): EvidenceAtomProof[] {
  return entries.map((entry, index) => ({
    eaId: entry.id,
    contentPtr: entry.resource,
    displayBytes: JSON.stringify(entry.payload),
    contentHash: entry.hash,
    metaHash: createHash('sha256')
      .update(stableHash({ actor: entry.actor, action: entry.action, category: entry.category }))
      .digest('hex'),
    inclusionProof: proofs[index]?.map((node) => `${node.position}:${node.hash}`),
    leafHash: proofs[index] ? computeLeaf(entry) : undefined,
  }));
}
