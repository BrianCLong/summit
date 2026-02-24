# Codex Task: Integrate Run Manifest End-to-End

**Priority:** P0  
**Labels:** `codex`, `ga-blocker`, `determinism`, `infra`

## Desired Outcome

`run_id` and manifest references propagate through orchestration, memory, decision traces,
and evidence bundles with hard rejection of untracked writes.

## Workstreams

- Inject `run_id` into orchestration context, memory envelope, decision traces, and evidence bundle builder.
- Reject write operations that do not include `run_id`.
- Attach `manifest.json` and hashes to each evidence bundle.
- Add orphan operation logging for operations that fail manifest linkage.

## Key Deliverables

- Runtime propagation patch for all required subsystems.
- Evidence bundle schema update including manifest attachment and hash fields.
- Replay path validation against `manifest.json`.
- Unit and integration tests for run-manifest propagation.

## Acceptance Criteria

- No runtime write occurs without `run_id`.
- Evidence bundles include `manifest.json` and deterministic hash outputs.
- Replay succeeds using only manifest-driven inputs.
- Tests enforce propagation and fail on missing `run_id` paths.

## PR Guidance

- Include integration tests for orchestration-to-evidence flow.
- Preserve existing API contracts (no breaking API changes).
- Update architecture docs for manifest propagation boundaries.
