# Runbook: Eval-driven Agentic RAG

## Scenarios

### ai-evals gate failing triage
- Check `artifacts/ai-evals/report.json` for specific test failures (e.g. groundedness vs jailbreak).
- Validate if recent changes to prompts or retrieval chunks impacted the eval scores.
- Re-run `node scripts/ai/run_ai_evals.mjs` locally.

### verifier false positives
- Review `verifier.json` to identify where claim mapping failed.
- Adjust max retries or fallback logic if the embedding matched the wrong chunks.

### alerts
- Alert: verifier refusal rate spike -> Monitor for changes in incoming query distributions or upstream retrieval models.
- Alert: grounding failure spike -> Indicates model is hallucinating outside of given context.
- Alert: retrieval empty-context rate -> Check vector DB or indexing pipeline for regressions.

### drift response steps
- If `scripts/monitoring/eval-driven-agentic-rag-2026-drift.mjs` fails, review `drift.metrics.json` for score regressions.
