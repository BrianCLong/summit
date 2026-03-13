import type { Signal } from "../signals";
import type { WriteSetEnvelope } from "../../../writeset/types";

export function coordinationDetector(ws: WriteSetEnvelope): Signal | null {
  // Demo heuristic: if meta.coordination_score exists, use it
  const s = Number((ws.meta as any)?.coordination_score ?? 0);
  if (!Number.isFinite(s) || s <= 0) return null;
  return { code: "coordination_fingerprint", score: Math.max(0, Math.min(1, s)), detail: { coordination_score: s } };
}
