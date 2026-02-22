# Cost Circuit Breaker Module

This module provides a safety mechanism to halt pipeline execution when cost budgets are exceeded. It directly addresses the "Compute/cost spikes" failure mode.

## Feature Flag

The circuit breaker is **disabled by default** to prevent accidental production outages.

To enable it, set the environment variable:
`SUMMIT_COST_BREAKER=1`

## Usage

```python
from modules.cost_breaker import breaker

current_spend = 120.00
budget_limit = 100.00

if not breaker.check_budget_limit(current_spend, budget_limit):
    raise RuntimeError("Budget exceeded! Halting execution.")
```

## Logic

*   **Disabled (Default):** `check_budget_limit` always returns `True`.
*   **Enabled:** `check_budget_limit` returns `False` if `current_spend > budget_limit`.
