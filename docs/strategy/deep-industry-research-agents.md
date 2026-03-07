# Summit Subsumption Plan: Deep Industry Research Agents

Below is a Summit Subsumption Plan for the ITEM provided:
“How Deep Industry Research Agents Can Change Your Organization” (HBR, Mar 2026).

I treat the article as a conceptual architecture + operating model to subsume into the BrianCLong/summit repo as a Deep Industry Research Agent (DIRA) capability layer.

## 1.0 ITEM

**Title:** How “Deep Industry Research Agents” Can Change Your Organization
**Authors:** Bob Suh, Ryan Fortin, Sebastian Bobadilla-Suarez
**Source:** Harvard Business Review (March 3, 2026)
**URL:** <https://hbr.org/2026/03/how-deep-industry-research-agents-can-change-your-organization>

### Core thesis

Deep Industry Research Agents (DIRAs) are end-to-end AI analysts specialized for a specific industry and case type that investigate operational anomalies, learn recurring patterns, and automatically resolve routine discrepancies while escalating only true anomalies to humans.

## 1.1 Ground Truth Capture

**ITEM:CLAIM-01**
“Deep industry research agents are specialized AI analysts tuned to specific industries and case types.”

**ITEM:CLAIM-02**
“Agents investigate operational exceptions and recurring discrepancies.”

**ITEM:CLAIM-03**
“Agents learn patterns and resolve routine cases automatically.”

**ITEM:CLAIM-04**
“Humans are only involved for true anomalies.”

**ITEM:CLAIM-05**
“Productivity gains come primarily from eliminating low-value investigative work.”

**ITEM:CLAIM-06**
DIRAs combine AI reasoning + domain expertise + data synthesis across sources.

## 1.2 Claim Registry

| Planned Element | Claim |
|---|---|
| DIRA agent archetype | CLAIM-01 |
| Exception investigation pipeline | CLAIM-02 |
| Pattern learning + rule synthesis | CLAIM-03 |
| Human escalation filter | CLAIM-04 |
| Productivity / low-value work elimination | CLAIM-05 |
| Industry-specific knowledge graph | CLAIM-06 |
| GraphRAG reasoning layer | Summit original |
| Agent orchestration integration | Summit original |

## 1.3 Repo Reality Check

Based on the uploaded repo context.

### Verified / assumed structure

**Verified (from user file)**

```text
src/
  agents/
  connectors/
  graphrag/
  api/graphql/
  api/rest/

tests/
.github/workflows/
.github/scripts/
```

**Assumptions**

```text
src/agents/research/
src/graphrag/pipelines/
docs/agents/
scripts/benchmarks/
```

**Must-not-touch**

```text
.github/workflows/ci-core.yml
.github/workflows/ci-security.yml
.github/workflows/codeql.yml
```

**repo_assumptions.md output**
`docs/architecture/repo_assumptions.md`
Contains:

* verified paths
* assumptions
* validation checklist

## 1.4 Minimal Winning Slice (MWS)

**One sentence**

Implement a Summit Deep Industry Research Agent capable of investigating operational exceptions using GraphRAG evidence retrieval and escalating unresolved anomalies.

**Acceptance tests**

* `tests/agents/dira-exception.test.ts`
* `tests/e2e/dira-investigation.e2e.ts`

Tests verify:

* Exception input
* Evidence retrieval
* reasoning trace
* anomaly decision

**Artifacts**

* `report.json`
* `metrics.json`
* `stamp.json`

Evidence ID format:
`EVID:<agent>:<dataset>:<hash>`

**Roll-forward plan**

* Add single industry adapter
* Add pattern learning
* Add multi-industry capability

## 1.5 Architecture Mapping to Summit

### DIRA architecture

```text
Exception Event
     │
     ▼
DIRA Agent
     │
     ├─ GraphRAG Evidence Retrieval
     │
     ├─ Case Pattern Analyzer
     │
     ├─ Resolution Engine
     │
     └─ Escalation Filter
            │
            ▼
        Human Analyst
```

### Summit module mapping

| Component | Summit module |
|---|---|
| DIRA agent | `src/agents/dira/` |
| Industry knowledge graph | `src/graphrag/` |
| Evidence retrieval | `src/graphrag/pipelines/` |
| Connectors | `src/connectors/` |
| APIs | `src/api/graphql/` |

## 1.6 PR Stack

Hard limit 5 PRs.

### PR1 — agent skeleton

`feat(agents): introduce Deep Industry Research Agent`

**Files**

* `src/agents/dira/DIRAAgent.ts`
* `src/agents/dira/types.ts`

**Patch**

```typescript
export interface ExceptionCase {
  id: string
  industry: string
  description: string
  metadata?: Record<string, any>
}

export interface InvestigationResult {
  resolved: boolean
  anomaly: boolean
  evidence: string[]
}

export class DIRAAgent {
  async investigate(caseData: ExceptionCase): Promise<InvestigationResult> {
    return {
      resolved: false,
      anomaly: true,
      evidence: []
    }
  }
}
```

**Tests**

* `tests/agents/dira-agent.test.ts`

### PR2 — GraphRAG evidence retrieval

`feat(graphrag): add DIRA evidence pipeline`

**Files**

* `src/graphrag/pipelines/diraEvidence.ts`

**Patch**

```typescript
export async function retrieveEvidence(query: string) {
  return {
    nodes: [],
    vectors: [],
    sources: []
  }
}
```

**Artifacts**

* `report.json`

### PR3 — pattern learning

`feat(agents): add case pattern learning`

**Files**

* `src/agents/dira/patternEngine.ts`

**Purpose**

* learn recurring discrepancies
* classify routine vs anomaly

### PR4 — anomaly escalation

`feat(agents): add anomaly escalation pipeline`

**Files**

* `src/agents/dira/escalation.ts`

**Function**

* route unresolved cases to humans

### PR5 — evaluation + benchmarks

`feat(benchmarks): add DIRA productivity benchmark`

**Outputs**

* `metrics.json`
* `scripts/benchmarks/dira-benchmark.ts`

## 1.7 Interop & Standards

**Output doc**
`docs/standards/deep-industry-research-agents.md`

### Import

| Source | Mechanism |
|---|---|
| SEC filings | connector |
| news | connector |
| internal docs | GraphRAG |
| tickets | REST ingestion |

### Export

| Output | Format |
|---|---|
| analysis report | JSON |
| decision trace | JSON |
| human escalation | ticket |

**Non-goals**

* full BI dashboards
* ERP integration

## 1.8 Threat-Informed Requirements

| Threat | Mitigation | Gate |
|---|---|---|
| hallucinated evidence | citation requirement | CI validation |
| data leakage | source allowlist | connector policy |
| agent runaway reasoning | max steps | runtime guard |
| false anomaly classification | confidence threshold | unit tests |

**Test fixtures**

* `tests/security/dira-policy.test.ts`

## 1.9 Performance Budgets

| Metric | Target |
|---|---|
| investigation latency | < 5s |
| memory | < 500MB |
| cost/run | <$0.05 |

**Benchmark harness**

* `scripts/benchmarks/dira-benchmark.ts`

**CI gate**

* `.github/workflows/agent-performance.yml`

## 1.10 Data Classification

**Doc**
`docs/security/data-handling/dira.md`

**Never log**

* PII
* financial records
* credentials
* internal documents

**Retention**

* analysis logs → 30 days
* metrics → 1 year

## 1.11 Operational Readiness Pack

**Runbook**
`docs/ops/runbooks/dira-agent.md`

**Includes**

* incident handling
* anomaly escalation procedures
* degraded mode

**SLO**

* Investigation success rate > 95%
* False anomaly rate < 5%

## 1.12 Competitive Teardown

### Comparable capabilities

| System | Comparable feature |
|---|---|
| OnCorps AI | financial research agents |
| OpenAI Deep Research | multi-source synthesis |
| Anthropic tools | long-horizon reasoning |

### Summit positioning

**Now**

* industry-aware research agent
* GraphRAG reasoning
* anomaly detection

**Later**

* cross-industry intelligence
* autonomous investigation loops

## 1.13 Convergence Protocol (Agents)

**Agents involved**

* Planner
* Coder
* Verifier
* Security
* Observer

**Workflow**

* Planner → WBS
* Coder → PR implementation
* Verifier → tests
* Security → threat review
* Observer → metrics

**Conflict rule**

* Master plan wins.
* Agents propose diffs not redesigns.

## 1.14 Post-Merge Monitoring

**Scheduled job**

* `.github/workflows/dira-drift.yml`

**Scripts**

* `scripts/monitoring/dira-drift.ts`

**Tracks**

* anomaly classification drift
* investigation latency
* evidence coverage

**Output**

* `metrics.json`
* `trend-report.json`

## 1.15 Strategic Insight for Summit

The article implicitly describes the next evolution of enterprise AI agents:

| Gen | Role |
|---|---|
| Copilots | assist tasks |
| Agents | execute tasks |
| DIRAs | investigate + reason across industries |

This aligns almost perfectly with Summit’s GraphRAG + agent architecture.

**Meaning:**
Summit can position itself as a platform for building Deep Industry Research Agents.

**Core differentiator:**
GraphRAG + domain pipelines + multi-agent orchestration
