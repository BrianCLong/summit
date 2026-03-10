import type { SentinelConfig, Signal } from "../sentinels/signals.js";
import type { ImmuneDecision } from "./types.js";

/**
 * Aggregates sentinel signals into a single immune decision.
 * Strategy: take the maximum signal score as the aggregate (conservative).
 * Replace with a weighted sum or learned model if you have labelled data.
 */
function aggregateScore(signals: Signal[]): number {
  return signals.reduce((m, s) => Math.max(m, s.score), 0);
}

export function immuneGate(signals: Signal[], cfg: SentinelConfig): ImmuneDecision {
  const score = aggregateScore(signals);

  if (score >= cfg.quarantineScoreThreshold) {
    const missing: Array<{ code: string; message: string }> = [];
    if (signals.some((x) => x.code === "low_evidence_density")) {
      missing.push({
        code: "need_more_evidence",
        message: "Claim appears to have insufficient evidence links.",
      });
    }
    const rec: Array<{ hint: string; query?: string }> = [
      { hint: "Add independent corroboration (separate source + timestamp) and attach as evidence." },
    ];
    return { disposition: "quarantine", signals, missing_requirements: missing, recommended_next_evidence: rec };
  }

  if (score >= cfg.allowWithFlagsThreshold) {
    return { disposition: "allow_with_flags", flags: signals };
  }

  return { disposition: "allow" };
}
