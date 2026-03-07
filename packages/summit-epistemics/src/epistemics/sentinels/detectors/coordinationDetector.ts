import type { Signal } from "../signals.js";
import type { WriteSetEnvelope } from "../../../writeset/types.js";

/**
 * Fires coordination_fingerprint when meta.coordination_score is present.
 * In production this score would be computed by comparing source clusters,
 * shared phrasing, and timing fingerprints across the Narrative Graph.
 */
export function coordinationDetector(ws: WriteSetEnvelope): Signal | null {
  const s = Number(
    (ws.meta as Record<string, unknown> | undefined)?.coordination_score ?? 0
  );
  if (!Number.isFinite(s) || s <= 0) return null;
  return {
    code: "coordination_fingerprint",
    score: Math.max(0, Math.min(1, s)),
    detail: { coordination_score: s },
  };
}
