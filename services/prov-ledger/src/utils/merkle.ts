import crypto from 'crypto';

export function merkleRoot(leaves: string[]): string {
  if (leaves.length === 0) {
    return '';
  }

  let level = [...leaves];

  while (level.length > 1) {
    const next: string[] = [];
    for (let i = 0; i < level.length; i += 2) {
      const left = level[i];
      const right = level[i + 1] ?? left; // duplicate last if odd count for deterministic root
      const combined = Buffer.concat([Buffer.from(left, 'hex'), Buffer.from(right, 'hex')]);
      next.push(crypto.createHash('sha256').update(combined).digest('hex'));
    }
    level = next;
  }

  return level[0];
}
