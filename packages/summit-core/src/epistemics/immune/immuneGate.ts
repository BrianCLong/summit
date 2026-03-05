import type { SentinelConfig, Signal } from "../sentinels/signals";
import type { ImmuneDecision } from "./types";

function score(signals: Signal[]): number {
  // Simple max-score gating; you can replace with learned/rule-based aggregation later
  return signals.reduce((m, s) => Math.max(m, s.score), 0);
}

export function immuneGate(signals: Signal[], cfg: SentinelConfig): ImmuneDecision {
  const s = score(signals);

  if (s >= cfg.quarantineScoreThreshold) {
    const missing = signals.some(x => x.code === "low_evidence_density")
      ? [{ code: "need_more_evidence", message: "Claim appears to have insufficient evidence links." }]
      : [];
    const rec = [{ hint: "Add independent corroboration (separate source + timestamp) and attach as evidence." }];

    return { disposition: "quarantine", signals, missing_requirements: missing, recommended_next_evidence: rec };
  }

  if (s >= cfg.allowWithFlagsThreshold) {
    return { disposition: "allow_with_flags", flags: signals };
  }

  return { disposition: "allow" };
}
