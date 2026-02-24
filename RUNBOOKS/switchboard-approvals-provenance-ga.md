# Switchboard Approvals + Provenance GA Runbook

## Scope
Operational procedures for privileged-action approvals, signed receipts, and policy simulation failures in Sprint 07.

## 1. Approval Stuck > 2m

### Detection
- Alert: `switchboard_approval_stuck_seconds > 120`
- Symptoms: action remains `pending_approval` and queue SLA breaches.

### Immediate Actions
1. Confirm preflight exists and is not expired.
2. Verify decision hash has not drifted from latest simulation.
3. Check dual-control state (`required_approvals` vs `current_approvals`).
4. Retry `Simulate Again` and re-evaluate.

### Commands
```bash
curl -s "$SWITCHBOARD_URL/v1/switchboard/actions/preflight/$PREFLIGHT_ID"
curl -s "$SWITCHBOARD_URL/v1/switchboard/actions/$ACTION_ID/approvals"
```

### Exit Criteria
- Approval moves to `approved` or `rejected`.
- Timeline event emitted with operator note.

## 2. Receipt Signing Failure

### Detection
- Alert: `switchboard_receipt_sign_failures_total > 0`
- Symptoms: action execution blocked with `unsigned_action_detected`.

### Immediate Actions
1. Place privileged execution in fail-closed mode.
2. Check signer service health and KMS key policy reachability.
3. Validate active KID and certificate chain.
4. Re-run signing probe against synthetic payload.

### Commands
```bash
kubectl -n switchboard get pods -l app=receipt-signer
kubectl -n switchboard logs deploy/receipt-signer --tail=200
kubectl -n switchboard exec deploy/receipt-signer -- signer --self-check
```

### Exit Criteria
- Signing probe returns success.
- Backlog replay signs all queued receipts.
- `unsigned_privileged_actions_total == 0`.

## 3. Policy Regression Detected

### Detection
- Alert: `switchboard_policy_coverage_percent < 85`
- CI gate failure in policy simulation harness.

### Immediate Actions
1. Freeze privileged deploy lane.
2. Diff policy bundle hashes between current and last known good.
3. Run golden regression suite and identify first failing case.
4. Roll back policy bundle to last known good version.

### Commands
```bash
pnpm policy:simulate --all-privileged
pnpm policy:coverage:report
helm rollback switchboard <REVISION>
```

### Exit Criteria
- Coverage restored to >= 90% for privileged flows.
- Regression suite green.
- Rollback recorded in governance decision log.

## 4. Dual-Control Override Audit

### Detection
- Triggered by any `override` decision on `risk_tier=critical`.

### Procedure
1. Verify two unique approvers and independent sessions.
2. Validate structured rationale completeness.
3. Confirm override flag is present in receipt and timeline.
4. Export selective disclosure bundle for audit reviewer.

### Commands
```bash
curl -s "$SWITCHBOARD_URL/v1/switchboard/receipts/$RECEIPT_ID"
curl -s -X POST "$SWITCHBOARD_URL/v1/switchboard/receipts/$RECEIPT_ID/disclosure" \
  -H 'Content-Type: application/json' \
  -d '{"fields":["rationale","approvals","policy_decision"],"reason":"dual_control_override_audit"}'
```

### Exit Criteria
- Audit confirms control integrity.
- Findings linked to incident or change record.
