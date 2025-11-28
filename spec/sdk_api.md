# Summit Developer SDK v0.1 API

## Purpose
Summit SDK exposes a stable, policy-aware abstraction over the frontier runtime, RAG substrates, governance hooks, and telemetry. It is designed to be graph-native from day one while remaining migration-safe across model sizes and transports.

## Design Principles
- **Graph-native**: Applications are defined as graphs of steps (models, tools, retrieval, policy checks) rather than linear chains.
- **Policy-first**: Every public entry point accepts policy context, with defaults resolved by the client profile.
- **Telemetry-by-design**: Structured traces are emitted for every step with correlation IDs and governance events.
- **Portable**: Same API works across local adapters, hosted frontier models, and future transports (HTTP/gRPC/local runtime).

## Core Abstractions
- **SummitClient**: Configures transport, auth, default model, and policy profile. Responsible for trace/session orchestration.
- **ModelHandle**: Typed interface for chat/completion with contextual inputs (RAG, tools, policy, routing hints).
- **Tool**: Declarative wrapper over Python callables or remote endpoints with JSONSchema validation and safe execution envelope.
- **RAGContext**: Encapsulates retrieval profile and provides `retrieve` returning structured passages plus provenance graph handles.
- **PolicyContext**: Bundles tenant/jurisdiction/purpose plus governance hooks; injected into every call.
- **Flow**: Decorator for defining typed graphs of steps; compiles to execution DAG with explicit inputs/outputs.
- **TraceEmitter**: Central trace sink; supports local logging, OTLP, and governance/SRE channels.

## Python API Sketch
```python
from summit_sdk import SummitClient, flow, tool, rag

client = SummitClient(api_key="...", endpoint="https://api.summit.run")

@tool()
def get_stock_price(symbol: str) -> float:
    ...

kb = rag.KnowledgeBase(client, profile="frontier_core")

@flow()
def analyst_assistant(question: str):
    ctx = kb.retrieve(question)
    answer = client.model("frontier-1.3b-aligned").chat(
        messages=[{"role": "user", "content": question}],
        context=ctx,
        tools=[get_stock_price],
        policy={"tenant": "acme", "region": "us-west"},
    )
    return answer

response = analyst_assistant("How did ACME perform last quarter?")
```

### Flow Graph Semantics
- Each decorated function becomes a node set in a DAG; control/data dependencies inferred from Python AST and explicit `flow.step` usage.
- Compilation result includes:
  - Node metadata (type=model/tool/rag/policy),
  - Input/output schemas,
  - Policy/gov hooks,
  - Telemetry routing hints.

### Models
- `client.model(name, *, transport=None, policy=None)` returns a `ModelHandle` bound to a model registry entry.
- `ModelHandle.chat(messages, *, context=None, tools=None, policy=None, temperature=0.2)` executes via configured transport.
- `ModelHandle.complete(prompt, *, policy=None, max_tokens=512)` supports completion-style models.

### Tools
- `@tool(name=None, schema=None, policy=None, audit_tags=None)` wraps a callable.
- Tools are automatically packaged with JSONSchema derived from type hints unless `schema` is provided explicitly.
- Policies can block/allow tools at call time; violations are surfaced as `PolicyError` and traced.

### RAG
- `rag.KnowledgeBase(client, profile)` configures retrievers.
- `KnowledgeBase.retrieve(query, *, k=5, policy=None, filters=None)` returns `RAGContext` with passages and provenance graph handles.
- Contexts are portable and can be attached to model calls or flows.

### Policy
- `PolicyContext(tenant, region=None, purpose=None, sensitivity=None, overrides=None)` models governance input.
- Merged by precedence: explicit call args > flow defaults > client profile.

### Telemetry
- `TraceEmitter` automatically attaches correlation IDs, timing, inputs/outputs, and policy decisions.
- Emission targets: stdout (dev), OTLP endpoint, governance ledger (when enabled).
- Sampling configurable via client options.

## TypeScript/JS Sketch
```ts
import { SummitClient } from "@summit/sdk";

const client = new SummitClient({ apiKey: process.env.SUMMIT_KEY });

async function main() {
  const kb = client.rag.knowledgeBase({ profile: "frontier_core" });
  const ctx = await kb.retrieve("status of ACME q2", { k: 3 });

  const result = await client
    .model("frontier-1.3b-aligned")
    .chat({
      messages: [{ role: "user", content: "Summarize ACME Q2" }],
      context: ctx,
      policy: { tenant: "acme", region: "us-west" },
    });

  console.log(result.text);
}
```

## Versioning & Compatibility
- Semantic versioning with explicit capability flags per transport/model provider.
- `client.capabilities()` exposes supported features (tools, rag, governance, streaming).
- Backward-compatible policy: new required fields must provide defaults; deprecations logged via telemetry.

## Error Model
- `PolicyError`, `TransportError`, `ValidationError`, `ToolError`, `ModelError` share a common base with trace IDs.
- Errors are structured for downstream observability systems.

## Security & Governance
- Policy context required for tenant-affecting operations; defaults resolved via auth token claims when possible.
- Tool execution sandboxed with optional allow/deny lists and safety pre-check hooks.
- PII-safe logging with redaction rules in telemetry.

## Telemetry Schema (summary)
- Trace envelope: `trace_id`, `span_id`, `parent_span_id`, `timestamp`, `component`, `event`, `policy`, `metrics`.
- Components emit: `model.request`, `model.response`, `tool.request`, `tool.response`, `rag.retrieve`, `policy.decision`, `flow.graph`.

## Migration Strategy
- Transport adapters implement `ModelTransport` and `ToolInvoker` interfaces.
- Local adapter included for offline dev; hosted adapter for Summit runtime; future gRPC adapter planned.
- RAG providers pluggable (vector DB, graph retriever, hybrid).

## Example Flow Compilation
- `flow.to_graph(analyst_assistant)` returns a JSON graph containing nodes, edges, schemas, and policy hooks.
- Graph is executable locally (sequential/async) or submitted to the frontier runtime for orchestrated execution.

## Operational Hooks
- `with_oversight=True` on flows causes dual logging to governance ledger and SRE trace store.
- `client.with_span(name)` context manager allows custom spans for arbitrary code.

## CLI Preview
- `summit sdk info` — print capabilities.
- `summit flow compile path/to/file.py --graph out.json` — emit DAG.
- `summit app init copilot` — scaffold blueprint templates.

## Open Questions (tracked)
- Cost-aware routing API shape?
- Streaming support signatures across transports?
- Multi-tenant secret resolution for tool credentials?

