# Branch Protection Reconciliation

**Status:** Active (MVP-4)
**Owner:** Platform Engineering
**Last Updated:** 2026-01-08

---

## Overview

Branch Protection Reconciliation closes the loop between drift detection and remediation. Instead of just reporting mismatches, it generates actionable reconciliation plans that show exactly what needs to change.

### The Problem

Drift detection tells you _that_ a problem exists, but not _how_ to fix it efficiently:

- Manual inspection of multiple systems required
- Easy to miss checks or make typos
- No single source of truth for target state
- Exception handling adds complexity

### The Solution

A plan-first, apply-guarded reconciler that:

1. Computes exact diff between policy and GitHub
2. Respects active exceptions from `REQUIRED_CHECKS_EXCEPTIONS.yml`
3. Generates step-by-step remediation instructions
4. Optionally applies changes (with admin guard)

---

## How It Works

### Reconciliation Flow

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Policy File   │     │  Exceptions     │     │  GitHub API     │
│  (always_req)   │     │  (active only)  │     │  (status checks)│
└────────┬────────┘     └────────┬────────┘     └────────┬────────┘
         │                       │                       │
         └───────────────────────┴───────────────────────┘
                                 │
                                 ▼
                    ┌─────────────────────┐
                    │   Compute Diff      │
                    │  • Checks to add    │
                    │  • Checks to remove │
                    │  • Filter exceptions│
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │  Generate Plan      │
                    │  • JSON (machine)   │
                    │  • Markdown (human) │
                    └──────────┬──────────┘
                               │
              ┌────────────────┴────────────────┐
              ▼                                 ▼
     ┌────────────────┐              ┌─────────────────┐
     │   Plan Mode    │              │   Apply Mode    │
     │ (read-only)    │              │ (admin guard)   │
     └────────────────┘              └─────────────────┘
```

### Plan Mode (Default)

Generates a reconciliation plan without making changes:

```bash
./scripts/release/reconcile_branch_protection.sh --branch main
```

**Outputs:**

- `branch_protection_reconcile_plan.json` - Machine-readable plan
- `branch_protection_reconcile_plan.md` - Human-readable instructions

### Apply Mode (Guarded)

Attempts to PATCH branch protection settings:

```bash
./scripts/release/reconcile_branch_protection.sh \
  --branch main \
  --mode apply \
  --i-understand-admin-required true
```

**Requirements:**

- Explicit flag confirmation
- Admin access to repository
- GitHub token with `admin:repo` scope

---

## Command Reference

```bash
Usage: reconcile_branch_protection.sh [OPTIONS]

Options:
  --repo OWNER/REPO               GitHub repository (default: inferred)
  --branch BRANCH                 Branch to reconcile (default: main)
  --policy FILE                   Policy file (default: docs/ci/REQUIRED_CHECKS_POLICY.yml)
  --exceptions FILE               Exceptions file (default: docs/ci/REQUIRED_CHECKS_EXCEPTIONS.yml)
  --out-dir DIR                   Output directory (default: artifacts/release-train)
  --mode plan|apply               Mode (default: plan)
  --i-understand-admin-required   Required for apply mode
  --verbose                       Enable verbose logging
  --help                          Show this help
```

---

## Exception Integration

The reconciler respects exceptions from `REQUIRED_CHECKS_EXCEPTIONS.yml`:

### allow_missing_in_github

A check can be in policy but intentionally not enforced in GitHub.

**Effect:** Check is NOT added to "to add" list.

### allow_extra_in_github

A check can be in GitHub but intentionally not in policy.

**Effect:** Check is NOT added to "to remove" list.

### Expiration

Only non-expired exceptions are applied. Expired exceptions are:

- Logged as warnings
- Still visible in output for audit trail
- Not applied to filtering

---

## Plan Output Format

### JSON Schema

```json
{
  "version": "1.0",
  "generated_at": "2026-01-08T12:00:00Z",
  "repository": "org/repo",
  "branch": "main",
  "policy_version": "2.0.0",
  "mode": "plan",
  "api_accessible": true,
  "needs_reconciliation": true,
  "summary": {
    "add_count": 2,
    "remove_count": 1,
    "skipped_add_count": 0,
    "skipped_remove_count": 1
  },
  "actions": {
    "add_required_checks": ["Check A", "Check B"],
    "remove_required_checks": ["Old Check"]
  },
  "skipped_due_to_exceptions": {
    "add": [],
    "remove": ["Legacy Check"]
  },
  "target_state": ["Check A", "Check B", "Check C", "Legacy Check"]
}
```

### Markdown Report

The markdown report includes:

- Summary table
- Checks to add (with checkboxes)
- Checks to remove (with checkboxes)
- Excepted mismatches
- Manual remediation steps
- CLI commands for automation
- Target state listing

---

## Workflow

### Manual Trigger

The `branch-protection-reconcile.yml` workflow is manual-only:

1. Go to **Actions** → **Branch Protection Reconciliation**
2. Click **Run workflow**
3. Select branch and mode
4. For apply mode, type "I UNDERSTAND" in confirmation field

### Environment Protection

Apply mode requires the `production-admin` environment, which should have:

- Required reviewers
- Wait timer (optional)
- Deployment branch restrictions

---

## Running Locally

### Prerequisites

- `gh` CLI authenticated with repo access
- `jq` for JSON processing
- `yq` for YAML parsing (optional, for exceptions)

### Examples

```bash
# Generate plan for main
./scripts/release/reconcile_branch_protection.sh --branch main --verbose

# Generate plan for release branch
./scripts/release/reconcile_branch_protection.sh --branch release/v2.0

# Apply changes (requires admin)
./scripts/release/reconcile_branch_protection.sh \
  --branch main \
  --mode apply \
  --i-understand-admin-required true
```

---

## Graceful Degradation

### API Inaccessible

If the GitHub API is inaccessible:

- Plan is based on policy only
- `api_accessible: false` in JSON
- Report includes access error details
- No changes can be applied

### Exceptions Not Loaded

If yq is not available or exceptions file is missing:

- Reconciliation proceeds without exception filtering
- `exceptions_loaded: false` in JSON
- Warning logged

---

## Best Practices

### Plan First

Always run in plan mode first to review changes:

```bash
./scripts/release/reconcile_branch_protection.sh --branch main
# Review artifacts/release-train/branch_protection_reconcile_plan.md
```

### Use Exceptions for Transitions

When phasing out a check:

1. Add exception with expiration date
2. Remove from policy
3. Exception prevents premature removal from GitHub
4. After expiration, reconciler will suggest removal

### Audit Trail

- Keep `branch_protection_reconcile_plan.json` artifacts
- Workflow uploads to Actions artifacts
- Issue created for each plan requiring action

---

## Troubleshooting

### "Apply failed: 403 Forbidden"

The token lacks admin access to modify branch protection.

**Solutions:**

- Use a token with `admin:repo` scope
- Have a repository admin run the command
- Use manual UI steps instead

### "Could not infer repository"

Git remote URL is not parseable or not a GitHub URL.

**Solution:** Use `--repo owner/repo` explicitly.

### "Exceptions not loaded"

yq is not installed or exceptions file not found.

**Solutions:**

- Install yq: `brew install yq` or `apt-get install yq`
- Verify exceptions file path

---

## References

- **Reconciler Script:** `scripts/release/reconcile_branch_protection.sh`
- **Exceptions File:** `docs/ci/REQUIRED_CHECKS_EXCEPTIONS.yml`
- **Workflow:** `.github/workflows/branch-protection-reconcile.yml`
- **Policy File:** `docs/ci/REQUIRED_CHECKS_POLICY.yml`
- **Drift Detection:** `docs/ci/BRANCH_PROTECTION_DRIFT.md`
- **Exceptions Documentation:** `docs/ci/REQUIRED_CHECKS_EXCEPTIONS.md`

---

## Change History

| Version | Date       | Changes                                  |
| ------- | ---------- | ---------------------------------------- |
| 1.0.0   | 2026-01-08 | Initial branch protection reconciliation |

---

**Document Authority:** Platform Engineering
**Next Review:** 2026-02-08 (or before MVP-5 kickoff)
