# Runbook: Debugging, Replaying, and Auditing Agent Runs

This runbook describes how to inspect and replay agent executions once the Agent Execution Ledger
is available. Use it during incidents, compliance reviews, and feature rollouts. It aligns with
`docs/SUMMIT_READINESS_ASSERTION.md` and the GA guardrails in `docs/ga/`.

## Prerequisites

- Access to the Agent Execution Ledger API (CLI or UI), scoped to your tenant.
- Policy engine connectivity (OPA or embedded rules) to enforce gating during replay.
- Credentials for downstream tools required for reproduction; store them via the secrets service.
- Approval authority for HITL checkpoints (human decision-maker).

## Debugging an agent run

1. **Identify the run**: Retrieve the `run_id`, `agent_id`, and `tenant` from the triggering alert
   or request.
2. **Query the ledger**: Fetch the run record including goal, plan steps, prompts/models, tool
   calls (inputs/outputs), approvals, retries, timing, and errors. Redacted fields should be
   labeled with their classification.
3. **Confirm policy trail**: Review allow/deny entries and HITL approvals for each tool call to
   understand why branches were taken. If exceptions occurred, verify they are recorded as
   **Governed Exceptions** with policy version and justification.
4. **Inspect rollbacks**: Confirm which tool calls exposed `rollback/compensate` hooks and whether
   they succeeded. Capture any partial side effects that remain.
5. **Collect artifacts**: Export the run (JSON/JSONL) for incident notes and attach relevant
   logs/metrics.

## Replaying a run

1. **Choose mode**:
   - **Sandbox**: Default for high-risk or investigative replays. Tools run in dry-run mode with
     stubbed side effects.
   - **Live**: Only when HITL approves and policy allows. Ensure idempotency keys are reused where
     supported.
2. **Initiate replay**: Call `ledger replay --run-id <id> [--sandbox] [--tenant <id>]
[--until-step <n>]` (CLI) or the equivalent UI action.
3. **Monitor approvals**: Keep the human approver available for HITL checkpoints, especially
   before write/delete/exfil actions.
4. **Verify outputs**: Compare replayed tool outputs and model responses to the original. Flag
   divergences for further fuzz testing.

## Incident response steps

- **Freeze risky tools**: Update policy/allow lists to block or sandbox tools implicated in the
  incident.
- **Initiate compensating actions**: For each completed step with rollback support, trigger
  `rollback()` and log the outcome in the ledger.
- **Escalate**: Notify security and data owners when exfil/write paths are affected. Capture
  ticket/incident IDs in the ledger record.
- **Post-incident**: Add regression tests to the stress harness and verify ledger coverage for the
  new scenario.

## Audit export workflow

1. **Scope the export**: Tenant and time-bounded; include run metadata, tool calls, approvals,
   rollbacks, and outcomes. Exclude or redact secrets by default.
2. **Generate export**: `ledger export --tenant <id> --from <ts> --to <ts>
--redaction-level strict --format jsonl`.
3. **Validate**: Ensure classification labels remain intact and that cross-tenant data is
   excluded. Verify checksums where provided.
4. **Hand-off**: Provide the export to compliance with accompanying policy versions and approval
   records.

## Operational notes

- Keep replay limited to the minimum set of steps necessary to validate fixes.
- Always record manual interventions (policy changes, approvals, overrides) as ledger annotations.
- During outages, default to sandbox mode and require explicit HITL approval to leave sandbox.
- Any missing data or drift is **Deferred pending ledger schema reconciliation**.

## Finality

Complete the incident record with ledger links, policy versions, and a clear remediation status.
