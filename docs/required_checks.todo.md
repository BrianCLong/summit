# Required Checks Discovery (TODO)

## Goal

Identify exact required-check names enforced by branch protection for `main` (and any release branches).

## UI steps (fast)

1. Repo → Settings → Branches → Branch protection rules.
2. Record:
   - Branch pattern
   - "Require status checks" list (exact names)
   - "Require workflows to pass" if present

## API steps (authoritative)

- Use GitHub REST:
  - Get branch protection for `main`
  - Extract required status checks contexts
- Save results into `docs/required_checks.verified.json` (stable ordering).

## Temporary convention (until verified)

- Name new gate: `verify_subsumption_bundle`
- Rename plan:
  - If repo expects prefix like `ci / ...`, add follow-up PR to align names.
