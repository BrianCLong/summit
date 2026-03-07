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
