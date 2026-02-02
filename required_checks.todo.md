# Required Checks Discovery

## Process to Identify Required Checks

1. Go to repository Settings in GitHub.
2. Navigate to **Branches** -> **Branch protection rules**.
3. Edit the rule for `main` (or default branch).
4. Look for "Require status checks to pass before merging".
5. Copy the exact names of the required checks listed there.

## Temporary Gate Names (Moltbook Relay Project)

We are using these names in our CI pipelines until the official required check names are confirmed and mapped.

- `gate/evidence_contract` - Validates Moltbook Relay evidence artifacts and timestamp isolation.
- `gate/agent_inventory_required` - Fails if unknown agents are used in runtime configs.
- `gate/agent_surface_lint` - Fails on open admin/control surfaces without auth.
- `gate/relay_policy` - Validates relay discovery/DM policies (auth+audit).
- `gate/supplychain_verify` - Verifies signatures and provenance for skills/extensions.

## Existing CI Gates (Reference)

- `ci:unit` - Runs unit tests for new packages.
- `ci:lint` - Runs linting.
- `ci:evidence` - Validates evidence artifacts (schemas, determinism).
- `ci:security-gates` - Runs deny-by-default and redaction tests.
- `verify:dependency-delta` - Ensures dependency changes are documented.

## Rename Plan

Once official names are known (e.g., from `ci/required_checks.json`), we will alias these jobs or rename them in the workflow files to match the branch protection rules.
For example, `gate/evidence_contract` may map to `GA Evidence Completeness`.
