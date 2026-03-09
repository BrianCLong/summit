# Summit 12-Month Build Strategy

A realistic roadmap that converts the previous architectures into an executable development program for BrianCLong/summit.

This plan respects the Scope Guardrails:

* max 5–7 PRs per subsystem
* no massive refactors
* deterministic artifacts
* feature flags default OFF
* each phase ships a usable capability

The roadmap builds the stack in four layers:
GraphRAG Core → Deep Research Engine → Autonomous Research Lab → Cognitive Enterprise

## 1.0 ITEM

**Objective**
Turn Summit into: The open infrastructure for enterprise AI research and decision intelligence.

Capabilities delivered in sequence:

* GraphRAG platform
* AI research analyst engine
* autonomous investigation lab
* enterprise decision infrastructure

## 1.1 Ground Truth Capture

**ITEM:CLAIM-01**
Deep research requires multi-step reasoning across sources.

**ITEM:CLAIM-02**
Industry agents automate investigation of operational anomalies.

**ITEM:CLAIM-03**
Continuous ingestion enables persistent knowledge systems.

**ITEM:CLAIM-04**
Long-horizon investigations produce higher-value insights.

**ITEM:CLAIM-05**
Decision systems benefit from structured knowledge graphs.

## 1.2 Claim Registry

| Planned capability | Claim |
|---|---|
| GraphRAG reasoning | CLAIM-05 |
| Research investigation agents | CLAIM-01 |
| Anomaly investigation | CLAIM-02 |
| Continuous knowledge ingestion | CLAIM-03 |
| Long-horizon research loops | CLAIM-04 |
| Enterprise simulation | Summit original |
| AI board advisors | Summit original |

## 1.3 Repo Reality Check

Verified repo structure (from uploaded architecture doc):

```text
src/
  agents/
  connectors/
  graphrag/
  api/

tests/
.github/workflows/
```

ASSUMPTION modules added:

```text
src/research/
src/lab/
src/cognitive/
```

Validation checklist before Phase 1:

* confirm GraphRAG pipeline
* confirm agent orchestration
* confirm CI artifact formats
* confirm connector schema

Output
`docs/architecture/repo_assumptions.md`

## 1.4 Minimal Winning Slice

**Goal**
Within 12 weeks Summit can answer:
"Why did vendor costs increase last quarter?"
with

* evidence graph
* research report
* anomaly detection

**Artifacts**

* `report.json`
* `metrics.json`
* `stamp.json`

## 1.5 12-Month Architecture Milestones

| Phase | Months | Capability |
|---|---|---|
| Phase 1 | 1-3 | GraphRAG platform |
| Phase 2 | 4-6 | Deep Research Engine |
| Phase 3 | 7-9 | Autonomous Research Lab |
| Phase 4 | 10-12 | Cognitive Enterprise |

## 1.6 Phase 1 (Months 1-3)

**GraphRAG Platform**
**Goal**
build enterprise-grade knowledge graph reasoning

**PR stack**

* **PR1**: `feat(graphrag): evidence retrieval pipeline` (`src/graphrag/pipelines/retrieve.ts`)
* **PR2**: `feat(graphrag): graph builder` (`src/graphrag/builder.ts`)
* **PR3**: `feat(connectors): ingestion connectors` (`src/connectors/` - docs, news, filings, internal datasets)
* **PR4**: `feat(graphrag): reasoning API` (`src/api/graphql/graphrag.ts`)
* **PR5**: `feat(benchmarks): retrieval benchmarks` (Outputs `metrics.json`)

**Deliverable**
Summit can perform graph-based evidence retrieval.

## 1.7 Phase 2 (Months 4-6)

**Deep Research Engine**
**Goal**
Autonomous research investigation.

**PR stack**

* **PR1**: `feat(research): deep research engine` (`src/research/engine.ts`)
* **PR2**: `feat(agents): research planner agent` (`src/agents/research/planner.ts`)
* **PR3**: `feat(agents): synthesis agent` (`src/agents/research/synthesis.ts`)
* **PR4**: `feat(agents): anomaly investigator` (`src/agents/research/anomaly.ts`)
* **PR5**: `feat(reporting): research report generator` (Outputs `report.json`)

**Deliverable**
Summit becomes an AI research analyst.

## 1.8 Phase 3 (Months 7-9)

**Autonomous Research Lab**
**Goal**
Persistent research ecosystem.

**PR stack**

* **PR1**: `feat(lab): research loop` (`src/lab/researchLoop.ts`)
* **PR2**: `feat(knowledge): literature ingestion` (`src/lab/knowledge/ingestion.ts`)
* **PR3**: `feat(graphrag): continuous graph builder` (`src/graphrag/pipelines/continuousBuilder.ts`)
* **PR4**: `feat(lab): investigation workspace` (`src/lab/investigations/workspace.ts`)
* **PR5**: `feat(lab): experiment tracker` (`src/lab/experiments/tracker.ts`)

**Deliverable**
Summit can run long-horizon research tasks.

## 1.9 Phase 4 (Months 10-12)

**Cognitive Enterprise**
**Goal**
Enterprise decision intelligence.

**PR stack**

* **PR1**: `feat(cognitive): organization reasoning graph` (`src/cognitive/organizationGraph/`)
* **PR2**: `feat(strategy): strategy analysis engine` (`src/cognitive/strategy/analyzer.ts`)
* **PR3**: `feat(simulation): enterprise simulation engine` (`src/cognitive/simulation/simulator.ts`)
* **PR4**: `feat(advisors): board advisory agents` (`src/cognitive/advisors/`)
* **PR5**: `feat(cognitive): decision engine` (`src/cognitive/decisionEngine.ts`)

**Deliverable**
Summit becomes AI decision infrastructure.

## 1.10 Weekly Milestone Model

Each phase uses 12 weekly iterations.

Example for Phase 1:

* Week 1-2: repo validation + scaffolding
* Week 3-4: connectors
* Week 5-6: graph builder
* Week 7-8: retrieval pipeline
* Week 9-10: reasoning API
* Week 11-12: benchmarks + tests

## 1.11 Performance Budgets

| Metric | Target |
|---|---|
| retrieval latency | < 2s |
| research investigation | < 15s |
| simulation | < 60s |

**CI enforcement**

* `.github/workflows/performance.yml`

## 1.12 Data Governance

**Output**
`docs/security/data-handling/`

**Policies**
Never log:

* credentials
* PII
* financial records
* internal strategy docs

Retention:

* logs → 30 days
* metrics → 1 year

## 1.13 Competitive Positioning

After 12 months Summit competes with:

| System | Category |
|---|---|
| OpenAI Deep Research | research engine |
| Palantir Foundry | enterprise knowledge graph |
| Glean | enterprise knowledge search |
| consulting firms | strategy analysis |

Summit becomes open AI decision infrastructure.

## 1.14 Post-Merge Monitoring

**Scheduled job**

* `.github/workflows/research-drift.yml`

**Scripts**

* `scripts/monitoring/research-drift.ts`

**Tracks**

* research accuracy
* graph growth
* simulation reliability

**Outputs**

* `trend-report.json`

## 1.15 Founder Strategy

This roadmap produces four product narratives:

* Month 3: Open GraphRAG platform
* Month 6: AI research analyst
* Month 9: Autonomous research lab
* Month 12: AI decision infrastructure

This creates a compounding story for users, investors, and contributors.

**Final Strategic Insight**
If executed well, Summit becomes the open platform for AI research analysts, auditors, investigators, strategy advisors, and enterprise intelligence.
Very few systems combine knowledge graphs, deep research agents, autonomous investigations, enterprise simulations, and decision intelligence. That stack is essentially the architecture of enterprise AI over the next decade.
