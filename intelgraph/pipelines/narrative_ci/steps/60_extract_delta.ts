import { readJson, writeJsonDeterministic } from "../lib/io";
import { sha256Hex } from "../lib/hash";
import { stableStringify } from "../lib/json_stable";

type Snapshot = {
  run_id: string;
  narratives: { narrative_id: string; state: string }[];
  claims: { claim_id: string; claim_hash: string }[];
};

export function main() {
  const prev = readJson<Snapshot>("fixtures/feb07_2026/previous_snapshot.json");
  const cur = readJson<Snapshot>("fixtures/feb07_2026/current_snapshot.json");

  const prevClaims = new Map(prev.claims.map((c) => [c.claim_hash, c]));
  const curClaims = new Map(cur.claims.map((c) => [c.claim_hash, c]));

  const new_claims = [...curClaims.keys()].filter((hash) => !prevClaims.has(hash));
  const removed_claims = [...prevClaims.keys()].filter((hash) => !curClaims.has(hash));
  const updated_claims: string[] = [];

  const prevNarr = new Map(prev.narratives.map((n) => [n.narrative_id, n.state]));
  const state_transitions = cur.narratives
    .filter((n) => (prevNarr.get(n.narrative_id) ?? null) !== n.state)
    .map((n) => ({
      narrative_id: n.narrative_id,
      from_state: prevNarr.get(n.narrative_id) ?? null,
      to_state: n.state,
    }));

  const payload = {
    version: 1,
    prev_run_id: prev.run_id,
    cur_run_id: cur.run_id,
    new_claims,
    removed_claims,
    updated_claims,
    state_transitions,
  };

  const outKey = sha256Hex(stableStringify(payload));
  writeJsonDeterministic(`out/delta/${outKey}.json`, payload);
}

if (require.main === module) {
  main();
}
