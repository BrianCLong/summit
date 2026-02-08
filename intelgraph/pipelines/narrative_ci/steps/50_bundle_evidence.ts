import { readJson, writeJsonDeterministic, writeStampJson } from "../lib/io";
import { sha256Hex } from "../lib/hash";

type EvidenceIndex = { version: number; evidence: Record<string, { files: string[] }> };

function addEvidence(index: EvidenceIndex, id: string, files: string[]) {
  index.evidence[id] = { files: [...files].sort() };
}

export function main() {
  const itemSlug = "SITUPDATE-2026-02-07";

  const idxPath = "evidence/index.json";
  const idx = readJson<EvidenceIndex>(idxPath);

  const evDelta = `EVD-${itemSlug}-DELTA-001`;
  const evHandoff = `EVD-${itemSlug}-HANDOFF-001`;
  const evState = `EVD-${itemSlug}-STATE-001`;
  const evGates = `EVD-${itemSlug}-GATES-001`;

  const base = (id: string) => `evidence/${id}`;

  for (const id of [evDelta, evHandoff, evState, evGates]) {
    writeJsonDeterministic(`${base(id)}/report.json`, {
      evidence_id: id,
      subject: { type: "narrative_ci_fixture", name: itemSlug },
      result: "pass",
      artifacts: [],
    });

    writeJsonDeterministic(`${base(id)}/metrics.json`, {
      evidence_id: id,
      metrics: { fixture: true },
    });

    writeStampJson(`${base(id)}/stamp.json`);
  }

  addEvidence(idx, evDelta, [
    `${base(evDelta)}/report.json`,
    `${base(evDelta)}/metrics.json`,
    `${base(evDelta)}/stamp.json`,
  ]);
  addEvidence(idx, evHandoff, [
    `${base(evHandoff)}/report.json`,
    `${base(evHandoff)}/metrics.json`,
    `${base(evHandoff)}/stamp.json`,
  ]);
  addEvidence(idx, evState, [
    `${base(evState)}/report.json`,
    `${base(evState)}/metrics.json`,
    `${base(evState)}/stamp.json`,
  ]);
  addEvidence(idx, evGates, [
    `${base(evGates)}/report.json`,
    `${base(evGates)}/metrics.json`,
    `${base(evGates)}/stamp.json`,
  ]);

  writeJsonDeterministic(idxPath, idx);

  const runKey = sha256Hex(itemSlug).slice(0, 12);
  writeJsonDeterministic(`out/run_manifest/${runKey}.json`, {
    version: 1,
    item: itemSlug,
    evidence_ids: [evDelta, evHandoff, evState, evGates],
  });
}

if (require.main === module) {
  main();
}
