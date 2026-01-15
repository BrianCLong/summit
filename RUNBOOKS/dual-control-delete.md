# Runbook: Dual-Control Delete

## Scope

Execute a dual-control delete while preserving approval evidence and audit trail.

## Signals

- Approval queue high with delete requests pending.
- Audit logs show delete requests awaiting dual approval.

## Preconditions

- Two distinct approvers are available and authorized.
- OPA and signer services are healthy.

## Procedure

1. Confirm delete request ID and scope.
2. Verify OPA decision for delete action (must be explicit allow).
3. First approver submits approval and logs rationale.
4. Second approver submits approval and confirms no conflicts.
5. Execute delete action with the approval token.
6. Record audit evidence and attach to the run record.

## Verification

- Delete action completes successfully.
- Approvals recorded in audit timeline.
- No lingering references in graph indices.

## Escalation

- If approvals cannot be obtained within SLA, pause the delete.
- If OPA denies, record a Governed Exception with explicit authorization.

## References

- Approvals workflow: `server/src/conductor/approvals.ts`
- Approval UI: `apps/compliance-console/src/approvals/ApprovalsPage.tsx`
