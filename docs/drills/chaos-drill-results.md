# Chaos Drill Results: Signer/OPA/Storage

**Reference authority:** `docs/SUMMIT_READINESS_ASSERTION.md`

## Targets (RPO/RTO)

| Scenario           | RPO Target  | RTO Target   |
| ------------------ | ----------- | ------------ |
| Signer outage      | ≤ 5 minutes | ≤ 30 minutes |
| OPA outage         | ≤ 5 minutes | ≤ 30 minutes |
| Storage throttling | ≤ 5 minutes | ≤ 60 minutes |

## Results Log

### Signer Outage

- **Drill ID:** signer-outage-2026-01-01
- **Environment:** staging
- **Start/End:** Deferred pending staging execution
- **RPO Actual:** Deferred pending staging execution
- **RTO Actual:** Deferred pending staging execution
- **Outcome:** deferred pending staging execution
- **Evidence artifacts:** (attach receipts, audit logs, provenance entries)
- **Notes:** Fail-closed expected for privileged actions when signing is unavailable.

### OPA Outage

- **Drill ID:** opa-outage-2026-01-01
- **Environment:** staging
- **Start/End:** Deferred pending staging execution
- **RPO Actual:** Deferred pending staging execution
- **RTO Actual:** Deferred pending staging execution
- **Outcome:** deferred pending staging execution
- **Evidence artifacts:** (attach OPA health logs, policy denials, provenance entries)
- **Notes:** Privileged mutations must deny when OPA is unavailable.

### Storage Throttling

- **Drill ID:** storage-throttle-2026-01-01
- **Environment:** staging
- **Start/End:** Deferred pending staging execution
- **RPO Actual:** Deferred pending staging execution
- **RTO Actual:** Deferred pending staging execution
- **Outcome:** deferred pending staging execution
- **Evidence artifacts:** (attach storage latency metrics, retry logs, recovery evidence)
- **Notes:** Evidence capture must resume with recovery proof once storage stabilizes.
