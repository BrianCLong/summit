# Runbook: Switchboard Approvals Stuck

## Trigger
- Approval cycle time p95 exceeds 5 minutes.
- Alert: `SwitchboardApprovalCycleTimeBurn`.

## Impact
Approvals are not completing, blocking privileged command execution.

## Triage Steps
1. Check approval queue depth and decision rate metrics.
2. Verify OPA evaluation latency is within SLO.
3. Inspect receipt emission latency and backlog.
4. Validate approver role mappings for affected tenants.

## Mitigations
- Scale approval workers.
- Reconcile missing approver roles in tenant policy configuration.
- Re-emit receipts for completed approvals that lack timeline entries.

## Verification
- Cycle time p95 returns below 5 minutes.
- No missing receipts for the past 15 minutes.
