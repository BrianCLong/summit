# Required checks discovery (TODO)

1. Open GitHub repo → Settings → Branches → Branch protection rules.
2. List required status checks and their exact names.
3. Write the canonical list into `ci/required_checks.json`.
4. Replace temporary check names in workflow configs after the canonical list is known.

## Temporary Check Names

- `ci:moral_schema_validate`
- `ci:moral_unit`
- `ci:moral_policy_deny_by_default`
- `ci:supply_chain_delta`
- `worldsim-foundation-gate`
- `evidence-schema-gate`
