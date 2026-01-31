# Data Classification & Handling — Subsumption Bundle

## Classification

- **Public:** Contract docs, manifests, fixtures.
- **Internal:** Evidence triad (`report.json`, `metrics.json`, `stamp.json`).
- **Confidential:** None for the scaffold baseline.
- **Regulated:** None (governance-only).

## Retention Policy

- Evidence outputs are retained as CI artifacts.
- Local runs store evidence only in the bundle folder to avoid leakage.

## PII & Secrets

- **Never Log:** Tokens, credentials, PII, or environment dumps.
- Verifier output is intentionally constrained to deterministic metadata.

## Deferred Handling

- Extended retention or regulated classification is deferred pending ITEM-specific scope.
