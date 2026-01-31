# Runbook: SSDF v1.2 Subsumption Bundle

## Overview
This runbook covers the operation and troubleshooting of the SSDF v1.2 subsumption bundle and its CI verification.

## Failure Modes

### 1. `subsumption-verify` job fails
**Symptoms:** CI checks fail on a PR.
**Possible Causes:**
- Missing required docs.
- Missing evidence index entries.
- Nondeterministic evidence (timestamps in report/metrics).
- Manifest syntax error.
- PR cap exceeded.

**Action Steps:**
1. Check the CI logs for `Verify SSDF v1.2 subsumption bundle`.
2. The verifier prints specific error messages (e.g., "Missing required doc: ...").
3. Fix the missing artifact or correct the manifest.
4. If it's a timestamp issue, ensure tools generating evidence use fixed timestamps or exclude them from report/metrics.

### 2. Drift Monitor Alerts (Future)
**Symptoms:** Scheduled drift check fails.
**Action Steps:**
1. Investigate if files were deleted or modified outside of standard PRs.
2. Revert unauthorized changes or update the bundle to reflect new state.

## Alerts
- CI Failure: Standard GitHub Actions notification.

## Maintenance
- **Update Mapping:** Edit `subsumption/ssdf-v1-2/mapping_registry.json`.
- **Add Evidence:** Add file, update `evidence/index.json`.
