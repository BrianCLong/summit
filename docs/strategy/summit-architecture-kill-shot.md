# The Summit Architecture Kill Shot

A blueprint for a single feature that would make Summit dramatically more powerful than most RAG systems overnight.

This follows the required Summit planning structure and keeps scope constrained to ≤7 PRs, with a Minimal Winning Slice that is actually shippable.

## 1.0 ITEM

**Concept**

Most RAG systems answer questions.
Summit should instead perform investigations.

The kill shot is:
**Evidence Graph Execution (EGX)**

A system where every research query generates a machine-executable investigation graph that:

* retrieves evidence
* verifies claims
* detects contradictions
* produces structured findings

Instead of: Question → retrieve docs → summarize
Summit does: Question → build investigation graph → execute reasoning pipeline → produce verified report

This transforms Summit from RAG into AI investigation infrastructure.

## 1.1 Ground Truth Capture

**ITEM:CLAIM-01**
RAG systems primarily retrieve and summarize documents.

**ITEM:CLAIM-02**
Complex research requires multi-step investigation workflows.

**ITEM:CLAIM-03**
Knowledge graphs enable structured reasoning over relationships.

**ITEM:CLAIM-04**
Evidence-backed reasoning requires traceable sources.

**ITEM:CLAIM-05**
Multi-agent investigation improves analytical accuracy.

## 1.2 Claim Registry

| Planned capability | Claim |
|---|---|
| Investigation graph | CLAIM-02 |
| Graph reasoning | CLAIM-03 |
| Evidence citations | CLAIM-04 |
| Agent investigation workflows | CLAIM-05 |
| GraphRAG integration | Summit original |
| Executable reasoning graphs | Summit original |

## 1.3 Repo Reality Check

Verified directories:

```text
src/
  agents/
  connectors/
  graphrag/
  api/
```

New module required (ASSUMPTION):
`src/investigation/`

Validation checklist before implementation:

* confirm GraphRAG retrieval interface
* confirm agent orchestration layer
* confirm artifact output format

Must-not-touch:

* `.github/workflows/ci-core.yml`
* `.github/workflows/ci-security.yml`
* `.github/workflows/codeql.yml`

## 1.4 Minimal Winning Slice

**Sentence**
Implement an Evidence Graph Execution engine that converts a research question into an investigation graph and executes it to produce a verified report.

**Example input:**
"Why did vendor costs increase last quarter?"

**Generated investigation graph:**
vendor invoices → quarterly spend → anomaly detection

**Artifacts:**

* `report.json`
* `investigation-graph.json`
* `metrics.json`
* `stamp.json`

**Evidence ID format:**
`EVID:<dataset>:<node>:<hash>`

**Acceptance tests:**

* `tests/e2e/investigation.e2e.ts`
* `tests/investigation/graph-execution.test.ts`

## 1.5 Evidence Graph Execution Architecture

**Core concept:**
Every query becomes a graph program.

Example:

* Node A → retrieve invoices
* Node B → compute quarterly spend
* Node C → detect anomalies
* Node D → summarize findings

**Execution pipeline:**

```text
Query
  ↓
Investigation Planner
  ↓
Investigation Graph
  ↓
Graph Executor
  ↓
Evidence + Findings
```

## 1.6 PR Stack (Hard Stop: 6)

### PR1 — Investigation Graph Schema

`feat(investigation): add investigation graph schema`

**Files:**
`src/investigation/types.ts`

**Patch:**

```typescript
export interface InvestigationNode {
  id: string
  type: "retrieve" | "analyze" | "reason" | "report"
  input?: string[]
}

export interface InvestigationGraph {
  nodes: InvestigationNode[]
  edges: [string, string][]
}
```

### PR2 — Investigation Planner

**Purpose:**
Convert natural language queries into investigation graphs.

**Files:**
`src/investigation/planner.ts`

**Example output:**

```json
[
 "retrieve vendor invoices",
 "calculate quarterly totals",
 "detect anomalies"
]
```

### PR3 — Graph Executor

`feat(investigation): investigation graph executor`

**Files:**
`src/investigation/executor.ts`

**Patch:**

```typescript
export class InvestigationExecutor {
  async run(graph) {
    return {
      findings: [],
      evidence: []
    }
  }
}
```

### PR4 — GraphRAG Integration

**Purpose:**
Use knowledge graph retrieval as investigation steps.

**Files:**
`src/graphrag/pipelines/investigation.ts`

**Capabilities:**

* entity retrieval
* relationship reasoning
* evidence graph construction

### PR5 — Evidence Verification

**Purpose:**
Verify claims across multiple sources.

**Files:**
`src/investigation/verifier.ts`

**Detects:**

* contradictions
* missing evidence
* unsupported claims

### PR6 — Investigation Report Generator

Outputs structured results.

**Files:**
`src/investigation/report.ts`

**Artifacts:**

* `report.json`
* `investigation-graph.json`
* `trace.json`

## 1.7 Interop & Standards

**New standard artifacts:**

* `investigation-graph.json`
* `report.json`
* `trace.json`

**Documentation:**
`docs/standards/investigation-graphs.md`

**Example investigation graph:**

```json
{
  "nodes":[
    {"id":"retrieve_invoices","type":"retrieve"},
    {"id":"compute_totals","type":"analyze"},
    {"id":"detect_anomalies","type":"reason"}
  ]
}
```

## 1.8 Threat-Informed Requirements

| Threat | Mitigation |
|---|---|
| hallucinated evidence | citation verification |
| incorrect reasoning | graph traceability |
| prompt injection | query sanitization |
| data poisoning | trusted source filtering |

**Tests:**
`tests/security/investigation-security.test.ts`

## 1.9 Performance Budgets

| Metric | Target |
|---|---|
| graph planning latency | < 3s |
| investigation execution | < 15s |
| memory | < 1GB |

**CI gate:**
`.github/workflows/investigation-performance.yml`

## 1.10 Data Classification

**Doc:**
`docs/security/data-handling/investigations.md`

**Never log:**

* credentials
* PII
* confidential docs
* financial records

**Retention:**

* investigation logs → 30 days
* metrics → 1 year

## 1.11 Operational Readiness

**Runbook:**
`docs/ops/runbooks/investigation-engine.md`

**Monitoring metrics:**

* investigation latency
* evidence coverage
* contradiction detection rate

**SLO:**
successful investigation > 95%

## 1.12 Competitive Impact

Most RAG systems do: query → retrieve → summarize
Summit would do: query → investigation graph → execution → verified findings

Comparison:

| System | Capability |
|---|---|
| LangChain RAG | document Q&A |
| vector DBs | retrieval |
| Perplexity | citation synthesis |
| Summit | investigation engine |

## 1.13 Convergence Protocol

**Agents involved:**

* Planner
* Retriever
* Analyzer
* Verifier
* Reporter

**Execution pipeline:**

```text
Planner
  ↓
Retriever
  ↓
Analyzer
  ↓
Verifier
  ↓
Reporter
```

**Conflict rule:**
master plan wins
Agents propose diffs only.

## 1.14 Post-Merge Monitoring

**Scheduled job:**
`.github/workflows/investigation-drift.yml`

**Scripts:**
`scripts/monitoring/investigation-drift.ts`

**Tracks:**

* investigation success rate
* evidence coverage
* contradiction frequency

**Artifacts:**
`trend-report.json`

## 1.15 Why This Is the Kill Shot

This feature changes Summit from knowledge retrieval framework into AI investigation infrastructure.

**Key advantages:**

1. **Explainable reasoning**: Every result has a traceable graph.
2. **Reusable investigations**: Investigation graphs become reusable workflows.
3. **Higher analytical accuracy**: Verification nodes detect contradictions.
4. **Enterprise trust**: Structured investigations are auditable.

**Final Insight**
Most AI systems answer questions. Very few conduct investigations.
If Summit becomes the platform where investigations are executable graphs, it occupies a new category: AI investigation infrastructure.
That single architectural shift could be the breakthrough feature that separates Summit from the crowded RAG ecosystem.
