# Autonomy Health Monitoring

Autonomy is treated as an operational capability with explicit KPIs and downgrade criteria. Automated actions are bounded by guardrails and observed continuously.

## Autonomy KPIs

- **Actions per tier:** Volume of automated actions by autonomy tier, success rate, and reversions.
- **Auto-demotions:** Count and cause; mean time spent in downgraded state; rate of false positives.
- **Kill-switch activations:** Frequency, duration, and blast radius avoided; post-activation verification results.
- **Human-in-loop ratio:** Percentage of actions requiring human confirmation per tier.

## Health Thresholds

- **Downgrade triggers:**
  - Precision of automated actions below 95% over rolling 7 days.
  - More than 2 kill-switch activations in 24 hours.
  - Unexplained cost or error variance attributed to autonomous loops.
- **Freeze conditions:**
  - Any safety invariant breach.
  - Security policy violation linked to autonomous action.
  - Regression lock triggered by autonomous change.

## Governance & Controls

- Every autonomous action must emit an audit event with actor, input, action, outcome, and rollback capability.
- Downgrades and freezes are executed via feature flags with clear re-enable criteria.
- Add synthetic checks that replay recent autonomous actions in read-only mode after any policy or model update.
- Weekly review of autonomy KPIs feeds the Ops Review; quarterly decisions adjust autonomy tiers and guardrails.
