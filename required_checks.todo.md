# Required checks discovery (temporary)

## Inspection Steps
1. Inspect branch protection rules for `main` in the repository settings.
2. Identify the exact names of required status checks (e.g., "ci/test", "ci/lint").

## Mapping Instructions
1. Open `ci/required_checks.json`.
2. Add the discovered check names as keys.
   Example:
   ```json
   {
     "ci/test": true,
     "ci/lint": true
   }
   ```
3. Ensure the CI workflows trigger these checks.

Temporary convention until discovered:

- `ci/summit-evidence`
- `ci/summit-cog-policy`
- `ci/summit-cog-evals`
- `ci/supply-chain-delta`

## Rename Plan
Once the actual required check names are confirmed from branch protection settings, update `ci/required_checks.json` and ensure CI workflows match.
