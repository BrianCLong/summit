import { MerkleNode } from "../interfaces.js";
export function computeSimilarityHash(tree: MerkleNode): string {
  const leaves: string[] = [];
  (function walk(n: MerkleNode) {
    if (!n.children || n.children.length === 0) { leaves.push(n.hash); return; }
    for (const c of n.children) walk(c);
  })(tree);
  leaves.sort();
  return `simhash_stub_${leaves.slice(0, 8).join("_")}`;
}
