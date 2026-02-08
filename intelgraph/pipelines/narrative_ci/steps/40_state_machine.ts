import { readJson, writeJsonDeterministic } from "../lib/io";
import { sha256Hex } from "../lib/hash";
import { stableStringify } from "../lib/json_stable";

type Snapshot = {
  run_id: string;
  narratives: { narrative_id: string; state: string; title: string }[];
};

type HandoffOut = { run_id: string; candidates: { narrative_id: string; score: number }[] };

export function main() {
  const cur = readJson<Snapshot>("fixtures/feb07_2026/current_snapshot.json");
  const handoff = readLatestHandoff(cur.run_id);

  const transitions: Array<Record<string, unknown>> = [];
  const handoffByNarr = new Map<string, number>();
  for (const candidate of handoff?.candidates ?? []) {
    handoffByNarr.set(
      candidate.narrative_id,
      Math.max(handoffByNarr.get(candidate.narrative_id) ?? 0, candidate.score),
    );
  }

  for (const narrative of cur.narratives) {
    const handoffScore = handoffByNarr.get(narrative.narrative_id) ?? 0;
    const from_state = narrative.state;
    let to_state = from_state;

    if (handoffScore >= 0.8) {
      to_state = "Institutionalized";
    } else if (handoffScore >= 0.6 && from_state === "Seeded") {
      to_state = "Contested";
    }

    if (to_state !== from_state) {
      transitions.push({
        narrative_id: narrative.narrative_id,
        title: narrative.title,
        from_state,
        to_state,
        trigger_scores: { handoff_score: handoffScore },
      });
    }
  }

  const outKey = sha256Hex(stableStringify({ run: cur.run_id, transitions }));
  writeJsonDeterministic(`out/state/${outKey}.json`, {
    version: 1,
    run_id: cur.run_id,
    transitions,
  });
}

function readLatestHandoff(run_id: string): HandoffOut {
  return { run_id, candidates: [] };
}

if (require.main === module) {
  main();
}
