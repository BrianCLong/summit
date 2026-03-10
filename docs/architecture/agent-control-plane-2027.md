# Agent Control Plane Architecture (2027)

## Strategic Position

Summit should treat the agent-orchestration market as a control-plane problem, not a framework race. The durable moat is a **knowledge-graph-native control plane** that routes by enterprise context, policy scope, and risk budget.

## 21-Tool Market Breakdown and Summit Action

| Tool | Category | Summit Action | Rationale |
| --- | --- | --- | --- |
| LangGraph | Workflow graph engine | COPY + INTEGRATE | Strong DAG/cycle orchestration primitive.
| CrewAI | Multi-agent collaboration | OBSOLETE | Lacks deep enterprise policy and graph memory.
| AutoGen | Multi-agent messaging | INTEGRATE | Useful for compatibility adapters.
| Semantic Kernel | Orchestration SDK | INTEGRATE | Enterprise plugin and planner interoperability.
| OpenAI Agents APIs | Hosted runtime | INTEGRATE | Runtime backend option without control-plane lock-in.
| CrewAI Enterprise | Agent management | OBSOLETE | Replace with graph-driven governance.
| LangChain Agents | General framework | INTEGRATE | Compatibility for existing ecosystems.
| Pega Agentic Fabric | Enterprise workflows | INTEGRATE | Strategic enterprise workflow bridge.
| ServiceNow orchestration | ITSM workflow control | INTEGRATE | Closed-loop incident connector value.
| Copilot Studio | Agent builder | INTEGRATE | External provider integration path.
| Watsonx Orchestrate | Enterprise orchestration | INTEGRATE | Enterprise adapter target.
| Relevance AI | Workflow platform | OBSOLETE | Summit should exceed via graph-native routing.
| Adept-style ACT systems | Computer action agents | COPY | Valuable automation primitive.
| AgentOps | Agent observability | COPY | Flight-recorder-grade traces required.
| LangSmith | LLM trace/eval | COPY + INTEGRATE | Evaluation and trace surfaces matter.
| LlamaIndex Agents | Retrieval agents | INTEGRATE | Data/retrieval interop path.
| MetaGPT | Autonomous teams | OBSOLETE | Not control-plane grade for enterprise.
| Devika | Dev-focused agents | OBSOLETE | Narrow specialist scope.
| HuggingFace Agents | Open runtime | INTEGRATE | Open ecosystem adapter.
| SuperAGI | Autonomous platform | OBSOLETE | Replace with deterministic governance-first runtime.
| Fixie | Event-driven agent runtime | COPY | Event routing pattern is high value.

## Ten Subsystems Summit Should Own

1. Capability registry
2. Deny-by-default policy decision point (PDP)
3. Graph context compiler
4. Evidence-attached task decomposition
5. Cost/risk/latency router
6. Durable saga runtime
7. Flight recorder telemetry
8. Causation and remediation engine
9. Human authority gateway
10. Interop fabric (MCP/A2A/OpenAPI/events)

## Deterministic Routing Standard

Routing order:

1. Filter by capability, policy, and risk budget.
2. Score candidates for capability confidence, graph relevance, success history, cost, and latency.
3. Tie-break by lower blast radius, higher determinism score, lower queue depth, then lexical `agent.id`.

This ensures replay-safe decisions suitable for audit and governance gates.

## Summit Module Map

```text
src/agents/controlplane/
  registry/
  planner/
  router/
  telemetry/
  policy/
src/graphrag/context-compiler/
```

## First Merge Lane (Foundation)

- Evidence bundle for this market scan.
- Registry + router + policy skeletons.
- Context compiler skeleton for GraphRAG integration.
- Guardrail policy file for agent schema requirements.

## Threat Model (Condensed)

- **Agent sprawl** → registry + ownership metadata.
- **Unauthorized actions** → deny-by-default policy gate.
- **Prompt injection** → policy-trimmed graph context package.
- **Non-deterministic behavior** → deterministic tie-break and replay checks.
