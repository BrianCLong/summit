import crypto from 'crypto';

export interface MerkleTree {
  root: string;
  levels: string[][];
}

export function buildMerkleTree(leaves: string[]): MerkleTree {
  if (leaves.length === 0) {
    return { root: '', levels: [] };
  }

  let level = [...leaves];
  const levels: string[][] = [level];

  while (level.length > 1) {
    const nextLevel: string[] = [];
    for (let i = 0; i < level.length; i += 2) {
      const left = level[i];
      const right = level[i + 1] ?? left;
      nextLevel.push(crypto.createHash('sha256').update(left + right).digest('hex'));
    }
    levels.push(nextLevel);
    level = nextLevel;
  }

  return { root: level[0], levels };
}

export function verifyMerkleRoot(leaves: string[], expectedRoot: string): boolean {
  const tree = buildMerkleTree(leaves);
  return tree.root === expectedRoot;
}

