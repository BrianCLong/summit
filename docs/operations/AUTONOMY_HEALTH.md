# Autonomy Health Monitoring

Autonomy is treated as an operational capability with explicit KPIs and downgrade criteria.
Automated actions are bounded by guardrails and observed continuously.

## Autonomy KPIs

| KPI                     | Definition                          | Target                       |
| ----------------------- | ----------------------------------- | ---------------------------- |
| Actions per tier        | Count of automated actions by tier  | Stable or declining variance |
| Auto-demotions          | Count + cause; mean time downgraded | <2 per week                  |
| Kill-switch activations | Frequency and duration              | 0 unless safety trigger      |
| Human-in-loop ratio     | % actions requiring approval        | Tier-dependent baseline      |
| Reversion rate          | % actions rolled back               | <1%                          |

## Health Thresholds

- **Downgrade triggers:**
  - Precision below 95% over rolling 7 days.
  - More than 2 kill-switch activations in 24 hours.
  - Unexplained cost or error variance attributed to autonomous loops.
- **Freeze conditions:**
  - Any safety invariant breach.
  - Security policy violation linked to autonomous action.
  - Regression lock triggered by autonomous change.

## Governance & Controls

- Every autonomous action must emit an audit event with actor, input, action, outcome, and rollback.
- Downgrades and freezes are executed via feature flags with clear re-enable criteria.
- Add synthetic checks that replay recent autonomous actions in read-only mode after policy/model updates.
- Weekly review of autonomy KPIs feeds the Ops Review; quarterly decisions adjust tiers and guardrails.

## Evidence Requirements

- Autonomy KPI dashboard snapshot for each weekly review.
- Audit log evidence for any demotion or freeze.
- Post-incident verification summary within 24 hours of activation.
