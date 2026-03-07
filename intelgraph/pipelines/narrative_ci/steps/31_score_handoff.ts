import { readConfig, readJson, writeJsonDeterministic } from "../lib/io";
import { sha256Hex } from "../lib/hash";
import { stableStringify } from "../lib/json_stable";

type Artifact = { artifact_id: string; outlet_tier: string; uri: string; outlet: string };

type Snapshot = {
  version: number;
  run_id: string;
  narratives: { narrative_id: string; title: string; state: string }[];
  claims: {
    claim_id: string;
    claim_hash: string;
    text_norm: string;
    supporting_artifact_ids: string[];
  }[];
};

type TiersCfg = {
  tiers: Record<string, { rank: number }>;
  allowed_tier_labels: string[];
};

type LexCfg = {
  register_markers: { hedging: string[]; legalistic: string[] };
};

function countMarkers(text: string, markers: string[]): number {
  const t = text.toLowerCase();
  let count = 0;
  for (const marker of markers) {
    if (t.includes(marker.toLowerCase())) {
      count += 1;
    }
  }
  return count;
}

export function main() {
  const artifacts = readJson<{ artifacts: Artifact[] }>(
    "fixtures/feb07_2026/artifact_index.json",
  ).artifacts;
  const tiers = readConfig<TiersCfg>("intelgraph/pipelines/narrative_ci/config/tiers.yml");
  const lex = readConfig<LexCfg>("intelgraph/pipelines/narrative_ci/config/lexicons.yml");
  const cur = readJson<Snapshot>("fixtures/feb07_2026/current_snapshot.json");

  const artById = new Map(artifacts.map((a) => [a.artifact_id, a]));
  const allowed = new Set(tiers.allowed_tier_labels ?? []);
  const rank = (tier: string) => tiers.tiers?.[tier]?.rank ?? 0;

  const candidates: Array<Record<string, unknown>> = [];

  for (const clm of cur.claims) {
    const arts = (clm.supporting_artifact_ids || [])
      .map((id) => artById.get(id))
      .filter(Boolean) as Artifact[];
    if (!arts.length) continue;

    const maxTier = arts
      .map((a) => a.outlet_tier)
      .sort((a, b) => rank(b) - rank(a))[0];
    if (!allowed.has(maxTier)) continue;

    const tierJumpScore = Math.min(1, (rank(maxTier) - rank("fringe")) / 50);

    const hedging = countMarkers(clm.text_norm, lex.register_markers?.hedging ?? []);
    const legalistic = countMarkers(clm.text_norm, lex.register_markers?.legalistic ?? []);
    const registerShiftScore = Math.min(1, (hedging + legalistic) / 6);

    const citationCircularityScore = 0;

    const score = Math.max(
      0,
      Math.min(1, 0.45 * tierJumpScore + 0.35 * registerShiftScore + 0.2 * citationCircularityScore),
    );

    candidates.push({
      handoff_id: `handoff_${sha256Hex(`${clm.claim_hash}:${maxTier}`).slice(0, 16)}`,
      narrative_id: inferNarrativeId(clm.claim_id),
      from_tier: "fringe",
      to_tier: maxTier,
      score,
      supporting_artifacts: arts.map((a) => ({
        artifact_id: a.artifact_id,
        uri: a.uri,
        outlet: a.outlet,
        outlet_tier: a.outlet_tier,
      })),
      features: { tierJumpScore, registerShiftScore, citationCircularityScore },
    });
  }

  const outKey = sha256Hex(stableStringify({ run: cur.run_id, candidates, cfg: "tiers+lex_v1" }));
  writeJsonDeterministic(`out/handoff/${outKey}.json`, {
    version: 1,
    run_id: cur.run_id,
    candidates,
  });
}

function inferNarrativeId(claimId: string): string {
  if (claimId.includes("shadow")) return "narr_shadow_campaigns";
  if (claimId.includes("signal")) return "narr_signal_phishing";
  return "narr_alekseyev_hit";
}

if (require.main === module) {
  main();
}
