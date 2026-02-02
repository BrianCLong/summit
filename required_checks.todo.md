# Required checks discovery
## Goal
Identify the exact required CI check names for main branch protection.
## Steps
1. Repo settings → Branch protection → note required checks.
2. `gh api` (if available) to list rulesets/required checks.
## Temporary gate naming
- gate:evidence_schema
- gate:evidence_integrity
- gate:records_policy
## Rename plan
Once official check names known, add alias mapping in CI.
