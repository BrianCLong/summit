# Conflict Detection & Arbitration Engine

## 1. Conflict Detection

The engine identifies conflicts when a proposed action by one loop negatively impacts a metric protected by another loop, unless that metric is explicitly listed as an allowed tradeoff.

## 2. Arbitration Rules

The arbitration process is deterministic and follows a strict hierarchy:

1.  **Policy & Security (Critical Priority)**: Always win.
2.  **SLA Protection (High Priority)**: Wins over cost and performance.
3.  **Cost vs. Performance**:
    *   If priorities are equal, Reliability > Performance > Cost > Autonomy.
4.  **Priority Scores**:
    *   Critical: 4
    *   High: 3
    *   Normal: 2
    *   Background: 1

## 3. Explainable Decisions

Every decision is logged with a `reason` and the `arbitrationRuleApplied`.
