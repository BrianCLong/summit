# Defensive publication: Differential privacy (DP) budgeting heuristics for federated intel queries

## Context

- Applies to federated intelligence queries where cross-organization requests run under DP guardrails.
- Uses per-organization budgets with renewal windows and classification-aware sensitivity.

## Technique

1. **Sensitivity scoring:** Base epsilon = 0.1; add 0.5 if personal data present; +0.3 if cross-jurisdiction; +0.2 if classification ≥ SECRET.
2. **Budget ledger:** Map org → remaining epsilon with sliding-window renewal; denial when insufficient budget.
3. **Query class modifiers:** Higher multipliers for join-heavy graph traversals and time-window expansions.
4. **Fail-closed routing:** If budget denied, propose delayed execution window; never downgrade privacy parameters.
5. **Noise calibration:** Laplace/Gaussian choice based on query topology; enforce utility floor by clamping variance per query type.
6. **Audit hooks:** Each decision emits structured log with inputs (classification, jurisdictions, query type), epsilon charged, renewal ETA, and DP mechanism.

## Rationale

- Prevents reconstruction by throttling high-sensitivity sequences.
- Balances utility by topology-aware noise selection and clamped variance.
- Establishes prior art for budget governance heuristics tied to graph/federated workloads.

## Implementation sketch (pseudocode)

```typescript
function chargeBudget(query, org) {
  let epsilon = 0.1;
  if (query.includesPersonalData) epsilon += 0.5;
  if (query.crossesJurisdictions) epsilon += 0.3;
  if (query.classification >= SECRET) epsilon += 0.2;
  if (query.isJoinHeavy) epsilon *= 1.25;
  if (query.expandsTimeWindow) epsilon *= 1.15;

  const budget = ledger[org];
  if (budget.remaining < epsilon) return denyWithRetryWindow();

  budget.remaining -= epsilon;
  scheduleRenewal(org, query.timeWindow);

  const mech = query.isGraphTraversal ? "gaussian" : "laplace";
  const variance = clampVariance(mech, query.utilityFloor);
  logDecision(query, org, epsilon, mech, variance);
  return { epsilon, mech, variance };
}
```
