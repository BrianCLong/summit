# Required Checks Discovery

To ensure the "Persona Prompting" feature is properly governed, the following CI checks must be enabled and mapped to the repository settings.

## 1. List Existing Checks
Use the GitHub CLI or API to list status checks for recent commits to identify the exact names reported by the CI runners.

```bash
# Example
gh api repos/:owner/:repo/commits/main/status-check-contexts
```

## 2. Temporary Check Names
Until the exact names are confirmed, we assume:

*   `ci/persona-evals`: Runs the `summit/evals/social_reasoning/runner.py` with seed data.
*   `ci/evidence-validate`: Runs `tools/ci/evidence_validate_bundle.py` on the output of the eval.

## 3. Rename Plan
Once the real check names are known (e.g., `test-persona-eval`, `validate-bundle-artifacts`), update the Branch Protection Rules to require them.

## 4. Required Gates
*   `persona_prompting_gate`: Must pass for any PR enabling `PERSONA_PROMPTING` feature flag.
*   `persona_rationale_regression`: Must pass if rationale metrics degrade.
