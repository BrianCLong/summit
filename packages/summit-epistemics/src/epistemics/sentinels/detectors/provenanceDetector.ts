import type { Signal, SentinelConfig } from "../signals.js";
import type { WriteSetEnvelope } from "../../../writeset/types.js";

/**
 * Fires provenance_anomaly when any evidence node is missing one or more
 * required provenance fields (empty string counts as missing).
 */
export function provenanceDetector(ws: WriteSetEnvelope, cfg: SentinelConfig): Signal | null {
  const missing: Array<{ id: string; missing: string[] }> = [];

  for (const op of ws.ops) {
    if (op.op !== "upsert_node" || op.kind !== "evidence") continue;
    const prov = (op.data?.provenance ?? {}) as Record<string, unknown>;
    const miss = cfg.provenanceRequiredFields.filter(
      (k) => prov[k] == null || prov[k] === ""
    );
    if (miss.length) missing.push({ id: op.id, missing: miss });
  }

  if (!missing.length) return null;
  return { code: "provenance_anomaly", score: 0.9, detail: { missing } };
}
