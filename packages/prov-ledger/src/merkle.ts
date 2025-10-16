import { createHash } from 'crypto';
export function sha256Hex(buf: Buffer | string) {
  const h = createHash('sha256');
  h.update(buf);
  return h.digest('hex');
}

// Deterministic leaf encoding for a step
export function leafHash(step: any) {
  const s = JSON.stringify(step, Object.keys(step).sort());
  return sha256Hex(Buffer.from(s));
}

export function buildMerkle(leavesHex: string[]) {
  if (leavesHex.length === 0)
    return { root: sha256Hex(Buffer.from('EMPTY')), layers: [[]] };
  let layer = leavesHex.slice();
  const layers = [layer];
  while (layer.length > 1) {
    const next: string[] = [];
    for (let i = 0; i < layer.length; i += 2) {
      const a = layer[i];
      const b = i + 1 < layer.length ? layer[i + 1] : layer[i]; // duplicate last if odd
      next.push(sha256Hex(Buffer.from(a + b)));
    }
    layer = next;
    layers.push(layer);
  }
  return { root: layer[0], layers };
}

export function proofForLeaf(index: number, layers: string[][]) {
  const path: { dir: 'L' | 'R'; hash: string }[] = [];
  let idx = index;
  for (let L = 0; L < layers.length - 1; L++) {
    const layer = layers[L];
    const isRight = idx % 2 === 1;
    const siblingIdx = isRight
      ? idx - 1
      : idx + 1 >= layer.length
        ? idx
        : idx + 1;
    const dir = isRight ? 'L' : 'R';
    path.push({ dir, hash: layer[siblingIdx] });
    idx = Math.floor(idx / 2);
  }
  return path;
}

export function verifyProof(
  leaf: string,
  path: { dir: 'L' | 'R'; hash: string }[],
  expectedRoot: string,
) {
  let h = leaf;
  for (const p of path) {
    h =
      p.dir === 'L'
        ? sha256Hex(Buffer.from(p.hash + h))
        : sha256Hex(Buffer.from(h + p.hash));
  }
  return h === expectedRoot;
}
