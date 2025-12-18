# SRE Integration Guide

This directory contains resources for integrating the Summit Reasoning Evaluator (SRE) into the broader Summit/IntelGraph ecosystem.

## Architecture
SRE is designed as a **sidecar** or **post-processing** step for Summit runs.
The integration pattern is:
1.  **Summit** executes a workflow and emits a `RunTrace` (events).
2.  **Adapter** converts `RunTrace` -> `SRE Episode`.
3.  **Evaluator** computes metrics on the `Episode`.
4.  **Telemetry** pushes results to Grafana/Prometheus.

## Quick Start
See `summit_example.py` for a runnable reference implementation of the adapter pattern.

```bash
python integration/summit_example.py
```

## API Hook
To register SRE as a callback in Summit:

```python
from summit.core import events
from sre.sdk import Evaluator

@events.on_run_complete
def run_eval(run_context):
    evaluator = Evaluator(config_path="sre_config.yaml")
    report = evaluator.evaluate(run_context.trace)
    events.emit("eval_complete", report)
```
