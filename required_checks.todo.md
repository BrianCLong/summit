# Required Checks Discovery (TODO)

1. Open repo settings -> Branch protection -> note required check names.
2. In CI provider UI, list workflow/job names that gate merges.
3. Populate `ci/required_checks.json` (to be added in PR1 follow-up if needed).
4. Rename plan: map placeholder gates to real names once discovered.

## Placeholder Mapping

| Placeholder | Potential Real Name |
|---|---|
| ci:evidence-verify | verify-evidence |
| ci:dependency-delta-verify | verify-dependency-delta |
| ci:cti-contract-verify | test-cti-contracts |
| ci:robustness-smoke | smoke-tests |
