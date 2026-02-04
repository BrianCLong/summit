# Geometry Monitor

The Geometry Monitor observes internal agent activations (embeddings) to estimate the local intrinsic dimension of the agent's representation space. This serves as a proxy for "uncertainty" or "complexity".

## Theory

Based on [arXiv:2507.22010](https://www.arxiv.org/abs/2507.22010), high local dimension corresponds to moments of high uncertainty or branching factor in the agent's policy, while low dimension corresponds to committed sub-strategies.

We use a Volume Growth Transform (VGT) inspired method:
$d \approx \frac{\log(k_2/k_1)}{\log(r_{k_2}/r_{k_1})}$

## Usage

### Configuration

Enable the monitor via `GeometryMonitorConfig`:
```python
from summit.geometry.config import GeometryMonitorConfig
cfg = GeometryMonitorConfig(enabled=True, max_points=64)
```

### Observation

Pass a batch of activations (e.g. from attention heads or MLP layers) to the monitor:
```python
monitor = GeometryMonitor(cfg)
event = monitor.observe(activations, meta={"episode_id": "...", "step": 1})
if event:
    print(f"Complexity: {event.complexity_score}")
```

### Events

The monitor emits `GeometryComplexityEvent` containing:
- `complexity_score`: Average local dimension.
- `local_dim_mode`: Median local dimension.
- `vgt_curve`: Distribution of local dimensions.

## Evidence & Verification

Run the verification suite:
```bash
python3 tools/ci_verify_geometry.py
```

This runs unit tests and a synthetic evaluation that generates evidence artifacts in `evidence/geometry_eval/`.
