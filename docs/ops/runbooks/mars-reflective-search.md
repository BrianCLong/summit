# Runbook: MARS Reflective Search

## Overview
MARS provides a budget-aware agent loop for automated research tasks.

## Operational Tasks
### Running a Dry Run
```bash
python -m summit.mars.run --dry-run --budget 10.0
```

### Checking for Drift
```bash
python scripts/monitoring/mars-drift.py
```

## Troubleshooting
- **Budget Exceeded**: Increase `--budget` or optimize task decomposition.
- **Determinism Failure**: Check for unseeded random calls or unstable sorting in custom tasks.
- **Validation Error**: Ensure artifacts match schemas in `evidence/schemas/`.
