# Summit CI/CD Documentation

## Overview

Summit uses GitHub Actions with **reusable workflows** for reproducible, governance-compliant CI/CD.

## Architecture

```
.github/workflows/
  _reusable-*.yml      # Shared workflow components (prefixed with _)
  ci-core.yml          # Primary CI gate - BLOCKING
  ci-legacy.yml        # Legacy workflows (being deprecated)
  *-canary.yml         # Canary rollout workflows
  branch-protection-*  # Branch protection management
```

## Key Workflows

### Primary CI Gate (`ci-core.yml`)

**Status**: BLOCKING - PRs cannot merge if any job fails.

| Job                 | Purpose                                  | Timeout |
| ------------------- | ---------------------------------------- | ------- |
| `config-preflight`  | Validate Jest & pnpm configuration       | 3m      |
| `lint-typecheck`    | ESLint (strict, 0 warnings) + TypeScript | 10m     |
| `unit-tests`        | Unit test suite with coverage            | 15m     |
| `integration-tests` | Integration tests with services          | 20m     |
| `ga-verification`   | GA readiness checks                      | 10m     |
| `governance-gate`   | Governance lockfile verification         | 5m      |

### Required Checks for Branch Protection

Configure these in repo Settings > Branches > main:

```
ci-core / config-preflight
ci-core / lint-typecheck
ci-core / unit-tests
ci-core / integration-tests
ci-core / ga-verification
ci-core / governance-gate
```

## Concurrency Control

All workflows use branch-scoped concurrency to prevent stale runs:

```yaml
concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true
```

This ensures:

- New pushes to a branch cancel in-progress runs for that branch
- Runs on different branches proceed in parallel
- Release jobs use stricter groups to prevent parallel releases

## Reusable Workflows

### `_reusable-ci-metrics.yml`

Collects CI metrics for trend analysis and canary comparison.

**Inputs:**

- `workflow_name`: Name of calling workflow (required)
- `run_type`: `canary | main | pr` (default: `pr`)
- `include_job_timings`: Include per-job breakdown (default: `true`)

**Outputs:**

- `metrics_artifact_name`: Uploaded artifact name
- `total_duration_minutes`: Workflow duration
- `success_rate`: Job success percentage (0-100)

**Usage:**

```yaml
jobs:
  # ... your jobs ...

  metrics:
    needs: [your-jobs]
    if: ${{ always() }}
    uses: ./.github/workflows/_reusable-ci-metrics.yml
    with:
      workflow_name: "my-workflow"
      run_type: "pr"
```

### `_reusable-governance-gate.yml`

Verifies governance lockfile and compliance controls.

**Inputs:**

- `require_lockfile`: Require lockfile to exist (default: `true`)
- `strict_mode`: Treat warnings as errors (default: `true`)
- `max_lockfile_age`: Max age in days (default: `7`)

**Outputs:**

- `governance_status`: `OK | WARNING | CRITICAL`
- `governance_score`: Health score (0-100)
- `passed`: Boolean pass/fail

### `_reusable-slsa-build.yml`

SLSA Level 3 compliant container builds with SBOM and provenance.

**Features:**

- Reproducible builds (deterministic timestamps)
- SBOM generation via Syft
- SLSA provenance attestation
- Cosign signing
- Multi-platform support

## Actions Pinning

All actions are pinned to SHA hashes in `.github/actions-lock.json`:

```json
{
  "actions/checkout": {
    "version": "v4",
    "sha": "8e8c483db84b4bee98b60c0593521ed34d9990e8"
  }
}
```

**Update Policy:**

- Monthly review of pinned versions
- Require security team approval for updates
- Auto-update disabled for supply chain safety

## Canary Rollout Process

1. **Enable canary** on develop branch
2. **Collect metrics** for 3-5 days
3. **Compare** using `scripts/ci/compare_canary_metrics.mjs`
4. **Promote to main** if metrics pass thresholds

### Canary Comparison

```bash
# Download artifacts
gh run download <canary-run-id> -n ci-metrics-* -D ./canary-metrics
gh run download <baseline-run-id> -n ci-metrics-* -D ./baseline-metrics

# Compare
node scripts/ci/compare_canary_metrics.mjs \
  --canary-dir ./canary-metrics \
  --baseline-dir ./baseline-metrics \
  --threshold 5
```

**Pass Criteria:**

- Success rate: No more than 5% decrease
- Duration: No more than 5% increase
- Queue time: No more than 10% increase

## Branch Protection Reconciliation

Automated alignment of GitHub branch protection with policy:

```bash
# Plan mode (dry run)
gh workflow run branch-protection-reconcile.yml \
  -f branch=main \
  -f mode=plan

# Apply mode (requires admin + confirmation)
gh workflow run branch-protection-reconcile.yml \
  -f branch=main \
  -f mode=apply \
  -f confirm_apply="I UNDERSTAND"
```

## Governance Gate

The governance gate ensures:

1. **Lockfile exists** and is valid
2. **Age check** - lockfile not older than 7 days
3. **Hash verification** - lockfile matches expected state
4. **Score threshold** - governance score >= 80

### Refreshing Governance Lockfile

```bash
./scripts/release/refresh_governance_lockfile.sh
git add docs/releases/_state/governance_lockfile.json
git commit -m "chore: refresh governance lockfile"
```

## Troubleshooting

### "Required check not found"

Branch protection references a check name that doesn't exist. Run:

```bash
gh workflow run branch-protection-reconcile.yml -f mode=plan
```

### Workflow stuck in queue

Check concurrency groups - a prior run may be blocking:

```bash
gh run list --workflow=ci-core.yml --limit=10
gh run cancel <run-id>  # Cancel stale run
```

### Governance gate failing

1. Check lockfile age: `cat docs/releases/_state/governance_lockfile.json | jq .timestamp`
2. Refresh if stale: `./scripts/release/refresh_governance_lockfile.sh`
3. Verify controls: `./scripts/release/verify_governance_controls.sh`

## Related Documentation

- [GOVERNANCE_LOCKFILE.md](./GOVERNANCE_LOCKFILE.md) - Lockfile format and verification
- [BRANCH_PROTECTION_RECONCILIATION.md](./BRANCH_PROTECTION_RECONCILIATION.md) - Protection alignment
- [CANARY_ROLLOUT.md](./CANARY_ROLLOUT.md) - Canary promotion process
- [ACTIONS_PINNING.md](./ACTIONS_PINNING.md) - SHA pinning policy
- [daily/2026-01-29-ci-cd-daily.md](./daily/2026-01-29-ci-cd-daily.md) - CI/CD daily report
