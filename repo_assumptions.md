# Repo Assumptions & Validation

## Verified

* Repo exists and is MIT licensed.
* Top-level directories include `.maestro`, `agents`, `agentops`, `audit`, `SECURITY`, `RUNBOOKS`, `.ci`, and `.github`.
* README names IntelGraph, Maestro Conductor, Switchboard, and the Provenance Ledger as core components.

## Assumed (Deferred pending verification)

* Exact pnpm workspace package boundaries and where Maestro runtime wiring lives.
* Current evidence/provenance schema on disk (e.g., `stamp.json` shape) and whether it is shared across audit/provenance packages.
* Whether an existing audit/event bus should be extended versus introducing a minimal append-only JSONL journal.
* Required check names and enforcement expectations in `docs/ci/REQUIRED_CHECKS_POLICY.yml` beyond policy existence.

## How to Verify (Intentionally constrained)

1. Locate Maestro orchestration runtime packages and their config schema.
2. Find any existing provenance/evidence contract artifacts (e.g., `stamp.json`) and record their canonical schema.
3. Identify existing audit/event infrastructure to reuse for incident journaling.
4. Confirm CI required-check names listed in `docs/ci/REQUIRED_CHECKS_POLICY.yml` and compare to branch protection policy.
