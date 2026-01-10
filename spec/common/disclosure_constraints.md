# Disclosure Constraints

Disclosure constraints define boundaries for data egress and transformation when producing
outputs across all wedges.

## Constraint Types

- **Aggregation thresholds:** k-anonymity, minimum group size, or cell suppression rules.
- **Redaction policies:** remove direct identifiers or sensitive attributes.
- **Noise injection:** differential privacy parameters and noise budgets.
- **Egress caps:** byte limits, record count limits, or output entity caps.
- **Purpose binding:** allowed purposes for each output artifact.

## Constraint Schema

| Field             | Type   | Description                                     |
| ----------------- | ------ | ----------------------------------------------- |
| `constraint_id`   | string | Stable identifier for disclosure constraint.    |
| `constraint_type` | string | `aggregation`, `redaction`, `dp`, `egress_cap`. |
| `parameters`      | object | Constraint-specific parameters.                 |
| `policy_ref`      | string | Policy decision ID and rule digest.             |
| `created_at`      | string | RFC 3339 timestamp.                             |

## Enforcement Workflow

1. Validate request against policy-as-code.
2. Execute computation in sandboxed environment.
3. Apply disclosure transformations.
4. Emit compliance artifact with constraint metadata.
5. Log compliance decision in audit ledger.

## Policy-as-Code Integration

Disclosure constraints are defined as policy-as-code rules and must be enforced uniformly across
systems. Any constraint mismatch triggers a governance escalation event.
