# Fairness-Constrained Trainer (FCT)

The FCT toolkit provides in-processing and post-processing utilities for building binary classifiers subject to fairness constraints:

- **In-processing** logistic regression with Lagrangian penalties enforcing Demographic Parity, Equal Opportunity, or Equalized Odds.
- **Post-processing** threshold adjuster to equalize group-level rates after any probabilistic model.
- **Metrics** for demographic parity difference, true positive rate gaps, and derived fairness reports.
- **Pareto frontier** computation and plotting to understand accuracy–fairness trade-offs under fixed random seeds.
- **Policy gate** to block deployments when model metrics fall outside an approved fairness envelope.

## Quick start

```python
from tools.fct import (
    FairnessConstraint,
    LagrangianFairClassifier,
    ThresholdAdjuster,
    ParetoFrontier,
    FairnessEnvelope,
    PolicyGate,
    fairness_report,
)

# Train a fairness-aware classifier
clf = LagrangianFairClassifier(
    constraint=FairnessConstraint.EQUALIZED_ODDS,
    tolerance=0.03,
    epochs=300,
    seed=123,
)
clf.fit(X_train, y_train, sensitive_train)
proba = clf.predict_proba(X_valid)
report = fairness_report(y_valid, proba, sensitive_valid)

# Apply post-processing thresholds if needed
adjuster = ThresholdAdjuster(FairnessConstraint.EQUALIZED_ODDS, tolerance=0.03)
adjuster.fit(y_valid, proba, sensitive_valid)
post_processed_predictions = adjuster.transform(proba, sensitive_valid)

# Plot Pareto frontier across tolerances
tolerances = [0.10, 0.05, 0.03, 0.01]
frontier = ParetoFrontier(FairnessConstraint.EQUALIZED_ODDS, tolerances, seed=123)
points = frontier.compute(X_train, y_train, sensitive_train, X_valid, y_valid, sensitive_valid)
ax = frontier.plot(points)
ax.figure.savefig("pareto.png")

# Enforce fairness policy gate
envelope = FairnessEnvelope(demographic_parity_diff=0.08, tpr_gap=0.05, fpr_gap=0.05)
PolicyGate(envelope).approve(report)
```

The `PolicyGate` raises a `PolicyViolation` if any monitored metric exceeds the configured envelope, allowing automated pipelines to block unsafe deployments.
