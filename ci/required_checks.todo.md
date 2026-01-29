# required_checks.todo.md

## Goal
Discover the exact CI "Required checks" names enforced on the default branch.

## UI steps (GitHub)
1) Repo → Settings → Branches → Branch protection rule → "Require status checks"
2) Copy the exact check names into `ci/verifier_spec.md`.

## Discovered Checks (Preliminary)
- validate-release-policy
- lint-reason-codes
- security-scan
- sbom

## Temporary naming convention
Until discovered, gates are referenced as:
- summit/evidence
- summit/evals_smoke
- summit/promptpack_schema
- summit/tool_spec_quality

## Rename plan
Once the real names are known, update `ci/verifier_spec.md` and add a PR to map old→new for continuity.

## New Checks (Skills)
- skillpack_unit_tests
- skill_content_policy
- skill_exec_policy
- dep_delta_gate
- evidence_gate
