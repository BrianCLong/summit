# Summit Deep Research Engine (SDRE)

A deterministic, enterprise-safe AI research analyst platform built on GraphRAG + multi-agent reasoning + anomaly investigation + enterprise connectors.

All design decisions target BrianCLong/summit as the canonical repo.

## 1.0 ITEM

**Conceptual ITEM:**
Deep Industry Research Agents + OpenAI-style Deep Research workflows applied to enterprise data.

**Goal**
Implement a Summit Deep Research Engine that:

* Investigates complex questions
* Synthesizes evidence from internal + external data
* Detects anomalies or contradictions
* Produces machine-verifiable research reports

## 1.1 Ground Truth Capture

**ITEM:CLAIM-01**
Deep industry research agents are specialized AI analysts tuned to industries and case types.

**ITEM:CLAIM-02**
They investigate operational anomalies and discrepancies.

**ITEM:CLAIM-03**
They learn recurring patterns and automate routine investigations.

**ITEM:CLAIM-04**
Humans handle only unresolved anomalies.

**ITEM:CLAIM-05**
Deep research systems perform multi-step reasoning across multiple sources.

**ITEM:CLAIM-06**
Enterprise productivity gains come from removing manual investigation work.

## 1.2 Claim Registry

| Feature | Source |
|---|---|
| Deep research multi-step pipeline | CLAIM-05 |
| Industry-specific agents | CLAIM-01 |
| Exception investigation | CLAIM-02 |
| Pattern learning | CLAIM-03 |
| Human escalation | CLAIM-04 |
| Evidence synthesis | CLAIM-06 |
| GraphRAG reasoning | Summit original |
| Enterprise connectors | Summit original |

## 1.3 Repo Reality Check

Using the uploaded architecture file.

### Verified paths

```text
src/
  agents/
  connectors/
  graphrag/
  api/graphql/
  api/rest/

tests/
.github/workflows/
```

### ASSUMPTED paths

```text
src/research/
src/agents/deep-research/
src/graphrag/pipelines/research/
src/connectors/external/
scripts/research/
```

### repo_assumptions.md

`docs/architecture/repo_assumptions.md`

**Validation checklist:**

* confirm agent framework location
* confirm GraphRAG pipeline interface
* confirm CI artifact patterns
* confirm connectors schema

## 1.4 Minimal Winning Slice (MWS)

**Sentence**
Implement a Summit Deep Research Engine capable of autonomously investigating a complex research query using GraphRAG evidence synthesis and anomaly detection.

**Acceptance tests**

* `tests/e2e/deep-research-investigation.e2e.ts`
* `tests/agents/research-agent.test.ts`

**Scenario:**
Input:
"Why did vendor costs increase 40% last quarter?"

Expected output:

* `report.json`
* evidence graph
* reasoning trace
* anomaly classification

**Artifacts:**

* `report.json`
* `metrics.json`
* `stamp.json`

**Evidence ID pattern**
`EVID:<dataset>:<node>:<hash>`

## 1.5 Summit Deep Research Engine Architecture

### Core loop

```text
Research Question
       │
       ▼
Planner Agent
       │
       ▼
Evidence Retrieval (GraphRAG)
       │
       ▼
Synthesis Agent
       │
       ▼
Anomaly Investigator
       │
       ▼
Research Report
```

### System modules

| Module | Path |
|---|---|
| Research orchestrator | `src/research/engine.ts` |
| Planner agent | `src/agents/deep-research/planner.ts` |
| Evidence retriever | `src/graphrag/pipelines/research/` |
| Synthesis agent | `src/agents/deep-research/synthesis.ts` |
| Anomaly investigator | `src/agents/deep-research/anomaly.ts` |
| Report generator | `src/research/report.ts` |

## 1.6 PR Stack (Hard Stop: 7 PRs)

### PR1 — Deep Research Engine

`feat(research): introduce Summit Deep Research Engine`

**Files**

* `src/research/engine.ts`
* `src/research/types.ts`

**Patch**

```typescript
export interface ResearchQuery {
  question: string
  scope?: string[]
}

export interface ResearchResult {
  summary: string
  evidence: string[]
  anomalies: string[]
}

export class DeepResearchEngine {
  async investigate(query: ResearchQuery): Promise<ResearchResult> {
    return {
      summary: "",
      evidence: [],
      anomalies: []
    }
  }
}
```

**Tests**

* `tests/research/engine.test.ts`

### PR2 — Planner Agent

**Purpose**
Break complex research queries into tasks.

**Files**

* `src/agents/deep-research/planner.ts`

**Example output**

```json
[
 "retrieve vendor invoices",
 "compare quarterly spend",
 "detect anomalies"
]
```

### PR3 — GraphRAG Research Pipeline

`feat(graphrag): research evidence retrieval pipeline`

**Files**

* `src/graphrag/pipelines/research/retrieve.ts`

**Patch**

```typescript
export async function retrieveResearchEvidence(query: string) {
  return {
    nodes: [],
    relationships: [],
    sources: []
  }
}
```

### PR4 — Synthesis Agent

Combines evidence into findings.

**Files**

* `src/agents/deep-research/synthesis.ts`

**Responsibilities**

* cross-source reasoning
* contradiction detection
* summarization

### PR5 — Anomaly Investigator

Investigates irregular findings.

**Files**

* `src/agents/deep-research/anomaly.ts`

**Detects**

* cost spikes
* missing records
* contradictory sources

### PR6 — Enterprise Connectors

Add research-grade data ingestion.

**Files**

* `src/connectors/external/`
  * `sec.ts`
  * `news.ts`
  * `filings.ts`
  * `databases.ts`

**Example**

* SEC filings
* earnings transcripts
* internal docs
* tickets
* financial records

### PR7 — Research Benchmarks

**Purpose**
Measure investigation capability.

**Files**

* `scripts/benchmarks/research-benchmark.ts`
* `tests/benchmarks/research.test.ts`

**Metrics**

* investigation latency
* evidence coverage
* contradiction detection

**Outputs**

* `metrics.json`

## 1.7 Interop & Standards

**Output doc**
`docs/standards/deep-research-engine.md`

### Import matrix

| Source | Connector |
|---|---|
| internal docs | graph ingestion |
| financial DB | connector |
| news | connector |
| web | crawler |

### Export matrix

| Artifact | Format |
|---|---|
| research report | JSON |
| reasoning graph | Graph |
| audit trace | JSON |

## 1.8 Threat-Informed Requirements

| Threat | Mitigation |
|---|---|
| hallucinated evidence | citation requirement |
| prompt injection | source validation |
| data exfiltration | connector sandbox |
| reasoning loops | max reasoning steps |

**Tests**

* `tests/security/research-agent-security.test.ts`

## 1.9 Performance & Cost Budgets

| Metric | Target |
|---|---|
| research latency | < 15s |
| memory | < 1GB |
| cost/run | <$0.25 |

**CI gate**

* `.github/workflows/research-performance.yml`

## 1.10 Data Classification

**Doc**
`docs/security/data-handling/deep-research.md`

**Never log**

* financial records
* personal data
* internal strategy docs

**Retention**

* research logs → 30 days
* metrics → 1 year

## 1.11 Operational Readiness

**Runbook**
`docs/ops/runbooks/deep-research-engine.md`

**Monitoring**

* investigation latency
* error rate
* anomaly rate

**SLO**

* successful investigation > 95%

## 1.12 Competitive Teardown

### Current systems

| Platform | Capability |
|---|---|
| OpenAI Deep Research | web research |
| Perplexity Research | citation synthesis |
| OnCorps | financial reasoning |
| Glean | enterprise search |

### Summit advantage

GraphRAG + structured reasoning + enterprise connectors.

**Meaning:**
Summit becomes: The open enterprise deep-research engine.

## 1.13 Convergence Protocol

**Agents:**

* Planner
* Evidence Retriever
* Synthesizer
* Anomaly Investigator
* Reporter

**Workflow**

```text
Planner
  ↓
Retriever
  ↓
Synthesizer
  ↓
Anomaly Investigator
  ↓
Reporter
```

**Conflict rule**

* master plan wins
* Agents propose diffs only.

## 1.14 Post-Merge Monitoring

**Scheduled job**

* `.github/workflows/research-drift.yml`

**Scripts**

* `scripts/monitoring/research-drift.ts`

**Tracks**

* research accuracy
* citation coverage
* anomaly detection

**Outputs**

* `trend-report.json`

## 1.15 Strategic Impact for Summit

This upgrade turns Summit from:
GraphRAG framework
into
Enterprise Deep Research Platform

### Capability jump

| Before | After |
|---|---|
| Graph retrieval | Autonomous research |
| Knowledge graph | Investigation engine |
| Agents | Research analysts |

### Strategic positioning

Summit becomes a platform for:

* AI analysts
* AI auditors
* AI investigators
* AI competitive intelligence agents

🚀 **The Real Opportunity**
The combination of:
Deep Research + GraphRAG + Industry agents + Enterprise connectors
is basically the architecture for the next generation of enterprise AI systems.

Very few platforms currently implement this stack end-to-end.
Summit could.
