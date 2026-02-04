# Data Reconciler Module

This module provides semantic reconciliation capabilities to detect "silent failures" in data ingestion pipelines. A common failure mode in complex data platforms (like Snowflake with raw JSON ingestion) is that a `COPY INTO` or ingestion job reports "Success", but the actual data loaded is incorrect (e.g., all NULLs, missing fields, or type mismatches) due to subtle file format or schema misunderstandings.

## Purpose

The `reconcile_expected_vs_actual` function performs a strict, row-by-row, key-by-key comparison between an `expected` dataset (the "ground truth" or "contract") and the `actual` dataset loaded into the target system.

## Usage

```python
from modules.reconciler.reconcile import reconcile_expected_vs_actual

expected_data = [{"id": 1, "status": "active"}]
actual_data = [{"id": 1, "status": None}] # Silent failure!

ok, violations = reconcile_expected_vs_actual(expected_data, actual_data)

if not ok:
    print("Reconciliation failed:", violations)
    # Output: ["MISMATCH row=0 key=status expected='active' actual=None"]
```

## Integration

This module is designed to be used in CI/CD gates (`gate.fileformat`) and post-load quality checks to ensure that "green" pipelines are actually producing correct data.
