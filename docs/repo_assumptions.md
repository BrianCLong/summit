# Security Debt Ledger Repo Reality Check

## Validated Structure
- CLI surface exists via Python module execution: `python -m summit`.
- Security CI assets live under `summit/ci/` and `.github/workflows/`.
- Existing deterministic evidence conventions (`report.json`, `metrics.json`, `stamp.json`) already exist in-repo.

## Mapping Decisions
- `core/security_debt` assumption mapped to `summit/security_debt`.
- `ci/gates/security_debt.yml` mapped to `summit/ci/gates/security_debt.yml`.
- Drift monitor path kept as `scripts/monitoring/security-debt-drift.py`.

## Confirmed Constraints
- `docs/roadmap/STATUS.json` is present and must be updated with implementation work.
- GitHub Actions is available and appropriate for CI gate wiring.
- Repository already contains policy gate patterns (`summit/policy/gates`, `summit/ci/verify_*.py`) suitable for extension.

## Must-Not-Touch Notes
- No edits were made to shared CLI bootstrap in `tools/summitctl`.
- No edits were made to parser internals or core server bootstrap paths.

---

# Agent Eval Trust Boundary Repo Reality Check

## Verified

- `summit/` is an existing Python package root and supports new submodules.
- Deterministic evidence triad conventions already exist: `report.json`, `metrics.json`, `stamp.json`.
- CI workflows are managed under `.github/workflows/` with Python-based gates already in use.
- `docs/roadmap/STATUS.json` exists and is the expected roadmap status ledger.

## Assumed

- `jsonschema` is available in CI or installable in workflow steps.
- Weekly drift checks can run without strict artifact prerequisites (skip-safe mode).
- Existing branch protection can include the new `agent-trust` check without workflow name collisions.

## Must-Not-Touch

- Core pipeline executors and unrelated server runtime internals.
- Existing evidence schema contracts outside this new item scope.
- Deployment workflows not tied to the agent trust-boundary slice.

## Tooling-Agent Addendum
- `agents/` directory exists and supports Python-based agent scaffolds.
- Existing evidence conventions (`report.json`, `metrics.json`, `stamp.json`) are reusable for tooling-agent outputs.
- New task-graph lane added under `agents/task_graph.py` with schema at `schemas/tooling/task_graph.schema.json`.
- CI integration is isolated in `.github/workflows/tooling-agent.yml` to avoid touching core production pipelines.
