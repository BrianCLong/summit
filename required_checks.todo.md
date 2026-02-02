# Required Checks Todo

## GitHub Branch Protection Rules Mapping

The following checks are part of the Step 3.5 Flash integration and must be mapped to branch protection rules once they report status:

1. `ci/schema_validate` (mapped to `validate-evidence` in `evidence_ci_step35flash.yml`)
2. `ci/determinism_lint` (covered by `validate-evidence`)
3. `ci/provider_smoke_gate` (To be implemented)
4. `ci/policy_fixtures_gate` (To be implemented)

## Setup Steps

1. Go to Repository Settings -> Branches -> [Branch Name]
2. Enable "Require status checks to pass before merging"
3. Search for and select:
   - `validate-evidence`
