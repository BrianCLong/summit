# Autonomous Operations Scope

This document defines the strict boundaries for autonomous operations within Summit.
Any operation not explicitly allowed here is **strictly prohibited**.

## Principles

1.  **Assistive, Not Replacement**: Automation handles routine tasks; humans handle consequential decisions.
2.  **No Silent Actions**: Every autonomous action must be logged and attributable.
3.  **Safety First**: When in doubt, do nothing and alert a human.

## Allowed Actions

The following actions are permitted for autonomous execution, subject to policy checks:

| Action Category | Specific Actions | Constraints |
| :--- | :--- | :--- |
| **Traffic Shaping** | `throttle_tenant`, `prioritize_traffic` | Must operate within defined quotas/caps. |
| **Resilience** | `auto_retry`, `circuit_reset` | Must use exponential backoff. |
| **Scaling** | `suggest_scale_up`, `suggest_scale_down` | "Suggest" only; execution requires approval if beyond presets. |
| **Notification** | `send_alert`, `create_ticket` | No constraints. |

## Prohibited Actions (Strict)

The following actions are **strictly prohibited** for autonomous systems:

1.  **Data Mutation**: No autonomous updating, deleting, or overwriting of business data (e.g., user records, investigation data).
2.  **Policy Changes**: No autonomous modification of OPA policies, access controls, or guardrails.
3.  **Cross-Tenant Actions**: No action may affect more than one tenant. Global actions are reserved for human admins.
4.  **Invariant Violation**: No action may violate defined system invariants (e.g., data integrity checks).

## Guardrails Implementation

Guardrails are enforced by the `GuardrailService` and `PolicyEngine`.
Bypassing these guardrails is a security violation.

## Approval Workflows

Actions classified as "Consequential" or "High Risk" require human approval via the `ApprovalService`.
See `server/src/autonomous/ApprovalService.ts` for workflow definitions.
