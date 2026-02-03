# Runbook: Graph+Vector Hybrid Retrieval

## Failure Modes

- Policy denies spike beyond baseline
- Evidence index drift detected
- Eval budget regression (latency, memory, runtime)

## Alerts (Spec)

- `policy_denies_rate` > threshold → review policy fixtures and tenant scope coverage
- `hybrid_eval_p95_ms` regression → verify eval harness determinism
- `evidence_index_drift` → re-run verifier and diff evidence index

## SLO Assumptions

- Deterministic evidence emission per bundle verification
- CI evaluation runtime within budget
