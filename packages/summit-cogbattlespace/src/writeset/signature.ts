import crypto from "node:crypto";
import type { CogWriteSet } from "./types";

function canonicalize(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map(canonicalize).join(",")}]`;
  }

  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${canonicalize(obj[k])}`).join(",")}}`;
}

export function computeBatchSignature(input: Pick<
  CogWriteSet,
  "kind" | "version" | "origin" | "scope" | "ops"
>): string {
  const canonical = canonicalize({
    kind: input.kind,
    version: input.version,
    origin: input.origin,
    scope: input.scope ?? { allowDomains: ["NG", "BG"], denyDomains: ["RG"] },
    ops: input.ops
  });

  return crypto.createHash("sha256").update(canonical, "utf8").digest("hex");
}

export function verifyBatchSignature(ws: CogWriteSet): boolean {
  return computeBatchSignature(ws) === ws.batchSignature;
}
