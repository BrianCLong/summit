# Universal Architecture Runbook

## Feature Flags
To enable Universal Architecture features, set the following flags:
- `FEATURE_UNIVERSAL_ARCH_CLASSIFIER=true`
- `FEATURE_UNIVERSAL_APPROVAL_GATE=true`
- `FEATURE_UNIVERSAL_DRIFT_MONITOR=true`

## Reading Reports
- `report.json`: Contains the eval scores and any required control failures.
- `metrics.json`: Contains the latency, memory usage, and cost overhead.

## Troubleshooting
- **Eval-gate failure**: Ensure the workflow specifies structured context, validation, and eval gates. Check the missing controls listed in `report.json`.
- **Approval denials**: Check the rejected payload in `approval-decision.json`. Ensure the operation kind is permitted for the given scope, or seek a manual review.

## Rollback
To revert to a docs-only integration, set the feature flags mentioned above to `false`.

## Updating Golden Fixtures
1. Add new payloads to `fixtures/universal_arch/`
2. Run `npm run test:update-fixtures` to confirm.
