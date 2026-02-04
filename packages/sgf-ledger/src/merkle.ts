import { createHash } from "crypto";

export function h(x: Buffer): Buffer {
  return createHash("sha256").update(x).digest();
}

export function merkleRoot(leaves: Buffer[]): Buffer {
  if (leaves.length === 0) return h(Buffer.from("EMPTY"));
  let level = leaves.map(h);
  while (level.length > 1) {
    const next: Buffer[] = [];
    for (let i = 0; i < level.length; i += 2) {
      const left = level[i];
      const right = i + 1 < level.length ? level[i + 1] : level[i]; // dup last
      next.push(h(Buffer.concat([left, right])));
    }
    level = next;
  }
  return level[0];
}
