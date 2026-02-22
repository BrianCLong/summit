// @ts-nocheck
import { sha256, canonicalStringify } from './canonical.js';

export interface MerkleLeaf {
  id: string;
  type: string;
  hash: string;
  signature?: string;
  prevHash?: string;
}

export interface MerkleTree {
  root: string;
  layers: string[][];
  leaves: MerkleLeaf[];
}

export function buildMerkleTree(leaves: MerkleLeaf[]): MerkleTree {
  const sortedLeaves = [...leaves].sort((a, b) => `${a.type}:${a.id}`.localeCompare(`${b.type}:${b.id}`));
  const initialLayer = sortedLeaves.map((leaf) => sha256(`${leaf.type}:${leaf.id}:${leaf.hash}`));
  const layers: string[][] = [initialLayer];

  let current = initialLayer;
  while (current.length > 1) {
    const next: string[] = [];
    for (let i = 0; i < current.length; i += 2) {
      const left = current[i];
      const right = i + 1 < current.length ? current[i + 1] : left;
      next.push(sha256(`${left}|${right}`));
    }
    layers.push(next);
    current = next;
  }

  return {
    root: current[0] || sha256(''),
    layers,
    leaves: sortedLeaves,
  };
}

export function renderTree(tree: MerkleTree): string {
  return canonicalStringify({
    root: tree.root,
    layers: tree.layers,
    leaves: tree.leaves.map((leaf) => ({ id: leaf.id, type: leaf.type, hash: leaf.hash })),
  });
}
