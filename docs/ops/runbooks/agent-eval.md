# Agent Evaluation Runbook

## Scope

Operational triage for the AI coding agent trust-boundary gate.

## Artifact Contract

- `report.json`
- `metrics.json`
- `stamp.json`
- Schema: `evidence/agent_output.schema.json`

## Failure Triage

1. Confirm all three artifacts exist.
2. Confirm `evidence_id` is present and identical in report/metrics/stamp.
3. Recompute artifact SHA-256 and compare with `input_hash`.
4. Recompute output hash payload and compare with `output_hash`.
5. If `status=fail`, inspect `nondeterministic_markers` and patch the source artifact.

## False Positive Override

- Temporary path: set `SUMMIT_AGENT_GATES=false` for observe-only mode.
- Required follow-up:
  - Open a governed exception entry with evidence hash and rollback date.
  - Keep CI artifacts attached to the exception issue.

## Rollback

1. Set `SUMMIT_AGENT_GATES=false`.
2. Re-run trust gate in observe mode and verify no merge-blocking failures.
3. Revert only the latest trust-boundary change set if failures persist.

## Post-Incident Checks

- Run `pytest tests/test_agent_eval_determinism.py tests/test_perf_budget.py`.
- Run `python scripts/ci/verify_agent_trust.py ...` against regenerated artifacts.
- Run weekly drift check: `python scripts/monitoring/agent-drift.py`.

