# Summit Autonomous Research Lab (SARL)

A persistent, self-improving AI research system that continuously ingests knowledge, builds a living knowledge graph, and runs long-horizon investigations.

This design extends the previous Summit Deep Research Engine into a persistent research ecosystem capable of multi-week autonomous analysis.

All components target BrianCLong/summit.

## 1.0 ITEM

**Concept**
Autonomous research systems that:

* continuously ingest literature
* synthesize knowledge
* run long-duration investigations
* improve investigation strategies over time

This builds on:

* deep research workflows
* industry research agents
* graph-based reasoning

## 1.1 Ground Truth Capture

**ITEM:CLAIM-01**
Deep research agents perform multi-step reasoning across many sources.

**ITEM:CLAIM-02**
Industry research agents investigate discrepancies and anomalies.

**ITEM:CLAIM-03**
Automation eliminates low-value investigative work.

**ITEM:CLAIM-04**
Agents become more valuable when they accumulate domain knowledge.

**ITEM:CLAIM-05**
Research productivity increases with continuous knowledge ingestion.

**ITEM:CLAIM-06**
Persistent systems enable long-horizon investigations.

## 1.2 Claim Registry

| Planned capability | Claim |
|---|---|
| Long-horizon investigation loops | CLAIM-06 |
| Continuous knowledge ingestion | CLAIM-05 |
| Autonomous anomaly investigation | CLAIM-02 |
| Industry specialization | CLAIM-04 |
| Graph reasoning | Summit original |
| Self-improving agents | Summit original |

## 1.3 Repo Reality Check

Verified from uploaded architecture file.

### Verified

```text
src/
  agents/
  connectors/
  graphrag/
  api/

tests/
.github/workflows/
```

### New modules (ASSUMPTION)

```text
src/lab/
src/lab/experiments/
src/lab/investigations/
src/lab/knowledge/
src/lab/learning/
```

### repo_assumptions.md

`docs/architecture/repo_assumptions.md`

**Validation checklist**

* verify GraphRAG ingestion pipeline
* confirm agent orchestration layer
* confirm CI artifact naming
* confirm connector schema

## 1.4 Minimal Winning Slice (MWS)

**Sentence**
Implement a Summit Autonomous Research Lab capable of continuously ingesting research sources and running a multi-step autonomous investigation.

**Acceptance tests**

* `tests/e2e/autonomous-investigation.e2e.ts`
* `tests/lab/research-loop.test.ts`

**Scenario**
Input:
"Investigate trends in vendor cost increases across industries."

System runs:
ingestion → graph update → research loop → report

**Artifacts**

* `report.json`
* `metrics.json`
* `stamp.json`

**Evidence format**
`EVID:<source>:<node>:<hash>`

## 1.5 SARL Architecture

### Persistent research loop

```text
New Data Sources
        │
        ▼
Literature Ingestion
        │
        ▼
Knowledge Graph Builder
        │
        ▼
Research Agent Network
        │
        ▼
Investigation Workspace
        │
        ▼
Research Reports
```

### Core modules

| Module | Path |
|---|---|
| Autonomous research loop | `src/lab/researchLoop.ts` |
| Investigation manager | `src/lab/investigations/manager.ts` |
| Knowledge ingestion | `src/lab/knowledge/ingestion.ts` |
| Self-improvement engine | `src/lab/learning/optimizer.ts` |
| Experiment tracker | `src/lab/experiments/tracker.ts` |

## 1.6 PR Stack (Hard Stop: 7)

### PR1 — Research Lab Framework

`feat(lab): introduce Summit Autonomous Research Lab`

**Files**

* `src/lab/researchLoop.ts`
* `src/lab/types.ts`

**Patch**

```typescript
export interface Investigation {
  id: string
  question: string
  status: "running" | "complete"
}

export class ResearchLab {
  async runInvestigation(inv: Investigation) {
    return { status: "running" }
  }
}
```

### PR2 — Continuous Literature Ingestion

**Purpose**
Automatically ingest knowledge sources.

**Files**

* `src/lab/knowledge/ingestion.ts`

**Sources**

* research papers
* news
* financial filings
* internal docs

**Output**

* graph updates

### PR3 — Continuous Knowledge Graph Builder

`feat(graphrag): continuous knowledge graph construction`

**Files**

* `src/graphrag/pipelines/continuousBuilder.ts`

**Responsibilities**

* entity extraction
* relationship inference
* graph updates

### PR4 — Investigation Workspace

Long-horizon research tasks.

**Files**

* `src/lab/investigations/workspace.ts`

**Capabilities**

* multi-step reasoning
* branching investigations
* hypothesis testing

### PR5 — Self-Improving Research Agents

**Purpose**
Improve investigation strategies.

**Files**

* `src/lab/learning/optimizer.ts`

**Improves**

* search strategies
* retrieval queries
* reasoning chains

### PR6 — Experiment Tracking System

**Files**

* `src/lab/experiments/tracker.ts`

**Tracks**

* investigation performance
* hypothesis accuracy
* agent improvements

**Artifacts**

* `experiments.json`

### PR7 — Autonomous Investigation Scheduler

**Purpose**
Enable multi-week research tasks.

**Files**

* `src/lab/investigations/scheduler.ts`

**Example workflow**

* daily ingestion
* weekly graph rebuild
* continuous investigations

## 1.7 Interop & Standards

**Output**
`docs/standards/autonomous-research-lab.md`

### Import matrix

| Source | Connector |
|---|---|
| papers | ingestion |
| news | connector |
| internal docs | graph pipeline |
| databases | connectors |

### Export matrix

| Artifact | Format |
|---|---|
| research reports | JSON |
| knowledge graph | Graph |
| investigation trace | JSON |

## 1.8 Threat-Informed Requirements

| Threat | Mitigation |
|---|---|
| poisoned knowledge sources | source trust scoring |
| hallucinated evidence | mandatory citations |
| prompt injection | input sanitization |
| runaway investigations | step limits |

**Tests**

* `tests/security/autonomous-research.test.ts`

## 1.9 Performance & Cost Budgets

| Metric | Target |
|---|---|
| investigation latency | < 30s step |
| memory | < 2GB |
| cost/run | <$1 |

**CI gate**

* `.github/workflows/lab-performance.yml`

## 1.10 Data Classification

**Doc**
`docs/security/data-handling/autonomous-research.md`

**Never log**

* PII
* credentials
* confidential documents

**Retention**

* research logs → 30 days
* metrics → 1 year

## 1.11 Operational Readiness

**Runbook**
`docs/ops/runbooks/autonomous-research-lab.md`

**Monitoring**

* investigation progress
* graph size
* knowledge ingestion rate

**SLO**

* successful investigation > 90%

## 1.12 Competitive Teardown

### Current frontier systems

| Platform | Capability |
|---|---|
| OpenAI Deep Research | autonomous research |
| Perplexity | citation synthesis |
| Google DeepMind systems | research automation |
| Glean | enterprise knowledge search |

### Summit positioning

Summit becomes: An enterprise autonomous research platform.
Key differentiator: GraphRAG + persistent investigations + enterprise connectors

## 1.13 Convergence Protocol

**Agents**

* Planner
* Retriever
* Synthesizer
* Investigator
* Reporter

**Workflow**

```text
Planner
 ↓
Retriever
 ↓
Synthesizer
 ↓
Investigator
 ↓
Reporter
```

**Conflict rule**

* master plan wins
* Agents propose diffs only.

## 1.14 Post-Merge Monitoring

**Scheduled job**

* `.github/workflows/research-lab-drift.yml`

**Scripts**

* `scripts/monitoring/research-lab-drift.ts`

**Tracks**

* investigation accuracy
* graph growth
* knowledge coverage

**Artifacts**

* `trend-report.json`

## 1.15 Strategic Impact

This architecture transforms Summit into something very few open systems currently provide.

### Capability evolution

| Stage | System |
|---|---|
| 1 | GraphRAG framework |
| 2 | Deep Research Engine |
| 3 | Autonomous Research Lab |

### Final architecture

```text
Connectors
     │
     ▼
Continuous Knowledge Graph
     │
     ▼
Research Agent Network
     │
     ▼
Autonomous Investigations
     │
     ▼
Enterprise Research Reports
```

🚀 **The Big Picture**
If implemented, Summit becomes a platform for:

* AI research analysts
* AI auditors
* AI investigators
* AI competitive intelligence systems
* AI market analysts

Very few platforms combine:

* persistent knowledge graphs
* deep research agents
* autonomous investigation loops
* enterprise data connectors

This is essentially an enterprise-native alternative to OpenAI Deep Research.
