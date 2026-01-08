# Human-in-the-Loop (HITL) Safety for High-Risk Automations

## What qualifies as high-risk automation?

High-risk automations are any flows that can materially change systems, data, or external parties without an operator validating intent. The following categories always trigger review:

- **Graph-wide or bulk mutations**: operations that touch large slices of the knowledge graph, bulk imports/exports, or cascading deletes/rewires.
- **External effects**: outbound notifications/integrations (email/Slack/webhooks), trades or account actions, infrastructure changes, or writes to third-party systems.
- **Long-running or expensive jobs**: orchestrations that spawn long-lived workers/pipelines or high-cost LLM runs, especially when they fan out actions.
- **Privileged or sensitive scopes**: operations that bypass standard guardrails (e.g., forced overrides, break-glass, or running with elevated roles/tenants).

## When HITL is required

HITL is mandatory whenever any of the above are true, and specifically for:

- Maestro runs flagged as having external side effects or marked with `riskLevel: "high"`/`requiresApproval: true`.
- Bulk graph operations (imports/exports/rewires) that cannot be scoped to a single case/tenant.
- Any automation that escalates privileges, bypasses policy checks, or modifies retention/disclosure settings.

If a flow is ambiguous, default to **require approval**.

## Approval workflow

### Requesting approval

- The caller posts an approval request with context (who, what, why, payload snapshot, and linked run/action IDs when available).
- The system records an immutable entry with `status=pending` and exposes it in the Approvals console.

### Review/decision paths

- **PR approvals**: Code changes to high-risk flows must have PR review from at least one safety/operations approver.
- **In-app approval (primary path)**:
  - Approvers with the `ADMIN`/`SECURITY_ADMIN`/`OPERATIONS`/`SAFETY` roles can approve or reject.
  - Approval requires a reason; decisions and actors are logged and auditable.
  - On approval, the linked automation is executed (for Maestro runs we replay the stored request payload).
- **Out-of-band fallback**: If the in-app path is degraded, requesters must obtain a written decision in Slack/email from an authorized approver and record the reference in the approval reason before proceeding manually.

### Execution rules

- **No auto-run without approval**: high-risk requests return `202 Accepted` with the approval ID and do not execute until approved.
- **Single-use approvals**: once approved/rejected, the record is immutable; replays require a new approval.
- **Traceability**: every decision logs actor, reason, timestamp, and linked run/action IDs; metrics track pending/approved/rejected volumes.

## Roles & access

- Only operators with elevated roles (`ADMIN`, `SECURITY_ADMIN`, `OPERATIONS`, `SAFETY`) can approve or reject.
- Requesters can submit and view the status of their own items; admins/operators can view all pending requests.

## Metrics & observability

- **approvals_pending** (gauge): current pending items.
- **approvals_approved_total** (counter): approvals granted.
- **approvals_rejected_total** (counter): approvals denied.
- Logs include `approval_id`, `action`, `run_id` (if any), `requester`, `approver`, `reason`, and decision outcome.

## Integration pattern

1. Detect high-risk inputs early (e.g., `riskLevel === 'high'`, `requiresApproval`, external side effects flag).
2. Create an approval with the full payload snapshot and a human-readable reason.
3. Surface it in the Approvals UI for admins/operators.
4. On approval, execute the stored action (or unblock the queued job) and emit logs/metrics.
5. On rejection, emit logs/metrics and halt the automation.

This document is the template for all future high-risk automations; new flows should follow the same request→review→execute lifecycle.
