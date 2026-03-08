1. **Refactor Evals Harness to Actually Run Graders**: Ensure `run_ai_evals.mjs` runs typescript/js logic that calls `stringCheck`, `citationMatch`, and `groundednessCheck`. Apply the `EVIDENCE_ID` pattern (`"SUMMIT.AI_EVALS.<suite>.<case_id>.<grader>"`).
2. **Add Missing Tests**: Add unit tests for graders and the verifier loop (retries and empty contexts) in `server/src/__tests__/ai`.
3. **Add Security Fixtures & Tests**: Update `jailbreaks.jsonl` with PII/secret leakage fixtures. Add deny-by-default tool policy tests.
4. **Wire Drift CI Job**: Add a scheduled job in `.github/workflows/ci.yml` that runs `scripts/monitoring/eval-driven-agentic-rag-2026-drift.mjs`.
5. **Verify Fixes**: Run the tests and ensure artifacts are generated properly.
