import { readJson, writeJsonDeterministic } from "../lib/io";
import { sha256Hex } from "../lib/hash";
import { stableStringify } from "../lib/json_stable";

type HandoffCandidate = { narrative_id: string; to_tier: string; score: number };

type HandoffOut = { run_id: string; candidates: HandoffCandidate[] };

export function main() {
  const cur = readJson<{ run_id: string }>("fixtures/feb07_2026/current_snapshot.json");
  const handoff: HandoffOut = { run_id: cur.run_id, candidates: [] };

  const indicators: Array<Record<string, unknown>> = [];

  for (const candidate of handoff.candidates) {
    if (candidate.score >= 0.7) {
      indicators.push({
        indicator_id: `ew_${sha256Hex(`${candidate.narrative_id}:${candidate.to_tier}`).slice(0, 12)}`,
        narrative_id: candidate.narrative_id,
        kind: "tier_handoff_watch",
        severity: candidate.score >= 0.85 ? "high" : "medium",
        rationale:
          "Handoff score exceeded threshold; monitor for institutional uptake and policy discussion artifacts.",
      });
    }
  }

  const outKey = sha256Hex(stableStringify({ run: cur.run_id, indicators }));
  writeJsonDeterministic(`out/early_warning/${outKey}.json`, {
    version: 1,
    run_id: cur.run_id,
    indicators,
  });
}

if (require.main === module) {
  main();
}
