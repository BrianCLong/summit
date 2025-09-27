# Synthetic Entity Graph Forge (SEGF)

SEGF is a synthetic data generator tailored for graph-centric fraud analytics
prototyping. It produces lifecycled entity populations, rich event streams, and
explicit graph motifs such as coordinated fraud rings. Outputs include
columnar tables (Parquet) and a `GraphML` network that can be ingested into
network tooling and GNN stacks.

## Features

- **Entities** – users, devices, and merchants with configurable population
  sizes, lifecycle spans, and behavioural segments.
- **Temporal events** – signup, transaction, and chargeback events emitted from
  lifecycle periods with stochastic intensity control.
- **Fraud motifs** – optional fraud rings that share devices and merchants to
  recreate synthetic collusion patterns.
- **Concept drift** – drift windows alter event frequencies and chargeback risk
  with explicit labelling for supervised degradation experiments.
- **Deterministic runs** – seeds guarantee reproducibility across generations.
- **Validation** – built-in validator compares generated corpora against target
  ratios, drift multipliers, and reproducibility requirements.

## Quick start

```python
from pathlib import Path

from segf import (
    DriftScenario,
    SegfConfig,
    SyntheticEntityGraphForge,
    TargetStats,
    SegfValidator,
)

config = SegfConfig(
    drift_scenarios=[
        DriftScenario(name="holiday_spike", start_day=20, end_day=35, fraud_multiplier=1.4, chargeback_multiplier=2.0),
    ],
)
forge = SyntheticEntityGraphForge(config)
result = forge.generate()
result.write(Path("./segf-output"))

validator = SegfValidator(
    TargetStats(
        expected_user_fraud_ratio=config.population.fraud_user_ratio,
        expected_chargeback_rate=config.events.chargeback_prob_fraud * 0.5,
        expected_daily_transactions=config.events.daily_txn_rate_legit,
        drift_windows={"holiday_spike": {"chargeback_multiplier": 2.0}},
    )
)
report = validator.evaluate(users=result.users, events=result.events, lifecycles=result.lifecycles)
print(report.within_tolerance)
```

## Repository layout

- `config.py` – dataclasses for generator configuration.
- `generator.py` – end-to-end graph and event synthesis logic.
- `validator.py` – scoring utilities for realism and reproducibility.
- `notebooks/` – starter notebooks for exploring baseline and drift scenarios.
- `tests/` – pytest coverage for deterministic generation and validation.

See the notebooks for end-to-end walkthroughs and drift experiments.
