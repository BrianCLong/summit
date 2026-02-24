# Prompt: TTT-Discover Intake (v1)

## Goal

Implement the minimal TTT-Discover discovery runner scaffold for continuous-reward tasks with
Deterministic evidence artifacts, safety gates, and toy evaluator validation.

## Required Outputs

- Discovery runner module with entropic objective + PUCT selection.
- Toy continuous reward task and evaluator.
- Deterministic `report.json`, `metrics.json`, `stamp.json` in `runs/<run_id>/`.
- Determinism, budget, and allowlist tests.
- Updated `docs/roadmap/STATUS.json`.
- Updated `repo_assumptions.md` with verified vs assumed entries.
- Standard, security, and ops docs for TTT-Discover.

## Constraints

- Feature flag OFF by default.
- No network by default.
- Deterministic serialization (no timestamps).
- Follow Summit governance and evidence requirements.
