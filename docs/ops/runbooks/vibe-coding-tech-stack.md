# Runbook: Vibe Coding Tech Stack

## Scope

Operational guidance for the Vibe Stack manifest, scaffold generation, and drift detection
workflows.

## Alerts & Signals

- **Webhook handler p95** latency regression
- **Policy test failure rate** > 0
- **Drift detector violations** > 0
- **Scaffold determinism check** failure

## Runbook 1: Webhook Failures

**Symptoms**
- Increased webhook failure rate
- Idempotency conflict alerts

**Immediate Actions**
1. Confirm webhook handler health and dependencies.
2. Check processed event ID store availability.
3. Validate idempotency logic rejects duplicates.

**Recovery**
- Reprocess failed events using stored event IDs.
- Verify entitlements reconciliation.

## Runbook 2: Entitlement Mismatch

**Symptoms**
- Users report missing entitlements after payment
- Audit logs show missing entitlement writes

**Immediate Actions**
1. Inspect entitlement write path and audit event output.
2. Verify webhook completion records.

**Recovery**
- Replay affected events.
- Reconcile entitlements against payment records.

## Runbook 3: Scaffold Regression

**Symptoms**
- `vibe:scaffold` output changes unexpectedly
- Determinism guard fails in CI

**Immediate Actions**
1. Compare generated outputs with last known good artifacts.
2. Confirm deterministic ordering and absence of timestamps.

**Recovery**
- Revert scaffold template changes.
- Regenerate evidence artifacts.

## Runbook 4: Drift Detector Alert

**Symptoms**
- Unapproved tooling detected
- Manifest allowlist mismatch

**Immediate Actions**
1. Identify offending files or dependencies.
2. Determine if a manifest update is required.

**Recovery**
- Remove unapproved tooling.
- Update allowlist with justification and review.
