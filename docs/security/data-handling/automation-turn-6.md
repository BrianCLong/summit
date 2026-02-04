# Data Classification & Handling — Automation Turn #6

## Classification
- **Public:** Manifest, Standards, Runbooks.
- **Internal:** Evidence Reports (unless scrubbed).
- **Confidential:** None (Methodology update).
- **Regulated:** None.

## Retention Policy
- Evidence outputs (`report.json`, `metrics.json`, `stamp.json`) are retained as artifacts in CI.
- Local runs: `evidence/runs/` should be git-ignored (or managed via index).

## Audit
- All changes to the bundle are audited via the Evidence Index (`evidence/index.json`) and the Verifier.

## PII & Secrets
- **Never Log:** PII, Secrets, API Keys.
- The verifier script must not output sensitive environment variables.
