Maestro LangChain/LangGraph Compatibility (Scaffold)

Scope

- Provide LangChain-like building blocks (adapters, prompts/parsers, chains/tools, RAG, memory) and LangGraph‑style orchestration (graph runtime with checkpoints & HIRL), plus ComfyUI integration for multimodal pipelines — all enforced by Safe Mutations and budget/rate policies.

Feature Flags (env)

- MAESTRO_LANGCHAIN_ENABLED=true
- MAESTRO_COMFY_ENABLED=true
- REQUIRE_BUDGET_PLUGIN=true
- OPA_ENFORCEMENT=false

Budget & Safety

- GraphQL directive `@budget(capUSD: Float!, tokenCeiling: Int!)` on mutation fields.
- Apollo budget plugin enforces per‑request caps; spans & Prom metrics record denials.

Structure (server/src/maestro)

- langchain/
  - models/ (openai.ts, anthropic.ts, gemini.ts)
  - prompts/ (templates.ts, parsers.ts)
  - chains/ (sequential.ts, mapreduce.ts, router.ts)
  - tools/ (intelgraph.ts)
  - retrieval/ (pgvector.ts)
  - memory/ (buffers.ts)
  - observability/ (otel.ts)
- langgraph/
  - runtime.ts, checkpoint.ts, node.ts
- comfy/
  - client.ts, run-graph.ts, assets.ts

Notes

- This is a scaffold: methods return stubs and log spans; real providers can be wired incrementally behind feature flags.
