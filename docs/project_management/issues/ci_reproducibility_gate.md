# Codex Task: CI Reproducibility Gate

**Priority:** P0  
**Labels:** `codex`, `ci`, `ga-blocker`, `determinism`

## Desired Outcome

CI blocks non-deterministic behavior by replaying a sample workflow and comparing output hashes.

## Workstreams

- Execute canonical sample workflow in CI.
- Replay using emitted manifest from primary run.
- Compare output hashes and materialized artifacts.
- Fail CI with diff report on mismatch.

## Key Deliverables

- Reproducibility gate job in pull-request workflow.
- Stable diff report artifact for deterministic mismatch analysis.
- Documentation for local reproduction of gate failures.

## Acceptance Criteria

- CI fails on reproducibility mismatch.
- Replay outputs match primary run hashes for guarded workloads.
- Logs and artifacts include machine-readable diff details.
