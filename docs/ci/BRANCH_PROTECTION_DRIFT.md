# Branch Protection Drift Detection

**Status:** Active (MVP-4)
**Owner:** Platform Engineering
**Last Updated:** 2026-02-01

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

1. Extracts always-required checks from policy
2. Queries GitHub branch protection API
3. Reports mismatches with remediation steps
4. Creates/updates deduped issues when drift exists

---

## How It Works

### Policy Extraction

The `extract_required_checks_from_policy.sh` script reads `REQUIRED_CHECKS_POLICY.yml` and extracts check names from the `branch_protection.required_status_checks.contexts` section (the canonical list of checks that should be enforced in GitHub branch protection).

```bash
# Extract policy requirements
./scripts/release/extract_required_checks_from_policy.sh

# Output:
{
  "always_required": [
    "CI Core (Primary Gate)",
    "CI / config-guard",
    "CI / unit-tests",
    "GA Gate",
    "Release Readiness Gate",
    "SOC Controls",
    "Unit Tests & Coverage",
    "ga / gate"
  ],
  "policy_version": "2.0.0",
  "count": 8
}
```

### Drift Detection

The `check_branch_protection_drift.sh` script:

1. Extracts policy requirements
2. Queries GitHub API for branch protection
3. Compares the two sets
4. Generates a report

```bash
# Check for drift
./scripts/release/check_branch_protection_drift.sh --branch main

# Outputs:
# - artifacts/release-train/branch_protection_drift_report.md
# - artifacts/release-train/branch_protection_drift_report.json
```

### API Endpoint

The script queries:

```
GET /repos/{owner}/{repo}/branches/{branch}/protection/required_status_checks
```

This returns the list of required status check contexts.

---

## Drift Categories

### Missing in GitHub

Checks that are required by policy but NOT enforced in branch protection.

**Risk:** PRs can merge without these checks passing.

**Remediation:** Add the checks to branch protection settings.

### Extra in GitHub

Checks that are enforced by GitHub but NOT listed in policy.

**Risk:** Documentation is inaccurate; policy doesn't reflect reality.

**Remediation:** Either add to policy or remove from branch protection.

---

## Running Locally

### Prerequisites

- `gh` CLI authenticated with repo access
- `jq` for JSON processing
- (Optional) `yq` for YAML parsing

### Commands

```bash
# Check main branch
./scripts/release/check_branch_protection_drift.sh --branch main --verbose

# Check specific repo
./scripts/release/check_branch_protection_drift.sh --repo owner/repo --branch main

# Output to custom directory
./scripts/release/check_branch_protection_drift.sh --out-dir ./my-reports
```

### Exit Codes

The script always exits 0 (advisory mode). Check the JSON output for `drift_detected: true|false`.

---

## Workflow

### Triggers

| Trigger  | Schedule          | Purpose                  |
| -------- | ----------------- | ------------------------ |
| Schedule | Daily 10:00 UTC   | Routine drift check      |
| PR       | On policy changes | Catch drift before merge |
| Manual   | workflow_dispatch | Ad-hoc checks            |

### Behavior

1. Runs drift detection script
2. Uploads report artifact
3. If drift detected:
   - Searches for existing drift issues (24h cooldown via issue comment timestamps)
   - Creates or updates issue as appropriate
4. If no drift:
   - Auto-closes existing drift issues

---

## Issue Management

### Deduplication

Issues are deduplicated by a key combining:

- Branch name
- Number of missing checks
- Number of extra checks

If the drift signature changes, a new issue is created.

### Rate Limiting

Issues are only updated once per 24 hours to avoid spam.

### Auto-Close

When drift is resolved, existing drift issues are automatically closed with a resolution comment.

---

## Required Permissions

### GitHub App Authentication (Required)

Branch protection APIs require elevated read permissions that the default `GITHUB_TOKEN` does not provide. Configure a GitHub App and store its credentials as repository secrets:

- **BRANCH_PROTECTION_APP_ID** (GitHub App ID)
- **BRANCH_PROTECTION_APP_PRIVATE_KEY** (PEM private key)

The workflow generates an installation token via `actions/create-github-app-token@v1`. If token generation fails, the workflow falls back to `GITHUB_TOKEN` and records a warning in the workflow summary.

### GitHub Token (Workflow Runtime)

The workflow needs:

- `contents: read` - To read policy files
- `issues: write` - To create/update drift issues
- `actions: read` - To access workflow context

### Branch Protection API

Reading branch protection requires one of:

- GitHub App with **Administration: Read-only** (recommended)
- Admin access to the repository
- `read:org` scope (for organization repos)

If permissions are insufficient, the script reports the limitation and creates an issue explaining the access requirement.

### Governance Reference

- [Summit Readiness Assertion](../SUMMIT_READINESS_ASSERTION.md)

---

## Graceful Degradation

If the API is inaccessible:

1. Script reports the specific error
2. Drift is treated as "unknown" (potential drift)
3. Issue is created explaining the permission limitation
4. Report includes remediation steps for access

---

## Example Drift Report

```markdown
# Branch Protection Drift Report

**Repository:** org/repo
**Branch:** main
**Drift Detected:** true

## Summary

| Metric             | Value |
| ------------------ | ----- |
| Policy Check Count | 4     |
| GitHub Check Count | 3     |
| Missing in GitHub  | 1     |
| Extra in GitHub    | 0     |

## Missing in GitHub Branch Protection

These checks are required by policy but NOT enforced:

- `Unit Tests & Coverage`

### Remediation

1. Go to Settings → Branches → Branch protection rules
2. Edit the rule for `main`
3. Add `Unit Tests & Coverage` to required status checks
```

---

## Remediation Steps

### Adding Missing Checks to GitHub

**Via UI:**

1. Go to **Settings** → **Branches**
2. Click **Edit** on the branch rule
3. Under "Require status checks to pass":
   - Enable if not already
   - Search for and add missing checks
4. Save changes

**Via CLI:**

```bash
# View current protection
gh api repos/OWNER/REPO/branches/main/protection/required_status_checks

# Note: Updating requires admin access
```

### Removing Extra Checks from GitHub

1. Go to **Settings** → **Branches**
2. Click **Edit** on the branch rule
3. Remove the extra checks from required status checks
4. Save changes

### Updating Policy to Match GitHub

1. Edit `docs/ci/REQUIRED_CHECKS_POLICY.yml`
2. Add/remove entries from `always_required` section
3. Create PR for review

---

## State Management

### Issue-Based State Discovery

Instead of maintaining a state file (which would require pushing to the main branch), the workflow uses **issue-based state discovery**:

1. When drift is detected, the workflow searches for existing open issues with the governance label and matching title
2. If an existing issue is found, it checks when it was last updated (by examining comments)
3. If updated within 24 hours, the workflow skips to avoid spam
4. Otherwise, it adds a new comment to the existing issue
5. If no matching issue exists, a new issue is created

This approach is more robust and doesn't require state persistence to the repository

---

## Troubleshooting

### "Insufficient permissions" Error

The GitHub token lacks access to read branch protection.

**Solution:**

- Ensure workflow has appropriate permissions
- For organization repos, may need `read:org` scope
- Contact admin to verify token access

### No Drift Detected but Expected

1. Verify the policy file path is correct
2. Check the `always_required` section has entries
3. Run with `--verbose` to see extracted checks
4. Verify branch protection is actually configured

### Issues Not Creating

1. Check workflow has `issues: write` permission
2. Verify state file is not locked
3. Check cooldown period (24h between updates)
4. Review workflow run logs

---

## References

- **Extraction Script**: `scripts/release/extract_required_checks_from_policy.sh`
- **Drift Script**: `scripts/release/check_branch_protection_drift.sh`
- **Workflow**: `.github/workflows/branch-protection-drift.yml`
- **Policy File**: `docs/ci/REQUIRED_CHECKS_POLICY.yml` (specifically `branch_protection.required_status_checks.contexts`)

---

## Change History

| Version | Date       | Changes                                                                                                                                                                                                             |
| ------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1.1.0   | 2026-01-23 | Fix extraction to use `branch_protection.required_status_checks.contexts` instead of `always_required`; migrate from file-based state to issue-based state discovery; resolve "Could not push state update" warning |
| 1.0.0   | 2026-01-08 | Initial branch protection drift detection                                                                                                                                                                           |

---

**Document Authority**: Platform Engineering
**Next Review**: 2026-02-08 (or before MVP-5 kickoff)
