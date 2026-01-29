# Required Checks Discovery (TODO)

1) GitHub UI:
- Repo → Settings → Branches → Branch protection rules
- Record "Required status checks" names exactly.

2) Add them to CI mapping:
- Create/Update `ci/required_checks.json` with exact names.

3) Temporary gates (until discovered):
- check:ontology_conformance
- check:policy_deny_by_default
- check:evidence_bundle_present
- check:dependency_delta_present

4) Rename plan:
- Once actual check names are known, add a PR that aliases old → new for 2 releases, then removes old.
