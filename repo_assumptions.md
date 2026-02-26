# Repo Assumptions

Verified: PARTIAL (live repo inspection completed for `summit/` and `docs/roadmap/STATUS.json`).

Assumed:
- `summit/infra/` can host infra-planning Python modules.
- `summit/policies/` can host policy YAML assets.
- `artifacts/` remains the canonical location for machine-verifiable outputs.
- CI can invoke scriptable checks from repository scripts and pytest.

Must-Not-Touch:
- Existing policy engines and unrelated core scoring logic.
- Existing evidence schema files outside this flexible-node slice.

Validation Checklist:
- Confirm module naming conventions in `summit/`.
- Confirm CI check names and required branch protections.
- Confirm artifact schema review process for generated JSON evidence.
- Confirm evidence identifier pattern acceptance (`SUMMIT-FLEXNODE-<hash>`).
