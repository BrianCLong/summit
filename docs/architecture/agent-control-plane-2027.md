<<<<<<< HEAD
# Agent Control Plane — 2027 Target Architecture

**Item slug:** agent-fleet-control-plane-2027
**Evidence IDs:** EVD-AFCP-ARCH-001
**Source:** CIO — 21 Agent Orchestration Tools for Managing Your AI Fleet (Mar 5, 2026)

---

## 1. Strategic Position

The industry is building agent *frameworks*.  Summit builds agent *infrastructure*.

Competitors center on: prompts, workflow DAGs, dashboards.
Summit centers on: graph-compiled context, deterministic routing, durable execution, policy decisions, evidence-grade observability.

Summit's differentiation is the **Knowledge-Graph Agent Control Plane** — the first enterprise-grade system where agent selection, execution, and governance are driven by a live enterprise knowledge graph rather than static prompt templates or workflow scripts.

---

## 2. The 10 Subsystems Competitors Are Missing

| # | Subsystem | Summit module |
|---|-----------|---------------|
| 1 | Capability Registry | `src/agents/controlplane/registry/` |
| 2 | Policy Decision Point (deny-by-default) | `src/agents/controlplane/policy/` |
| 3 | Graph Context Compiler | `src/graphrag/context-compiler/` |
| 4 | Task Decomposer with Evidence Hooks | `src/agents/controlplane/planner/` |
| 5 | Cost / Latency / Risk Router | `src/agents/controlplane/router/` |
| 6 | Durable Saga Runtime | `src/agents/runtime/saga/` |
| 7 | Flight Recorder | `src/agents/controlplane/telemetry/` |
| 8 | Remediation / Causation Engine | `src/agents/controlplane/remediation/` (innovation lane) |
| 9 | Human Authority Gateway | `src/api/graphql/human-approvals/` (innovation lane) |
| 10 | Interop Fabric (MCP / A2A / OpenAPI / Events) | `src/connectors/interop/` (innovation lane) |

---

## 3. Reference Architecture

```
request
  -> API auth
  -> Policy Decision Point        (deny-by-default)
  -> Graph Context Compiler       (Neo4j + vector search)
  -> Task Decomposer              (produces subtasks + evidence IDs)
  -> Capability Registry          (agent catalog lookup)
  -> Deterministic Router         (cost / risk / latency scoring)
  -> Durable Saga Runtime         (Temporal-backed execution)
  -> Flight Recorder              (structured telemetry)
  -> Human Authority Gateway      (when requiresApproval = true)
  -> Audit Export                 (evidence index update)
```

---

## 4. Agent Routing Algorithm

### Eligibility filter (all must pass)

1. Agent advertises all `requiredCapabilities`.
2. Agent tools ⊇ task `requiredTools` (or wildcard `*`).
3. Agent datasets ⊇ task `requiredDatasets`.
4. `agent.riskLevel ≤ task.riskBudget`.
5. If task `riskBudget = high`: `agent.observabilityScore ≥ 0.5`.

### Scoring formula

```
score =
  0.30 × capabilityConfidence
+ 0.20 × graphRelevance
+ 0.15 × priorSuccessRate
+ 0.10 × latencyFitness
+ 0.10 × costFitness
+ 0.10 × determinismScore
+ 0.05 × observabilityScore
```

### Tie-break order (ascending priority)

1. Lower blast radius.
2. Higher determinism score.
3. Lower marginal cost.
4. Lower queue depth.
5. Lexical ascending `agentId` (stable sort guarantee).

---

## 5. Ecosystem Strategy

| Tool | Action | Rationale |
|------|--------|-----------|
| LangGraph | COPY | Cyclic planning primitives |
| Temporal | COPY | Durable restartable execution |
| Pydantic AI | COPY | Typed contracts + validation |
| Kubiya | COPY | Deterministic ops mode |
| Vellum | COPY | Eval / regression loops |
| PagerDuty | COPY | Remediation closure loop |
| BigPanda | COPY | Alert correlation |
| DynaTrace | COPY | Root-cause causation |
| Griptape | COPY | Context compaction |
| AWS Bedrock AgentCore | INTEGRATE | Execution substrate |
| AutoGen / Semantic Kernel | INTEGRATE | Interop / MCP |
| LlamaIndex | INTEGRATE | Retrieval adapter |
| ServiceNow | INTEGRATE | ITSM connector |
| Agentforce | INTEGRATE | CRM surface |
| n8n | INTEGRATE | Edge orchestration |
| CrewAI | OBSOLETE | No governance, no graph |
| Relevance AI | OBSOLETE | No enterprise memory |

---

## 6. Feature Flags

All foundation-lane modules ship behind environment flags defaulting to `false`.

| Flag | Controls |
|------|----------|
| `SUMMIT_AGENT_CONTROL_PLANE` | Master switch |
| `SUMMIT_GRAPH_CONTEXT_COMPILER` | Neo4j graph compilation |
| `SUMMIT_DETERMINISTIC_ROUTER` | Scored routing |
| `SUMMIT_DURABLE_SAGA_RUNTIME` | Temporal saga execution |
| `SUMMIT_CAUSATION_ENGINE` | Remediation / root-cause (innovation lane) |
| `SUMMIT_INTEROP_FABRIC` | MCP / A2A / OpenAPI connectors (innovation lane) |

---

## 7. GA Success Metrics

| Metric | Target |
|--------|--------|
| Mean routing latency | < 50 ms (excl. remote execution) |
| Deterministic replay agreement | 100% |
| Policy violation rate in eval | 0 |
| Recovery success after injected failure | > 95% |
| Context token reduction vs naive RAG | > 40% |
| Audit artifact completeness | 100% |

---

## 8. Rollback Protocol

1. Set `SUMMIT_AGENT_CONTROL_PLANE=false`.
2. Preserve registry descriptors and audit/evidence artifacts.
3. No destructive schema migration in the foundation lane.
4. Disable individual subsystem flags independently if needed.
=======
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
>>>>>>> origin/main
