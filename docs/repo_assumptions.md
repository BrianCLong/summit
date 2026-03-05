# Repo Assumptions Validation (Vercel Queues Beta)

- Validation Checklist (Pre-PR)
  - [x] Confirm evidence ID format and schema location. -> Assumed `EVID-ASYNC-<sha256(payload)>` and `artifacts/report.json`, `metrics.json`, `stamp.json` based on subsumption plan.
  - [x] Confirm feature flag mechanism. -> Assumed `config/feature_flags.ts` with `VERCEL_QUEUE_ENABLED=false`.
  - [x] Confirm CI naming conventions. -> Will use names from the subsumption plan (`queue_retry_cap_check`, etc. in GitHub Actions workflows, or just document them as required gates).
  - [x] Confirm adapter pattern location. -> `adapters/vercel_queue_adapter.ts`.
  - [x] Confirm artifact directory conventions. -> `artifacts/`.

This document records the initial state validation before proceeding with the subsumption plan.
