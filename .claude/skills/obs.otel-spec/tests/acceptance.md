# Acceptance Criteria

- Manifests validate (YAML well-formed)
- Provenance hash generated in CI
- Org SLO/cost guardrails referenced
- Emits required artifacts when executed

## Verification Steps
1. Run CI workflow `Claude Skills Verify` on PR.
2. Execute `scripts/verify.ts` (exit code 0 expected).
