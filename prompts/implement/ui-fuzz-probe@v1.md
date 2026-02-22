# Prompt: Implement Bombadil-Inspired UI Fuzz Probe

## Objective
Implement a deterministic UI fuzz probe with reproducible artifacts, allowlist enforcement, and drift detection aligned to Summit governance and MAESTRO threat modeling.

## Scope
- Tools under `tools/ui_fuzz/`
- CI workflows under `.github/workflows/ui-fuzz*.yml`
- Monitoring script under `scripts/monitoring/`
- Standards, data-handling, and runbook docs
- Roadmap status updates

## Constraints
- Deterministic outputs and hash-only stamp files (no wall-clock timestamps).
- Deny-by-default allowlist enforcement, required in CI.
- Never log sensitive values (cookies, auth headers, storage values, raw DOM text).
- Ensure artifacts are reproducible from seed and config.

## Required Outputs
- `report.json`, `metrics.json`, `stamp.json`, optional `trace.ndjson`.
- Drift report with rolling baseline comparison.

## Testing
- Unit tests for determinism helpers and redaction.
- Boundary check via `node scripts/check-boundaries.cjs`.
