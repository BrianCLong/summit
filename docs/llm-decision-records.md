# LLM Routing Decision Records

LLM routing now emits a deterministic, replayable decision record for every call routed through the learning-to-rank router.

## Schema

Each record (written as JSONL to `.evidence/llm/decisions.jsonl`) includes:

- `decisionId` (stable UUID) and `timestamp`
- `request`: prompt, execution context, tenant/user identifiers, ordered policy list, constraints, and the feature vector passed to the router
- `outcome`: chosen provider/model, score, estimated cost/latency, fairness metrics, guardrail actions (PII redactions), and any fallback candidates with the reason they were skipped
- `meta`: when routing started and when the decision was made

## Replay

The `ReplayRunner` loads a stored `decisionId`, feeds the saved prompt and context back through the router with side effects disabled, and validates the model/provider match while streaming output through the mock LLM provider.
