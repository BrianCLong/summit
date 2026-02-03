# Data Classification & Handling — Automation Turn #3

## Classification

- **Public:** Manifest, Standards, Runbooks.
- **Internal:** Evidence Reports (unless scrubbed).
- **Confidential:** None (summary-level aggregation).
- **Regulated:** None.

## Retention Policy

- Evidence outputs (`report.json`, `metrics.json`, `stamp.json`) are retained as CI artifacts.
- Local runs: `evidence/runs/` stays git-ignored or is managed via the evidence index.

## Audit

- All bundle changes are audited via the Evidence Index (`evidence/index.json`) and verifier checks.
- Runtime telemetry is intentionally constrained; only bundle artifacts are tracked in this lane.

## PII & Secrets

- **Never Log:** PII, secrets, access tokens, or environment dumps.
- Verifier output is constrained to deterministic bundle metadata.

## Deferred Handling

- Extended retention classification is deferred pending explicit regulatory inputs.
