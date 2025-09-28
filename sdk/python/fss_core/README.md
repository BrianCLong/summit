# fss-core

`fss-core` provides the Freshness & Staleness Scorer (FSS), a Python toolkit for
modeling document freshness using configurable decay kernels and source-specific
half-lives.

## Features

- Exponential and hyperbolic decay kernels with consistent half-life semantics.
- Source-specific and default half-life controls with "last verified" override.
- Re-ranking utilities for RAG systems that multiply relevance by freshness.
- Deterministic offline evaluation scripts with seeds and reproducible defaults.
- Example dataset, ablation notebook, and scripts for comparing kernels.

## Installation

```bash
pip install -e .[dev]
```

## Usage

```python
from datetime import datetime, timezone, timedelta
from fss_core import ContentRecord, FreshnessConfig, FreshnessScorer, DecayKernel

config = FreshnessConfig(
    default_half_life_hours=72,
    source_half_lives={"official": 48, "news": 24},
    kernel=DecayKernel.EXPONENTIAL,
)
scorer = FreshnessScorer(config=config, now=datetime(2025, 2, 1, tzinfo=timezone.utc))
record = ContentRecord(
    source="official",
    published_at=datetime(2025, 1, 10, tzinfo=timezone.utc),
    last_verified_at=datetime(2025, 1, 12, tzinfo=timezone.utc),
)
print(scorer.score(record))
```

## Offline evaluation

Reproduce the sample evaluation with deterministic seeds:

```bash
python -m fss_core.scripts.evaluate_rag \
  --dataset fss_core/testdata/time_sensitive_qa.json \
  --kernel exponential \
  --as-of 2025-02-01T00:00:00Z
```

Run kernel ablations:

```bash
python -m fss_core.scripts.run_ablation \
  --dataset fss_core/testdata/time_sensitive_qa.json \
  --as-of 2025-02-01T00:00:00Z
```

Both scripts emit JSON summaries suitable for dashboards or regression checks.

## Notebook

The `notebooks/ablation_analysis.ipynb` notebook mirrors the CLI results and can
be executed end-to-end via `jupyter lab` for interactive exploration.
