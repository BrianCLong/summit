# Knowledge-Graph Orchestration Engine

**Item slug:** agent-fleet-control-plane-2027
**Evidence IDs:** EVD-AFCP-KG-003
**Module:** `src/graphrag/context-compiler/`

---

## 1. Purpose

The Knowledge-Graph Orchestration Engine is Summit's core leap beyond all 21 tools in the CIO ecosystem survey.

**Competitors route from prompt text.**
**Summit routes from a compiled enterprise graph.**

The compiler converts a raw task spec into a policy-trimmed, token-budgeted `GraphContextPackage` that the router and planner consume.  Agent selection is driven by:

- task dependency graph
- agent capability graph
- enterprise data graph

---

## 2. Graph Schema

### Entities

| Entity | Key properties |
|--------|---------------|
| Task | id, type, goal, capabilities, riskBudget |
| Agent | id, capabilities, tools, datasets, riskLevel |
| Capability | id, description, requiredTools |
| Tool | id, allowedDatasets, riskLevel |
| Dataset | id, classification, owner |
| Policy | id, scope, rules |
| ApprovalRole | id, authorisedCapabilities |
| Workflow | id, steps |
| EvidenceArtifact | id, type, files |
| Incident | id, affectedEntities, severity |
| Outcome | agentId, taskType, successRate, latencyP50ms |

### Edges

| Edge | Meaning |
|------|---------|
| Task REQUIRES Capability | Task needs a capability to proceed |
| Agent PROVIDES Capability | Agent can fulfil a capability |
| Agent USES Tool | Agent is authorised to invoke a tool |
| Tool TOUCHES Dataset | Tool reads or writes a dataset |
| Policy CONSTRAINS Dataset | Policy governs access to a dataset |
| ApprovalRole APPROVES Task | Role can grant approval for a task type |
| Outcome UPDATES priorSuccessRate | Outcome feeds back to routing scores |
| Incident DERIVES remediationPlaybook | Incident generates a runbook |

---

## 3. Compiler Stages

### Stage 1 — Entity Bind
Map request tokens (task type, goal keywords) to graph entity ids.

Production: Neo4j full-text index + entity resolver.
Foundation stub: synthetic `entity:<type>:<taskId>`.

### Stage 2 — Neighborhood Expand
Fetch 1–2 hop subgraph from the bound entities.

Production: Cypher `MATCH (n)-[*1..2]-(m) WHERE n.id IN $entities`.
Foundation stub: returns empty edge list.

### Stage 3 — Policy Trim
Remove nodes and edges that violate the active policy scope.

Production: OPA / PDP evaluation per subgraph node.
Foundation stub: returns empty allowlists (safe default).

### Stage 4 — Context Compact
Summarise the trimmed subgraph to fit within the token budget.

Production: graph summariser targeting ≥ 40% token reduction vs naive RAG.
Foundation stub: passthrough, zero token count.

---

## 4. GraphContextPackage

```typescript
interface GraphContextPackage {
  entities:        string[];   // bound entity ids
  subgraph:        unknown;    // compacted subgraph (opaque)
  allowedDatasets: string[];   // policy-approved datasets
  allowedTools:    string[];   // policy-approved tools
  evidenceIds:     string[];   // evidence artifacts for this context
  tokenCount:      number;     // tokens consumed by this package
}
```

---

## 5. Context Compaction Strategy

Goal: reduce the token footprint of graph context vs a naive "dump everything" RAG by ≥ 40%.

Techniques:
1. **Hop bounding**: never exceed 2 hops from bound entities.
2. **Policy pre-trim**: remove forbidden nodes before summarisation.
3. **Edge deduplication**: collapse parallel edges between same node pairs.
4. **Entity clustering**: group semantically similar entities.
5. **Keyword salience**: weight nodes by relevance to task goal.

---

## 6. Benchmark Plan

| Metric | Baseline (naive RAG) | Target |
|--------|---------------------|--------|
| Mean token count per context | TBD | ≤ 0.6× baseline |
| Policy violation rate | — | 0 |
| Context compile latency | — | < 100 ms |
| Entity bind recall@5 | — | > 0.90 |

---

## 7. Innovation Lane Enablement

The graph context compiler is behind `SUMMIT_GRAPH_CONTEXT_COMPILER=true`.

Enable sequence:
1. Neo4j schema migration merged and validated.
2. OPA policy trim rules unit-tested.
3. Context compaction benchmark passes token-reduction target.
4. Evidence files updated with benchmark results.
5. Flag enabled in staging; e2e smoke passes.
6. Flag enabled in production.
