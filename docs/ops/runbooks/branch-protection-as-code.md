# Runbook: Branch Protection as Code (BPAC)

## Scope

- Validates branch protection settings against `docs/ci/REQUIRED_CHECKS_POLICY.yml`.
- Detects drift between policy-as-code and GitHub branch protection enforcement.

## One-Command Verification

```bash
# Local verification
scripts/release/check_branch_protection_drift.sh --branch main --verbose

# Or via the JS module
node scripts/ci/check_branch_protection_drift.mjs --branch main
```

## Prerequisites

- `gh` CLI authenticated with repo access
- For full branch protection read access: GitHub App with Administration: Read-only permission
- See [BRANCH_PROTECTION_DRIFT.md](../../ci/BRANCH_PROTECTION_DRIFT.md) for detailed setup

## Failure Modes

| Error | Cause | Solution |
|-------|-------|----------|
| `403 Forbidden` | Token lacks branch protection read access | Configure GitHub App (see docs) |
| `404 Not Found` | Branch protection not configured | Set up branch protection rules |
| `UNVERIFIABLE_PERMISSIONS` | App not installed or missing permissions | Verify app installation |
| `Missing required checks` | Policy contexts do not match live protection | Add missing checks to branch protection |

## Remediation

1. Review drift report in `artifacts/release-train/branch_protection_drift_report.md`
2. If checks are missing in GitHub: add them via Settings → Branches → Branch protection rules
3. If extra checks in GitHub: either add to policy or remove from branch protection
4. Re-run verification to confirm resolution

## Alerts

- Drift issues are auto-created with `severity:P1` label
- Issues are deduplicated and rate-limited (24h cooldown)
- Resolution auto-closes existing drift issues

## Governed Exception

- Auto-apply remains disabled; requires production-admin environment approval
- Use `branch-protection-reconcile.yml` workflow for controlled sync

## References

- [Branch Protection Drift Documentation](../../ci/BRANCH_PROTECTION_DRIFT.md)
- [Required Checks Policy](../../ci/REQUIRED_CHECKS_POLICY.yml)
- [Drift Workflow](../../../.github/workflows/branch-protection-drift.yml)
