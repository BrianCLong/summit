import crypto from "node:crypto";
import type { CogWriteOp } from "./types";

function canonicalize(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(",")}]`;

  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${canonicalize(obj[k])}`).join(",")}}`;
}

function sha256(input: string): string {
  return crypto.createHash("sha256").update(input, "utf8").digest("hex");
}

export function computeOpIdempotencyKey(op: CogWriteOp): string {
  if (op.hints?.idempotencyKey) return op.hints.idempotencyKey;
  return sha256(
    canonicalize({
      domain: op.domain,
      entityType: op.entityType,
      action: op.action,
      payload: op.payload
    })
  );
}

export function computeEntityFingerprint(op: CogWriteOp): string {
  const p = op.payload as Record<string, unknown>;

  switch (op.entityType) {
    case "Artifact":
      return sha256(
        canonicalize({
          entityType: op.entityType,
          domain: op.domain,
          kind: p.kind,
          source: p.source,
          text: (p.content as any)?.text ?? null,
          observedAt: p.observedAt ?? null
        })
      );
    case "Narrative":
      return sha256(
        canonicalize({
          entityType: op.entityType,
          domain: op.domain,
          label: p.label,
          summary: p.summary,
          variants: p.variants,
          frames: p.frames,
          rhetoricalMoves: p.rhetoricalMoves
        })
      );
    case "Belief":
      return sha256(
        canonicalize({
          entityType: op.entityType,
          domain: op.domain,
          proposition: p.proposition,
          polarity: p.polarity,
          timeSeries: p.timeSeries
        })
      );
    default:
      return sha256(
        canonicalize({
          entityType: op.entityType,
          domain: op.domain,
          payload: p
        })
      );
  }
}
