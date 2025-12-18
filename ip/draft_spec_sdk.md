# Draft Specification: Summit SDK

## Scope
Graph-native, policy-aware SDK for LLM applications spanning models, tools, retrieval, and governance.

## Claims Direction
- Unified graph representation for training/serving/observability.
- Policy context as mandatory input for high-level APIs.
- Telemetry-by-design with structured spans for every primitive.
- Migration-safe contracts across local and hosted models.

## Modules
- Client/Transport abstraction (HTTP/gRPC/local).
- Model handle with chat/complete, tool invocation, and RAG context awareness.
- PolicyContext merging rules and governance hooks.
- Flow compiler emitting DAG with schemas and policy nodes.
- Telemetry layer compatible with OTLP/governance ledger.

## Reference Implementations
- Python SDK v0.1 (local transport, flow decorator, tool schema derivation).
- Thin JS client mirroring chat + RAG retrieve.

