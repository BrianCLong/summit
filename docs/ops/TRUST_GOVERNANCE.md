# Trust Governance

This document describes how we enforce the Trust Metrics defined in `TRUST_METRICS.md`.

## The Governance Hook

We utilize a lightweight script `scripts/ops/generate-trust-snapshot.sh` that acts as the single source of truth for our metrics.

### Usage

```bash
# Generate a snapshot (JSON output)
./scripts/ops/generate-trust-snapshot.sh --json

# Human readable summary
./scripts/ops/generate-trust-snapshot.sh
```

## Integration Points

1.  **Local Dev**: Developers can run this script to ensure they aren't breaking hygiene before pushing.
2.  **Weekly Ops**: The Ops Lead runs this on Monday to populate the Weekly Trust Report.
3.  **CI (Optional)**: This script can be added to the end of the CI pipeline as a non-blocking informational step.

## Policy

*   **No "Blind" overrides**: If a metric is Red, it must be acknowledged in the Weekly Report with a remediation plan.
*   **Metric Changes**: Changing the definition of a metric in `scripts/ops/generate-trust-snapshot.sh` requires a PR review from the Governance Owner.
