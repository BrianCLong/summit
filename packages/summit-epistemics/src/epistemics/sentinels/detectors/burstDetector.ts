import type { Signal, SentinelConfig } from "../signals.js";
import type { WriteSetEnvelope } from "../../../writeset/types.js";

/**
 * Fires burst_velocity when meta.replication_count exceeds the configured threshold.
 * In production replace meta inspection with a time-series window query against your
 * event store (e.g. DuckDB tumbling-window aggregation).
 */
export function burstDetector(ws: WriteSetEnvelope, cfg: SentinelConfig): Signal | null {
  const rep = Number((ws.meta as Record<string, unknown> | undefined)?.replication_count ?? 0);
  if (!Number.isFinite(rep) || rep <= 0) return null;

  if (rep >= cfg.burstThreshold) {
    return {
      code: "burst_velocity",
      score: Math.min(1, rep / (cfg.burstThreshold * 2)),
      detail: { replication_count: rep },
    };
  }
  return null;
}
