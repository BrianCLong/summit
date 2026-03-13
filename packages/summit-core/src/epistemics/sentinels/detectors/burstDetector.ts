import type { Signal, SentinelConfig } from "../signals";
import type { WriteSetEnvelope } from "../../../writeset/types";

export function burstDetector(ws: WriteSetEnvelope, cfg: SentinelConfig): Signal | null {
  // Demo heuristic: if writeset declares meta.replication_count and it exceeds threshold => burst
  const rep = Number((ws.meta as any)?.replication_count ?? 0);
  if (!Number.isFinite(rep) || rep <= 0) return null;

  if (rep >= cfg.burstThreshold) {
    return { code: "burst_velocity", score: Math.min(1, rep / (cfg.burstThreshold * 2)), detail: { replication_count: rep } };
  }
  return null;
}
