# Backlog Signal Sources

This document normalizes the authoritative inputs that seed the autonomous backlog engine. Every
signal produces structured evidence and a reproducible trail aligned to the governance
requirements in `COMPLIANCE_*` and `SAFETY_INVARIANTS.md`.

## Source Catalog

Signals are grouped as defined in `backlog/sources.yaml` and must include structured IDs, severity,
location/evidence paths, and detection timestamps.

- **CI**: `ci-failure`, `ci-flaky`, `ci-slowdown` with normalized pipeline/job names and commit SHAs.
- **Risk**: `risk-drift`, `risk-hotspot` with z-scored drift and component/service catalog mapping.
- **Debt**: `debt-aged`, `debt-sprawl` normalized to severity 1-5 and registry IDs.
- **Exceptions**: `exception-expiring` with countdown markers 14/7/1 days before expiry.
- **Coverage**: `coverage-gap`, `verification-mismatch` normalized against baseline coverage and verification tiers.
- **Reliability**: `flaky-test`, `perf-regression` linked to SLOs and flake rate windows.
- **Security**: `vuln-warning`, `secret-leak-warning` aligned to SBOM components and rotation policy.
- **Governance**: `invariant-soft-violation`, `policy-drift` resolved to RULEBOOK and control IDs.

## Ingestion Rules

1. **Structured Evidence**: Each signal must point to a durable artifact (CI log, coverage report,
   scan output). No opaque text.
2. **Normalization**: Severity → {low, medium, high, critical}. Risk scores → [0,1]. Durations →
   ISO-8601. Controls map to `COMPLIANCE_*` identifiers.
3. **De-duplication**: Signals de-duplicate by `(id, evidence, detected_at)` to avoid backlog spam.
4. **Blast Radius Tagging**: All signals include affected services/domains to enable scoring.
5. **Traceability**: Provenance for each signal is stored with the backlog item to satisfy audit
   requirements and assignment gating.

## Operational Expectations

- Signals are pulled automatically by CI and risk pipelines; manual insertion requires evidence
  attachments and owner review.
- Near-miss signals (flakes, slowdowns) are treated the same as failures but can be deprioritized
  via scoring weights.
- Any missing normalization data should block backlog creation (no silent defaults), ensuring the
  backlog remains reviewable and explainable.
