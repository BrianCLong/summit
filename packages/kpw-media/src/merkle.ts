import { createHash } from 'crypto';

export function sha256Hex(buf: Buffer | string) {
  const h = createHash('sha256'); h.update(buf); return h.digest('hex');
}

export function leafHash(step: any) {
  const s = JSON.stringify(step, Object.keys(step).sort());
  return sha256Hex(Buffer.from(s));
}

export function buildMerkle(leavesHex: string[]) {
  if (leavesHex.length === 0) return { root: sha256Hex('EMPTY'), layers: [ [] as string[] ] };
  let layer = leavesHex.slice();
  const layers: string[][] = [layer];
  while (layer.length > 1) {
    const next: string[] = [];
    for (let i = 0; i < layer.length; i += 2) {
      const a = layer[i];
      const b = i + 1 < layer.length ? layer[i + 1] : layer[i];
      next.push(sha256Hex(a + b));
    }
    layer = next; layers.push(layer);
  }
  return { root: layer[0], layers };
}

export function proofForLeaf(index: number, layers: string[][]) {
  const path: { dir: 'L' | 'R'; hash: string }[] = [];
  let idx = index;
  for (let L = 0; L < layers.length - 1; L++) {
    const layer = layers[L];
    const right = idx % 2 === 1;
    const sibIdx = right ? idx - 1 : (idx + 1 >= layer.length ? idx : idx + 1);
    path.push({ dir: right ? 'L' : 'R', hash: layer[sibIdx] });
    idx = Math.floor(idx / 2);
  }
  return path;
}

export function verifyProof(leaf: string, path: { dir: 'L' | 'R'; hash: string }[], root: string) {
  let acc = leaf;
  for (const p of path) {
    acc = p.dir === 'L' ? sha256Hex(p.hash + acc) : sha256Hex(acc + p.hash);
  }
  return acc === root;
}