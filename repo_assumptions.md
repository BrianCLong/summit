# Kafka Push Proxy Repo Assumptions Validation

## Scope
Validation checkpoint for PR-1 scaffold of `ingestion/kafka_push_proxy`.

## Checklist

1. **Ingestion module layout and naming** — **Verified**
   - Repository contains Python ingestion entrypoints under `ingestion/` and ingestor modules under `ingestion/ingestors/`.
   - New module path `ingestion/kafka_push_proxy/` aligns with existing Python ingestion layout.

2. **Evidence ID pattern** — **Partially verified (intentionally constrained)**
   - Multiple active patterns exist (`EVID-cti-YYYYMMDD-<sha8>`, `EVID-SC-...`, `EVID-SERA-CLI-...`).
   - No single repository-wide canonical pattern was identified for all domains in this pass.
   - Decision: PR-1 scaffold defers evidence-id canonicalization pending schema-layer implementation PR.

3. **CI check names and thresholds** — **Verified**
   - Existing workflows include `policy-check` and `determinism-check` jobs.
   - No top-level `schema-validate` job name was found in the sampled CI workflows, so schema validation naming remains deferred pending gate mapping in a follow-up PR.

4. **Must-not-touch surfaces** — **Verified by constraint**
   - This PR does not modify `core/engine/*`, `evidence/schema/*.json`, or release workflows.

## Commands used

- `find . -maxdepth 3 -type d -name ingestion | head`
- `rg --files ingestion | head -n 50`
- `rg -n "EVID-[A-Za-z]+-|EVID-" . | head -n 40`
- `rg -n "policy-check|schema-validate|determinism-check|rate-limit-check|replay-check" .github/workflows scripts/ci docs/CI_STANDARDS.md | head -n 80`

## Status
Ready for PR-1 scaffold merge with feature flag default OFF.
