# Graph Shape Guardrail

Detect silent graph-mapping / ETL regressions via degree-distribution "shape" drift.

## Overview

The Graph Shape Guardrail monitors the degree distribution of specific node labels in the graph. It uses deterministic bottom-k hash sampling to compute:
- **Skewness**: The third standardized moment of the degree distribution.
- **Top-k Mass**: The proportion of total degrees held by the top 1% of nodes.

Significant shifts in these metrics compared to a 7-14 day baseline trigger alerts.

## Configuration

Configuration is managed in `configs/graph_shape_guardrail.yaml`.

## Usage

```bash
PYTHONPATH=tools/graph-shape-guardrail python3 -m graph_shape_guardrail.main --config configs/graph_shape_guardrail.yaml
```

## Evidence Artifacts

Each run produces:
- `metrics.json`: Per-label metrics.
- `report.json`: Baseline comparisons and pass/fail status.
- `stamp.json`: Reproducibility metadata.
