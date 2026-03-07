import crypto from "node:crypto";

export function stableId(prefix: string, seed: string): string {
  const h = crypto.createHash("sha256").update(`${prefix}:${seed}`).digest("hex").slice(0, 24);
  return `${prefix}_${h}`;
}
