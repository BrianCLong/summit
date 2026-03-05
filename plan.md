1. **Understand requirements**: We need to implement Eval-driven Agentic RAG, incorporating testing harnesses (evals), verifier loops for grounding citations, cost controls, agent copilot structures, and updating CI.
2. **Reviewing Codebase**: Searched `server/src/ai/rag` and `server/src/ai/evals`, identifying entry points, policy integrations. Also confirmed github actions workflows and scripts.
3. **Execute creation**:
   - `docs/standards/eval-driven-agentic-rag-2026.md`, `docs/security/data-handling/eval-driven-agentic-rag-2026.md`, `docs/ops/runbooks/eval-driven-agentic-rag-2026.md`
   - `repo_assumptions.md` created
   - Evals harness logic: `server/src/ai/evals/harness.ts`, `server/api-schemas/ai-evals.report.schema.json`
   - Graders: `string_check`, `citation_match`, `groundedness`, fixtures `jailbreaks.jsonl`
   - Script for evals `scripts/ai/run_ai_evals.mjs` which emits deterministic artifacts.
   - Verifier loop: `flags.ts`, `citation_resolver.ts`, `verifier.ts`, `verifier.test.ts`.
   - Router: `intent_router.ts`, `workflow.ts`, `action_envelope.ts`.
   - Model Routing: `model_router.ts`, `budgets.ts`, `response_cache.ts`
   - Drift check: `eval-driven-agentic-rag-2026-drift.mjs`
4. **Update Repo logic**: We also modified `package.json` with `test:ai-evals`, patched `.github/workflows/ci.yml` and `.github/required-checks.yml`.
5. **Verify/Pre-commit**: We ran tests successfully and generated artifacts.
6. **Submit**: Use `submit` to complete the issue.
