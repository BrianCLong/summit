# Required Checks Discovery

To discover the names of the required checks in this repository, follow these steps:

1. Go to the repository on GitHub.
2. Navigate to **Settings** > **Branches**.
3. Under **Branch protection rules**, find the rule for the `main` branch (or create one).
4. Look at the **Require status checks to pass before merging** section.
5. List the checks that are currently required.

## Current Known Checks
- `build-test / Lint`
- `build-test / Typecheck`
- `build-test / Unit Tests`
- `build-test / Build`
- `Integration Tests`
- `Verification Suite`
- `Deterministic Build`
- `Full-Stack Smoke Test`
- `Governance`
- `S-AOS Enforcement`
- `gate/evidence_contract`
- `gate/relay_policy`
- `gate/supplychain_verify`

## Rename Plan
Once the exact check names are confirmed from the GitHub UI, we will update the temporary gate names in our workflows to match them perfectly.
