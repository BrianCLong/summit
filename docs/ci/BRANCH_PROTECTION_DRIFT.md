# Branch Protection Drift Detection

**Status:** Active (MVP-4)
**Owner:** Platform Engineering
**Last Updated:** 2026-01-09

---

## Overview

Branch Protection Drift Detection ensures that your policy-as-code (`REQUIRED_CHECKS_POLICY.yml`) stays in sync with the Required Checks Contract and GitHub's actual branch protection enforcement. This prevents a common "silent failure" where the repo's documented policy differs from what GitHub actually enforces.

### The Problem

Without drift detection:

- A check is added to policy but forgotten in branch protection → PRs merge without the check
- A check is removed from branch protection but stays in policy → Documentation lies
- Permission changes allow direct pushes → Policy is bypassed entirely

### The Solution

Automated daily comparison that:

1. Extracts always-required checks from policy
2. Validates contract checks exist in workflows
3. Queries GitHub branch protection API
4. Reports mismatches with remediation steps
5. Creates/updates deduped issues when drift exists

---

## How It Works

### Policy Extraction

The `extract_required_checks_from_policy.sh` script reads `REQUIRED_CHECKS_POLICY.yml` and extracts the `always_required` check names.

```bash
# Extract policy requirements
./scripts/release/extract_required_checks_from_policy.sh

# Output:
{
  "always_required": ["ci / build", "ci / governance", "ci / lint", "ci / provenance", "ci / schema", "ci / security", "ci / smoke", "ci / test", "ci / typecheck"],
  "policy_version": "3.0.0",
  "count": 9
}
```

### Drift Detection

The `check_branch_protection_drift.sh` script:

1. Extracts policy requirements
2. Validates contract checks exist in workflows
3. Queries GitHub API for branch protection
4. Compares the sets
5. Generates a report

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
   - Checks dedup state (24h cooldown)
   - Creates or updates issue
   - Commits state update
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

### GitHub Token

The workflow needs:

- `contents: read` - To read policy files
- `issues: write` - To create/update drift issues
- `actions: read` - To access workflow context

### Branch Protection API

Reading branch protection requires one of:

- Admin access to the repository
- `read:org` scope (for organization repos)

If permissions are insufficient, the script reports the limitation and creates an issue explaining the access requirement.

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

## State Files

### Drift State

Location: `docs/releases/_state/branch_protection_drift_state.json`

```json
{
  "version": "1.0",
  "issues": {
    "main_1_0": {
      "issue_number": 123,
      "last_updated": "2026-01-08T10:00:00Z",
      "drift_key": "main_1_0"
    }
  }
}
```

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
- **State File**: `docs/releases/_state/branch_protection_drift_state.json`
- **Policy File**: `docs/ci/REQUIRED_CHECKS_POLICY.yml`

---

## Change History

| Version | Date       | Changes                                   |
| ------- | ---------- | ----------------------------------------- |
| 1.0.0   | 2026-01-08 | Initial branch protection drift detection |

---

**Document Authority**: Platform Engineering
**Next Review**: 2026-02-08 (or before MVP-5 kickoff)
