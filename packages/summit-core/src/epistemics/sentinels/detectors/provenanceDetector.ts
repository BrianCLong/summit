import type { Signal, SentinelConfig } from "../signals";
import type { WriteSetEnvelope } from "../../../writeset/types";

export function provenanceDetector(ws: WriteSetEnvelope, cfg: SentinelConfig): Signal | null {
  // Demo: look for any evidence node missing required provenance fields
  const missing: Array<{ id: string; missing: string[] }> = [];

  for (const op of ws.ops) {
    if (op.op !== "upsert_node" || op.kind !== "evidence") continue;
    const prov = (op.data as any)?.provenance ?? {};
    const miss = cfg.provenanceRequiredFields.filter((k) => prov?.[k] == null || prov?.[k] === "");
    if (miss.length) missing.push({ id: op.id, missing: miss });
  }

  if (!missing.length) return null;
  return { code: "provenance_anomaly", score: 0.9, detail: { missing } };
}
