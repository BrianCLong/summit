# Required checks discovery (rename plan)

1. In repo settings → Branch protection → record required status check names.
2. Or via API: list check runs for a PR and capture the stable names.
3. Update this file with authoritative names and add a PR to rename temporary gates.

## Temporary gate names (until verified)

- ci/unit
- ci/policy-gates
- ci/evals
