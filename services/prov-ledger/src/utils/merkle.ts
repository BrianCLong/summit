import { calculateHash } from './hash.js';

export function buildMerkleRoot(hashes: string[]): string {
  if (hashes.length === 0) {
    return calculateHash('empty');
  }

  let level = [...hashes];

  while (level.length > 1) {
    const next: string[] = [];
    for (let i = 0; i < level.length; i += 2) {
      const left = level[i];
      const right = level[i + 1] ?? left;
      next.push(calculateHash(`${left}:${right}`));
    }
    level = next;
  }

  return level[0];
}
