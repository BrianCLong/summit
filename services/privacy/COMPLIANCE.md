# Consent State Reconciler Compliance Guide

## Overview

The consent state reconciler coordinates consent records across distributed services. It resolves conflicts, enforces
jurisdictional policy controls, tracks version history, and exposes automated drift detection. The reconciler integrates
with upstream consent APIs through the `HttpConsentApiClient`, ensuring updates, audit events, and drift findings are
persisted in a central ledger.

## Functional Guarantees

- **Deterministic conflict resolution** – snapshots are ordered by semantic version, timestamp, and status priority
  (`withdrawn` > `denied` > `expired` > `granted`). Metadata and preference payloads are merged deterministically to
  avoid data loss while preserving canonical authority.
- **Version tracking** – canonical records are automatically versioned. When a downstream system reports a newer
  version than the canonical store, the reconciler increments the persisted version to guarantee monotonic history.
- **Audit trail generation** – every reconciliation produces structured audit entries: reconciliation outcome,
  compliance alerts, and drift detections. Entries are sent to the consent API through `recordAuditTrail`.
- **Automated drift detection** – the reconciler inspects state divergence across all sources (status, version,
  purposes, timestamps, preferences, and metadata). Drift findings are raised to the consent API through
  `publishDrift` for rapid remediation.

## GDPR Coverage

| Control                   | Implementation Detail                                                                                |
| ------------------------- | ---------------------------------------------------------------------------------------------------- |
| Lawful Basis Verification | `GDPR_LAWFUL_BASIS_MISSING` is raised when `lawfulBasis` is absent for GDPR or GLOBAL jurisdictions. |
| Purpose Limitation        | `GDPR_PURPOSE_REQUIRED` ensures at least one explicit processing purpose.                            |
| Retention Boundaries      | `GDPR_RETENTION_UNSPECIFIED` reminds operators to configure `retention.expiresAt`.                   |
| Proof of Consent          | When `requireProofForGdpr` is enabled (default), missing `proof` values emit `GDPR_PROOF_MISSING`.   |

## CCPA Coverage

| Control                 | Implementation Detail                                                                 |
| ----------------------- | ------------------------------------------------------------------------------------- |
| Notice Delivery         | `CCPA_NOTICE_REQUIRED` validates the `metadata.ccpaNoticeProvided` flag.              |
| Do Not Sell Preferences | `CCPA_DNS_MISSING` requires explicit `preferences.doNotSell` when status is `denied`. |

## Drift Detection Fields

- `version`, `status`, `purposes`
- `lastUpdated` skew beyond the configured tolerance
- Preference deltas (`preferences.*`)
- Metadata deltas (`metadata.*`)

## Integration Steps

1. Instantiate `HttpConsentApiClient` with the consent platform base URL and optional API token.
2. Construct `ConsentReconciler` with the API client and jurisdictional options.
3. Call `reconcile(consentId, snapshots)` with the collected source states.
4. Review `ConsentReconciliationResult` for compliance issues and drift findings. Non-compliant outcomes should be
   routed to privacy operations for remediation.

## Operational Notes

- Set `clockSkewToleranceMs` in `ConsentReconcilerOptions` to accommodate asynchronous source replication.
- Systems that cannot persist audit events should still consume the `auditTrail` entries for downstream logging.
- When jurisdictions evolve, extend `ConsentReconciler.validateCompliance` with new codes to maintain certification
  trails.

## Testing & Validation

Automated Jest suites exercise conflict resolution, compliance validation, API integration, and drift detection. Run
`npm test --workspace services/privacy` before deployment to verify behavior and maintain coverage.
