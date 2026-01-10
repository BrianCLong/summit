# Policy Effects

Policy effects describe how policy-as-code decisions apply to workflow execution.

## Effect Types

- **allow:** execute with standard disclosure constraints.
- **allow_with_constraints:** execute with explicit transformation or egress limits.
- **require_corroboration:** execute only after additional evidence is provided.
- **quarantine:** suppress or down-weight outputs pending review.
- **deny:** reject execution and log a compliance decision.

## Policy Effect Schema

| Field             | Type    | Description                          |
| ----------------- | ------- | ------------------------------------ |
| `effect_id`       | string  | Stable identifier for effect.        |
| `effect_type`     | string  | One of the effect types above.       |
| `constraints`     | array   | Disclosure or execution constraints. |
| `policy_ref`      | string  | Policy decision ID and rule digest.  |
| `review_required` | boolean | Whether human review is required.    |

## Governance Requirements

- Every effect decision must be logged with policy references.
- Effects that alter disclosure or access require compliance decision logs.
- Ambiguous policy matches must be escalated to governance review.
