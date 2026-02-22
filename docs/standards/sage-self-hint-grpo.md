# SAGE: Self-Hint Aligned GRPO (Summit Implementation)

## Overview
SAGE injects privileged hints during training to increase within-group outcome diversity under sparse terminal rewards, while deploying a no-hint policy at inference time.

## Interfaces
* **SAGEConfig**: Controls enablement, hint levels, and strict inference checks.
* **HintGenerator**: Protocol for generating hints from reference solutions (τ*).
* **SageRolloutWrapper**: Wraps rollout functions to inject hints.

## Usage
Enable via config:
```python
config = SAGEConfig(enabled=True, hint_levels=[1])
```

Strictly disable for inference:
```python
config = SAGEConfig(enabled=False)
# OR ensure mode="inference" is passed to wrapper
```
