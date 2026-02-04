# Privacy Graph Analytics

## Overview
This module provides privacy-preserving graph construction and analytics for sensitive telemetry.

## Architecture
1.  **Events**: Consumed as `GraphEvent` (already anonymized).
2.  **Builder**: `GraphBuilder` creates `GraphFrame` with strict feature allowlisting.
3.  **Policy**: `PrivacyGraphPolicy` enforces deny-by-default and DP requirements.
4.  **Backend**: Computations run on `SecureBackend` (plaintext or he_simulated).

## Configuration
See `src/summit/privacy_graph/config.py`.

```python
cfg = PrivacyGraphConfig(
    enabled=True,
    require_dp=True,
    dp_epsilon=1.0,
    dp_delta=1e-5,
    backend="plaintext"
)
```

## Evidence
Every run produces:
- `report.json`: Summary and config used.
- `metrics.json`: DP parameters and graph stats.
- `stamp.json`: Timestamp and actor.

## CI Gates
- `tools/ci/privacy_graph_gate.py`: Scans for PII patterns.
- `tools/ci/dependency_delta_gate.py`: Enforces dependency tracking.
