# Agentic Orchestration + Hybrid Context + Agentic RAG (v1)

## Objective

Implement predictive orchestration selection, hybrid context management, and agentic RAG scaffolding with tests and integration documentation.

## Scope

- Add predictive orchestration selector utilities and integrate with orchestration entrypoint.
- Add hybrid context manager with masking/summarization and LLM adapter.
- Add agentic RAG core abstractions with intent-compiled graph expansion and evidence budgeting.
- Add tests and integration documentation.
- Update docs/roadmap/STATUS.json.

## Constraints

- Keep changes within `src/`, `tests/`, and `docs/` plus governance metadata updates.
- Follow graph intent mandates: use an IntentCompiler, evidence budgeting, deterministic ordering intent.
- Avoid placeholder TODOs and untyped `any`.

## Verification

- Add unit tests for selector, context manager, and agentic RAG modules.
- Ensure documentation references integration points and observability.
