# DeR2 Sandbox Standard (Summit)

## Scope

This standard defines Summit’s DeR2-style sandbox benchmark for controlled, reproducible evaluation
that decouples retrieval from reasoning. It aligns with the Summit Readiness Assertion and applies
to all DeR2 benchmark runs, artifacts, and adapters.

## Regime Matrix

| Regime | Evidence Access | Purpose |
| --- | --- | --- |
| Instruction-only | None | Baseline parametric reasoning without evidence |
| Concepts | Expert concepts only | Concept-reasoning isolation |
| Related-only | Related documents only | Evidence grounding without distractors |
| Full-set | Related + distractors | Retrieval + reasoning stress test |

## Import / Export Matrix

### Import

- `frozen_library_dir/` (documents + metadata)
- `tasks.jsonl` (task prompts/questions)
- `concepts.jsonl` (gold concepts for Concepts regime)

### Export

- `report.json` (per-instance traces, evidence IDs)
- `metrics.json` (aggregate regime gaps, pass@k, attribution)
- `stamp.json` (hash-only run stamp, no timestamps)
- `error_attribution.json` (fragility + concept misuse flags)

## Non-goals

- No online retrieval; only frozen libraries.
- No full retriever implementation; Summit injects document selections for regimes.
- No dataset content copying without a verified, compatible license.

## Determinism Requirements

- Deterministic RNG seed derived from `bench_id` + instance id.
- Stable JSON ordering for artifacts.
- Hash-only stamps with no timestamps.

## Claims Alignment

- Regime-based evaluation that separates evidence access from reasoning.
- Reproducible runs using frozen corpora and deterministic outputs.

## Governance Notes

- All DeR2 artifacts must use the same definitions and authority files.
- Exceptions must be recorded as Governed Exceptions.
