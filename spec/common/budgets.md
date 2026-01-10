# Disclosure & Sensitivity Budgets

Defines the policy-aligned constraints that bound capsule outputs.

## Budget Dimensions

- **Bytes**: total returned bytes across artifacts.
- **Entity count**: maximum number of entities or records.
- **Sensitivity class**: permitted classes (e.g., public, restricted).
- **Retention**: maximum retention time for stored artifacts.

## Budget Schema (Logical)

```yaml
budget:
  budget_id: <string>
  bytes_max: <int>
  entity_max: <int>
  sensitivity_classes:
    - <string>
  retention_ttl: <duration>
  cost_weights:
    bytes: <float>
    sensitivity_class:
      public: <float>
      restricted: <float>
```

## Enforcement Rules

- Policies must be expressed in policy-as-code and referenced by budget ID.
- Budgets are decremented as artifacts are assembled and redacted.
- If a budget is exceeded, outputs are minimized or truncated with proof.

## Audit Requirements

- Every budget application logs a decision record.
- Budget decisions should link to witness records and policy identifiers.
