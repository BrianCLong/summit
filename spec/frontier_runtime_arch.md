# Frontier Runtime Architecture

## 1. Overview

The Frontier Runtime is a low-latency, multi-tenant inference stack designed for "tool-native" and "graph-native" execution. Unlike generic LLM inference servers (e.g., vLLM, TGI) which primarily focus on token generation, this runtime integrates tool orchestration, graph operations, and safety oversight as first-class citizens in the execution graph.

## 2. Logical Layers

### 2.1 Ingress API
- **Protocols**: HTTP and gRPC.
- **Endpoints**:
    - `/v1/chat`: Standard chat completion compatible with OpenAI API.
    - `/v1/completions`: Text completion.
    - `/v1/graph-run`: Endpoint for submitting complex graph/tool workflows.
- **Responsibilities**: Authentication, Rate Limiting, Tenant Metadata extraction.

### 2.2 Orchestration Core
- **Execution DAG**: Constructs a Directed Acyclic Graph (DAG) for each request.
    - **Nodes**: LLM calls, tool invocations, graph database operations, safety checks, evaluators.
    - **Edges**: Data dependencies and control flow.
- **Trace Management**: Maintains a comprehensive reasoning trace for SRE, training feedback, and alignment.

### 2.3 Model Serving Layer
- **Model Management**: Handles 1.3B (current) and 7B+ (future) models.
- **Optimization**: KV caching, batching, device placement, and parallelism.

### 2.4 Tool / Graph Layer
- **Unified Interface**: A single abstraction for:
    - **External Tools**: HTTP APIs, database connectors, search engines.
    - **IntelGraph**: Read/Write operations against the graph database.
- **Schema**: Strongly typed tool schemas and consistent trace logging.

### 2.5 Safety & Oversight Hooks
- **Pre-filters**: Validation of prompts and tool calls before execution.
- **Mid-flight Checks**: Real-time calls to oversight models or rule engines during generation/execution.
- **Post-filters**: Validation of final responses, tool execution plans, and graph mutations.

### 2.6 Telemetry & Logging
- **Structured Tracing**: Detailed logs including:
    - Per-node latency.
    - Error rates and safety events.
    - Tool and graph usage coverage.
    - Per-tenant statistics.

## 3. Interfaces

### 3.1 Request Submission
```python
# Conceptual Python Example
resp = runtime.handle_request(
    endpoint="chat",
    request={
        "messages": [...],
        "tools": [...],
        "graph_context": {...},
        "tenant": "acme",
    }
)
```

### 3.2 Tool Registration
```python
# Conceptual Python Example
runtime.register_tool(
    name="sql_query",
    schema={
        "type": "object",
        "properties": {
            "query": {"type": "string"}
        },
        "required": ["query"]
    },
    handler=sql_query_handler,
)
```

### 3.3 Policy Registration
```python
# Conceptual Python Example
runtime.register_policy("default", DefaultRoutingPolicy())
```

## 4. Artifacts

- **Spec**: `/spec/frontier_runtime_arch.md` (This document)
- **Schemas**: `/impl/runtime/schemas/{trace,request,tool,graph}.schema.json`
