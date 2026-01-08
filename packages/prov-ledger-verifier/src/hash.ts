import { createHash } from "crypto";
import fs from "fs/promises";

export function sha256(input: Buffer | string): string {
  const hash = createHash("sha256");
  hash.update(input);
  return hash.digest("hex");
}

export async function sha256File(path: string): Promise<string> {
  const data = await fs.readFile(path);
  return sha256(data);
}

export function hashLeaf(id: string, contentHash: string): string {
  return sha256(`${id}:${contentHash}`);
}

export function buildMerkleRoot(leaves: string[]): { root: string; layers: string[][] } {
  if (leaves.length === 0) {
    return { root: "", layers: [[]] };
  }

  let layer = leaves.slice();
  const layers = [layer];

  while (layer.length > 1) {
    const next: string[] = [];
    for (let i = 0; i < layer.length; i += 2) {
      const left = layer[i]!;
      const right = layer[i + 1] ?? layer[i]!;
      next.push(sha256(left + right));
    }
    layer = next;
    layers.push(layer);
  }

  return { root: layer[0] ?? "", layers };
}
