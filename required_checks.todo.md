# Required Checks Discovery

## TODO
1.  Push branch and open PR.
2.  Observe running checks in GitHub UI.
3.  Identify the exact job names for:
    - Evidence validation
    - Policy fixture tests
    - Telemetry tests
    - Eval harness execution
4.  Update `.github/workflows/summit_skill_gates.yml` to match if needed (e.g. if we rename jobs).
5.  Add these checks to Branch Protection Rules.

## Current Placeholder Names
- `summit-skill-gates / evidence-schemas`
- `summit-skill-gates / policy-fixtures`
