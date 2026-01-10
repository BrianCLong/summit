# Policy Gateway

## Responsibilities

- Evaluate policy-as-code rules for effects (read/write/export).
- Issue signed policy decision tokens with obligations.
- Record decisions in audit log.

## Inputs

- Subject context, purpose, effect signature.
- Optional constraints (budget, jurisdiction).

## Outputs

- Policy decision token with `allowed` and `obligations`.

## Operational Notes

- Must enforce purpose-based access control and egress constraints.
- Decision IDs must be referenced in witness chain entries.
