# Required checks discovery (temporary)
1) Open repo → Settings → Branches → Branch protection rules.
2) Record required check names for default branch.
3) Update `.github/workflows/*` names OR map them in `ci/required_checks.map.json`.

Temporary local gate names:
- skillpacks:validate
- evidence:schemas
- supplychain:delta
