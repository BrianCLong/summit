# 119: Data Producer Contracts & Ingest Certification (DPIC)

Track: Feature Flags
Branch: feat/dpic
Labels: feature-flag, area:ingestion, area:governance, ci:e2e

## Summary
Enforce data contracts on external feeds/connectors covering schema, quality SLAs, lineage, and license compliance before ingestion; certify producers and quarantine non-conformant feeds under DPIC_ENABLED.

## Deliverables
- Node/TS service at `/ingestion/contracts` for contract specs (schema, nullability, units, license), certification workflow, and non-conformance quarantine.
- UI onboarding wizard, fixture-based testing, signed certificates; jQuery diff viewer for contract drift.
- Webhooks for producers; conformance scorecards; append-only audit log.

## Constraints
- No production ingestion without valid certification; verify DP/PII flags; enforce append-only auditing.
- Feature flag gating via `DPIC_ENABLED`.

## DoD / CI Gates
- Contract drift tests; quarantine → fix → recertify loop verification.
- k6 ingest-gate throughput tests; policy checks for DP/PII flags and license compliance.
- Playwright E2E for producer onboarding, fixtures, certification, and release to production ingest.

## Open Questions (Tuning)
- Minimum DQ metrics to enforce (completeness, timeliness, duplicates)?
- Certification renewal cadence?

## Parallelization Notes
- Fronts ingestion via connector SDK contracts; quarantines non-conformant feeds without touching shared stores.
