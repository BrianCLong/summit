# Chaos Drill Scenarios: Signer Outage, OPA Outage, Storage Throttling

- **Scope:** Summit control-plane guardrails and provenance safeguards
- **Environment:** staging or sandbox only
- **Authority:** Refer to `docs/SUMMIT_READINESS_ASSERTION.md` for readiness criteria

## Scenario 1: Signer Outage (Receipt/Signature Service)

**Objective:** Validate privileged operations fail-closed when signing is unavailable and receipts are not emitted.

**Fault injection**

1. Disable signing service or unset `SIGNING_PRIVATE_KEY` in staging.
2. Trigger a privileged mutation (policy update, export approval, or admin action).

**Expected behavior**

- Policy enforcement fails closed for privileged actions.
- Receipt creation is blocked; no unsigned receipts are emitted.
- Provenance records denial with `OPA unavailable` or `Signing unavailable` reason.

**Evidence to capture**

- API response + error reason (HTTP status, payload).
- Audit/provenance entry showing denial.
- Metrics snapshot for policy denials and signing health.

**Recovery**

1. Restore signing key or signer service.
2. Re-run the privileged mutation.
3. Capture receipt + provenance confirmation.

## Scenario 2: OPA Outage

**Objective:** Validate privileged operations fail-closed when OPA is unreachable.

**Fault injection**

1. Stop OPA deployment or block `OPA_URL` via network policy.
2. Trigger a privileged mutation (policy publish, tenant admin action).

**Expected behavior**

- Privileged actions are denied with an OPA-unavailable reason.
- Non-privileged actions continue through local rules.
- Denials are recorded in audit + provenance.

**Evidence to capture**

- OPA health check failures.
- Policy denial logs with action name.
- Provenance entry for the denial.

**Recovery**

1. Restore OPA availability.
2. Re-run the privileged mutation.
3. Record receipt and provenance entry post-recovery.

## Scenario 3: Storage Throttling (Provenance/Audit Writes)

**Objective:** Validate backpressure handling and RPO/RTO adherence when storage is throttled.

**Fault injection**

1. Apply IO throttling or simulate DB latency on provenance/audit stores.
2. Trigger a batch of privileged operations and evidence writes.

**Expected behavior**

- Writes either queue or fail closed for privileged actions (no silent success).
- Recovery evidence is captured once storage stabilizes.
- RPO/RTO targets remain within documented thresholds.

**Evidence to capture**

- Storage metrics (latency, throttling events).
- Provenance queue depth and retry logs.
- Recovery evidence payload with actual RPO/RTO values.

**Recovery**

1. Remove throttling and confirm storage health.
2. Replay queued operations or re-run failed ones.
3. Capture recovery evidence entry in provenance.

## Reporting Template

- **Drill ID:**
- **Scenario:**
- **Start Time / End Time:**
- **RTO Target / Actual:**
- **RPO Target / Actual:**
- **Outcome:** successful | failed | deferred pending staging execution
- **Evidence Artifacts:**
- **Follow-ups:**
