# Branch Protection Drift Detection

**Status:** Active (MVP-4)
**Owner:** Platform Engineering
**Last Updated:** 2026-01-14

---

## Overview

Branch Protection Drift Detection ensures that your policy-as-code (`REQUIRED_CHECKS_POLICY.yml`) stays in sync with GitHub's actual branch protection enforcement. This prevents a common "silent failure" where the repo's documented policy differs from what GitHub actually enforces.

### The Problem

Without drift detection:

- A check is added to policy but forgotten in branch protection → PRs merge without the check
- A check is removed from branch protection but stays in policy → Documentation lies
- Permission changes allow direct pushes → Policy is bypassed entirely

### The Solution

Automated daily comparison that:

1. Extracts required checks from policy (`branch_protection` section)
2. Queries GitHub branch protection API
3. Reports mismatches (Missing vs Extra)
4. Filters out allowed exceptions (`REQUIRED_CHECKS_EXCEPTIONS.yml`)
5. Creates/updates deduped issues when drift exists

---

## How It Works

### Script

The detection logic uses a Node.js script: `scripts/ci/check_branch_protection_drift.mjs`.

```bash
# Run drift check
node scripts/ci/check_branch_protection_drift.mjs --branch main
```

### Policy

The script reads `docs/ci/REQUIRED_CHECKS_POLICY.yml`, specifically the `branch_protection.required_status_checks.contexts` section.

### Exceptions

The script reads `docs/ci/REQUIRED_CHECKS_EXCEPTIONS.yml` to filter out known/allowed mismatches.

### Workflow

The `.github/workflows/branch-protection-drift.yml` workflow runs daily and on policy changes.

---

## Drift Categories

### Missing in GitHub

Checks that are listed in `REQUIRED_CHECKS_POLICY.yml` but NOT enforced in GitHub branch protection.

**Risk:** PRs can merge without these checks passing.

**Remediation:** Add the checks to GitHub branch protection settings.

### Extra in GitHub

Checks that are enforced by GitHub but NOT listed in `REQUIRED_CHECKS_POLICY.yml`.

**Risk:** Documentation is inaccurate; policy doesn't reflect reality.

**Remediation:** Either add to policy or remove from GitHub branch protection.

---

## Running Locally

### Prerequisites

- Node.js 18+
- `gh` CLI authenticated with repo access
- Dependencies installed (`pnpm install`)

### Commands

```bash
# Check main branch
node scripts/ci/check_branch_protection_drift.mjs --branch main

# Check specific repo
node scripts/ci/check_branch_protection_drift.mjs --repo owner/repo --branch main

# Output to custom directory
node scripts/ci/check_branch_protection_drift.mjs --out artifacts/report
```

### Exit Codes

- `0`: Success (Drift may be detected, but script execution was successful)
- `1`: Reserved
- `2`: Error (API failure, config error)

Check the JSON output `drift_detected` field to see if drift was found.

---

## Issue Management

### Deduplication

Issues are deduplicated by a key combining:

- Branch name
- Number of missing checks
- Number of extra checks

If the drift signature changes, a new issue is created.

### Auto-Close

When drift is resolved, existing drift issues are automatically closed with a resolution comment.

---

## Required Permissions

### GitHub Token

The workflow needs:

- `contents: read` - To read policy files
- `issues: write` - To create/update drift issues
- `actions: read` - To access workflow context

### Branch Protection API

Reading branch protection requires one of:

- Admin access to the repository
- `read:org` scope (for organization repos)

---

## References

- **Script**: `scripts/ci/check_branch_protection_drift.mjs`
- **Workflow**: `.github/workflows/branch-protection-drift.yml`
- **Policy File**: `docs/ci/REQUIRED_CHECKS_POLICY.yml`
- **Exceptions File**: `docs/ci/REQUIRED_CHECKS_EXCEPTIONS.yml`
