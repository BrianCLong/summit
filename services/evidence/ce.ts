import crypto from 'crypto';
export function sha(s: Buffer | string) {
  return crypto.createHash('sha256').update(s).digest('hex');
}
export function merkleLeaves(obligations: any) {
  return Object.keys(obligations)
    .sort()
    .map((k) => ({ k, h: sha(JSON.stringify({ k, v: obligations[k] })) }));
}
export function root(leaves: { k: string; h: string }[]) {
  let layer = leaves.map((x) => x.h);
  while (layer.length > 1) {
    const next: string[] = [];
    for (let i = 0; i < layer.length; i += 2) {
      const a = layer[i],
        b = layer[i + 1] || a;
      next.push(sha(a + b));
    }
    layer = next;
  }
  return layer[0];
}
export function proof(idx: number, leaves: string[]) {
  const path: string[] = [];
  let i = idx,
    layer = leaves.slice();
  while (layer.length > 1) {
    const sib = i ^ 1;
    path.push(layer[sib] || layer[i]);
    const next: string[] = [];
    for (let j = 0; j < layer.length; j += 2) {
      next.push(sha((layer[j] || '') + (layer[j + 1] || layer[j] || '')));
    }
    layer = next;
    i = Math.floor(i / 2);
  }
  return path;
}
