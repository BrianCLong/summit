# Snowflake Operability Module

This module implements the "Snowflake Operability Contract" as defined in the Summit master plan. It provides policy evaluation logic to ensure data pipelines adhere to strict reliability, cost, and correctness standards.

## Policies

The module enforces the following policies (based on real-world failure modes):

1.  **Late Data Policy (`late_data_policy`)**: Ensures late-arriving data is detected and handled (e.g., via backfill or watermark adjustment) rather than silently ignored.
    *   *Failure Mode:* Missed records, incorrect aggregates.
2.  **Schema Drift Policy (`schema_contract`)**: Ensures schema changes are detected and validated against a contract.
    *   *Failure Mode:* Load succeeds but columns are mis-typed or null; downstream queries break.
3.  **File Format Correctness (`file_format_checks`)**: Specifically targets "silent JSON ingestion failures" where data loads successfully but parsed values are wrong (e.g., due to file format misunderstandings).
    *   *Failure Mode:* "Success" status with semantic corruption.
4.  **Cost Budget Policy (`cost_budget`)**: Enforces budget envelopes to prevent runaway compute spend.
    *   *Failure Mode:* Unexpected cost spikes, resource exhaustion.

## Usage

The `evaluate_operability` function takes a list of pipeline event logs and returns an `OperabilityResult` indicating success or failure with a list of violations.

### Example

```python
from modules.snowflake_operability.policy import evaluate_operability

events = [
    {"marker": "late_data_policy", "status": "success"},
    {"marker": "schema_contract", "status": "success"},
    {"marker": "file_format_checks", "status": "success"},
    {"marker": "cost_budget", "status": "success", "cost": 5.0}
]

result = evaluate_operability(events)
if not result.ok:
    print("Pipeline failed operability checks:", result.violations)
```

## Deny-by-Default

The policy evaluator requires **explicit presence** of all four markers. If a marker is missing, the check fails (`MISSING_MARKER`). This ensures that pipelines cannot accidentally bypass checks by simply not reporting them.
