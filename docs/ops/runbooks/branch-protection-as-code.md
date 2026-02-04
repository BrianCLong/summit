# Runbook: Branch Protection as Code (BPAC)

## Scope

- Validates branch protection settings against `.github/governance/branch_protection_rules.json`.

## One-Command Verification

```bash
scripts/ci/local_verify_bpac.sh
```

## Failure Modes

- **403/404 from GitHub API**: token lacks `contents:read` or branch protection access.
- **Missing required checks**: policy contexts do not match live protection.
- **Schema mismatch**: live response missing expected fields.

## Remediation

1. Confirm required check contexts in `docs/required_checks.todo.md`.
2. Update `.github/governance/branch_protection_rules.json` with discovered contexts.
3. Re-run `scripts/ci/local_verify_bpac.sh`.

## Alerts

- Any drift detection failure must block merges until resolved.

## Governed Exception

- Auto-apply remains disabled; enable only after approved token scoping.
