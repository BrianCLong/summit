import assert from "node:assert/strict";

export function assertDeterministic(a, b) {
  assert.equal(a.context_digest, b.context_digest, "context_digest differs");
  assert.deepEqual(a, b, "compiled context differs");
}

export function scoreProvenance(retrieval) {
  // deterministic score: verified chain + corroboration
  const all = [...(retrieval.seeds ?? []), ...(retrieval.expanded ?? [])];
  let verified = 0, corroborated = 0;
  for (const e of all) {
    const v = e?.provenance?.verified_by_run_ids?.length ?? 0;
    const s = e?.provenance?.source_ids?.length ?? 0;
    if (v > 0) verified++;
    if (s >= 2) corroborated++;
  }
  return {
    verified_ratio: all.length ? verified / all.length : 0,
    corroborated_ratio: all.length ? corroborated / all.length : 0,
    score: verified * 2 + corroborated
  };
}

export function scoreCoverage(retrieval, truth) {
  if (!truth?.required_evidence_ids) return { enabled: false };
  const set = new Set([...(retrieval.seeds ?? []), ...(retrieval.expanded ?? [])].map(x => String(x.evidence_id)));
  const req = truth.required_evidence_ids.map(String);
  const hit = req.filter(id => set.has(id)).length;
  return { enabled: true, required: req.length, hit, coverage: req.length ? hit / req.length : 1 };
}
