# Governance Checks Runbook

This document describes the governance automation behavior, drift detection states, and on-call procedures.

## Drift Audit States

The branch protection drift detection produces one of these states:

| State                      | Description                           | Workflow Outcome | Issue Behavior                 |
| -------------------------- | ------------------------------------- | ---------------- | ------------------------------ |
| `VERIFIED_MATCH`           | Branch protection matches policy      | Exit 0 (success) | Close existing drift issue     |
| `VERIFIED_DRIFT`           | Branch protection differs from policy | Exit 1 (failure) | Create or update drift issue   |
| `UNVERIFIABLE_PERMISSIONS` | Insufficient token permissions        | Exit 0 (warning) | Comment on existing issue only |
| `UNVERIFIABLE_ERROR`       | API or configuration error            | Exit 2 (error)   | No issue action                |
| `RATE_LIMITED`             | GitHub API rate limit hit             | Exit 0 (warning) | No issue action                |
| `NO_PROTECTION`            | Branch has no protection configured   | Exit 0 (warning) | Close existing drift issue     |

## State Transitions

### VERIFIED_DRIFT to VERIFIED_MATCH

When drift is resolved:

1. Drift detection reports `VERIFIED_MATCH`
2. Resolution comment is added to drift issue
3. Issue is closed with reason "completed"
4. No on-call action needed

### UNVERIFIABLE*PERMISSIONS to VERIFIED*\*

When elevated permissions become available:

1. Detection now returns `VERIFIED_MATCH` or `VERIFIED_DRIFT`
2. If `VERIFIED_MATCH`: issue is closed
3. If `VERIFIED_DRIFT`: issue is updated with current diff

### Any State to UNVERIFIABLE\_\*

When permissions are lost:

1. Detection reports `UNVERIFIABLE_*`
2. Comment added to existing open issue (if any)
3. No new issue created
4. No false drift claim

## Running Governance Checks

### Local Development

Run all governance checks locally:

```bash
pnpm governance:check
```

This runs:

1. Policy reference validator
2. Determinism scanner
3. Branch protection drift check (offline mode)

### CI Environment

Governance checks run automatically on PRs when these paths change:

- `.github/workflows/**`
- `docs/ci/REQUIRED_CHECKS_POLICY.yml`
- `scripts/ci/**`

### Live Branch Protection Audit

To run a live branch protection audit (requires admin permissions):

```bash
# Using gh CLI (recommended)
gh auth login --scopes admin:repo_hook,repo

# Run the audit
node scripts/ci/check_branch_protection_drift.mjs \
  --repo owner/repo \
  --branch main \
  --policy docs/ci/REQUIRED_CHECKS_POLICY.yml
```

### Offline Mode (Fixtures)

For local development without API access:

```bash
# Use fixture data
GOVERNANCE_OFFLINE=1 node scripts/ci/check_branch_protection_drift.mjs
```

## Permissions

### Required Permissions

Branch protection drift detection requires:

- `administration:read` - Read branch protection rules

### Obtaining Permissions

Recommended approach (GitHub App):

1. Create a GitHub App with `administration:read` permission
2. Install on the repository
3. Use app token in CI

Alternative (PAT):

1. Generate a fine-grained PAT with `administration:read`
2. Store as repository secret `ADMIN_TOKEN`
3. Use in workflow: `${{ secrets.ADMIN_TOKEN }}`

### Security Posture

- Tokens are never logged or included in artifacts
- Issue bodies contain only normalized diffs (no raw API data)
- Rate limit errors are handled gracefully (exit 0)
- Permission errors produce warnings, not failures

## Troubleshooting

### Drift Issue Not Closing

If a drift issue remains open after resolution:

1. Verify the check ran successfully (green status)
2. Check if the issue has the `branch-protection-drift` label
3. Verify the issue body contains the hidden marker

Manual resolution:

```bash
gh issue close <number> --repo owner/repo --reason completed
```

### Duplicate Drift Issues

The system uses stable markers to prevent duplicates. If duplicates exist:

1. Check for label `branch-protection-drift`
2. Close older duplicates manually
3. Verify only one issue has the correct hidden marker

### Permission Denied Errors

If you see "Resource not accessible by integration":

1. Check token has `administration:read` scope
2. Verify token is valid and not expired
3. For GitHub Apps, verify installation is active

### Rate Limiting

If rate limited:

1. Check is marked as passed (exit 0)
2. Warning message indicates rate limit status
3. Retry after rate limit window (typically 1 hour)

## Evidence Artifacts

Governance checks produce deterministic evidence artifacts:

| Artifact       | Path                                                      | Description                     |
| -------------- | --------------------------------------------------------- | ------------------------------- |
| Drift Report   | `artifacts/governance/branch-protection-drift/drift.json` | JSON report with state and diff |
| Drift Markdown | `artifacts/governance/branch-protection-drift/drift.md`   | Human-readable report           |
| Stamp          | `artifacts/governance/branch-protection-drift/stamp.json` | Run metadata                    |

All artifacts are:

- Deterministic (stable serialization)
- Verifiable (SHA hashes where applicable)
- Safe (no secrets or tokens)
