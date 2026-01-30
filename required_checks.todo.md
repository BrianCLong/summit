# Required Checks Discovery (temporary)
1) In GitHub repo: Settings → Branches → Branch protection rules
2) Record required check names here exactly as shown.
3) Update `.ci/required_checks.yml` with exact names.
4) Rename temporary gates:
   - `ci:smoke` → actual check name(s) once known

## Temporary gates
- ci:smoke
- ci:unit
- ci:evidence
