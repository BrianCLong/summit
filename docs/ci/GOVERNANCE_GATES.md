# Governance Gates

## Overview

The governance meta-gate provides a single required check that validates:
1. **Required Checks Policy** - Ensures all policy-referenced checks exist in workflows
2. **Determinism Scan** - Validates evidence artifacts contain no timestamps
3. **Branch Protection Audit** - Verifies GitHub branch protection matches the policy

## Check Name

The canonical check name for branch protection is:
```
Governance Meta Gate / meta-gate
```

## Gate States

### Branch Protection Audit States

| State | Description | Blocks Merge? |
|-------|-------------|---------------|
| VERIFIED_MATCH | GitHub settings match policy | No |
| VERIFIED_DRIFT | GitHub settings differ from policy | Yes |
| UNVERIFIABLE_PERMISSIONS | Insufficient token permissions | No |
| UNVERIFIABLE_ERROR | API error during check | No |
| RATE_LIMITED | GitHub API rate limited | No |

**Important**: UNVERIFIABLE states do NOT block merges.

## Blocking Rules

Blocks merges only when:
- Policy validation returns FAIL
- Determinism scan returns FAIL
- Branch protection returns VERIFIED_DRIFT

Does NOT block when:
- Branch protection returns UNVERIFIABLE_* states

## Evidence Artifacts

Evidence files in `artifacts/governance/`:
- `required-checks-policy.evidence.json`
- `determinism-scan.evidence.json`
- `branch-protection.evidence.json`
- `meta-gate.summary.json`

## Rollout

1. Merge workflow and scripts
2. Add `Governance Meta Gate / meta-gate` to REQUIRED_CHECKS_POLICY.yml
3. Add to GitHub branch protection required checks
4. Monitor for UNVERIFIABLE states
