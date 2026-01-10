# Policy Gateway

## Responsibilities

- Evaluate policy-as-code decisions for wedge workflows.
- Enforce budgets (compute, evidence, egress).
- Issue policy decision IDs bound to artifacts.

## Inputs

- Policy context: tenant, purpose, jurisdiction.
- Requested operation: wedge type, action, budget profile.

## Outputs

- `policy_decision_id`
- Allowed action set / denied actions
- Budget constraints and enforcement hints

## Required Logging

All decisions are logged for compliance review and linked to transparency log
entries.
