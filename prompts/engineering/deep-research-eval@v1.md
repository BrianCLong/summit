# Prompt: Deep Research Eval Harness (v1)

## Objective

Implement the Summit-native deep research evaluation harness with task packs, adaptive rubrics,
policy-aware fact checking, and evidence bundles. Align outputs to GA governance expectations and
produce deterministic artifacts suitable for CI gates.

## Scope

- packages/deep-research-eval/
- packages/cli/
- scripts/ci/
- docs/ga/
- docs/roadmap/STATUS.json
- agents/examples/
- AGENT_ACTIVITY.md
- TASK_BACKLOG.md
- agent-contract.json
- .github/workflows/

## Non-Negotiables

- Deterministic outputs (seeded run ids, stable JSON).
- Policy-aware retrieval with allow/deny enforcement.
- Evidence bundles include JSON, HTML, and manifest hash.
- Update GA verification map for new gate.

## Verification Expectations

- Unit tests for filters, rubric generation, and claim extraction.
- Snapshot or manifest validation for evidence bundles.
- CI wiring for advisory (PR) and strict (release) modes.

## Completion Criteria

- CLI command `summit eval deep-research` available.
- Evidence bundles emitted to `artifacts/deep-research-eval/`.
- GA documentation updated with the new gate.
