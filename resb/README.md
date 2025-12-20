# Rare-Event Synthetic Booster (RESB)

RESB is a Python toolkit for constraint-aware oversampling of rare events. It blends a SMOTE-style generator, denial-constraint guards, and differential privacy (DP) noise to produce high-fidelity boost sets alongside audit artefacts.

## Features

- **Class-conditional synthesis** with a deterministic SMOTE variant.
- **Denial constraints** enforce application-specific invariants through composable validators.
- **Differential privacy noise** adds calibrated Gaussian perturbations with auditable budgets.
- **Utility & fidelity reports** summarise balance, drift, and uplift in recall within a target precision band.
- **Leakage auditor** flags near-duplicates between source and synthetic samples.

## Quick start

```python
from resb import RESBConfig, RESBGenerator, GreaterEqualConstraint

config = RESBConfig(
    target_column="label",
    epsilon=2.0,
    delta=1e-5,
    seed=41,
)

gen = RESBGenerator(config)
result = gen.boost(df)

print(result.reports.utility["rare_class_recall"])
print(result.auditor.closest_distance)
```

See the inline documentation for usage guidance and refer to the tests for end-to-end examples.
