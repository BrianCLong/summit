# Required Checks Discovery

## Purpose

Document the process for discovering the exact required status check names enforced by branch
protection rules. Use the results to align CI job names and avoid false-negative gating.

## Manual workflow

1. Open repo → Settings → Branches → Branch protection rules.
2. Locate the default branch rule.
3. Record required status check names exactly as listed.
4. Update `required_checks.todo.md` and any CI job name mappings.

## API workflow

Use the GitHub REST API to fetch branch protection details and required status check contexts.
Store outputs in a local note before updating CI job naming.

## Output

- Updated `required_checks.todo.md`
- A follow-up PR to rename/alias CI jobs to match required checks exactly.
