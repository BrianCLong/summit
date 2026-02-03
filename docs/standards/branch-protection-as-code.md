# Branch Protection as Code (BPAC)

## Policy Source of Truth

- `.github/governance/branch_protection_rules.json` is the single source for branch protection settings.

## Evidence

- `evidence/bpac/EVD-BPAC-GOV-001/*` captures drift verification output.
- `evidence/index.json` maps BPAC evidence IDs to their artifacts.

## Drift Detection

- `scripts/ci/verify_branch_protection.mjs` compares the policy file with a live protection snapshot.
- Required CI checks (assumed): `ci: governance-bundle`, `ci: branch-protection-drift`.

## Required Checks Discovery

- Follow `docs/required_checks.todo.md` to pin required context strings.

## Determinism Contract

- Report and metrics outputs are deterministic and contain no timestamps.
- Timestamps are recorded only in `stamp.json`.

## Governed Exception

- Auto-apply protection is explicitly deferred and remains feature-flagged OFF.
