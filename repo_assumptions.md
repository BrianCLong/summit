# Repo Assumptions for Gemini Enterprise Adapter

Verified: PARTIAL (live inspection performed for `summit/providers`, `tests`, and `evidence`).

Assumed:
- Provider-level enterprise integration can be delivered under `summit/providers/google/` without core engine edits.
- Evidence artifacts in `evidence/gemini_enterprise/` can be consumed by existing governance flows.
- Existing CI can run focused pytest suites for provider and security checks.
- Existing tests and contracts outside this scope remain unchanged.

Must-not-touch:
- Core evaluation engine paths
- Existing evidence schema contracts outside the new `gemini_enterprise` evidence folder
- Existing provider adapters
