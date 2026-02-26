# Bootstrapped Founder Repo Assumptions

## Validation checklist

1. **Canonical report path conventions**
   - Verified: pipeline artifacts are emitted under `artifacts/` in this implementation.
2. **CI check naming style**
   - Assumed: existing checks can add a dedicated evidence-lint entry in later PRs.
3. **JSON schema validation mechanism**
   - Verified: repository stores JSON schemas in `schemas/` and uses schema-driven gates.
4. **Feature flag pattern**
   - Verified for this scope: `bootstrapped_founder` is encoded in workflow output and defaults to `false`.
5. **Must-not-touch files**
   - Verified by implementation choice: no core evaluator engine files modified.
