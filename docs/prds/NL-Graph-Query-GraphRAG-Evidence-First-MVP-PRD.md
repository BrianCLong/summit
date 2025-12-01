# Product Requirements Document (PRD)

## NL Graph Query + GraphRAG + Evidence-First Publishing MVP

| Field | Value |
|-------|-------|
| **Product** | NL Graph Query + GraphRAG + Evidence-First Publishing |
| **Owner** | Product Team |
| **Status** | Draft |
| **Version** | 1.0.0 |
| **Last Updated** | 2025-11-21 |
| **Target Release** | v0.7.0 |

---

## 1. Executive Summary

### Product Vision

Enable analysts to query the knowledge graph using natural language and receive explainable, citation-backed answers that can be published only when evidence requirements are met.

### Value Proposition

- **For Investigators/Analysts**: Ask questions in plain English, get answers with verifiable sources
- **For Compliance/Reviewers**: Every published insight traces back to source evidence
- **For Organizations**: Reduce time-to-insight by 50%+ while maintaining audit trails

### Strategic Alignment

| Objective | Alignment |
|-----------|-----------|
| Trust & Transparency | Mandatory citations prevent hallucinations and ensure accountability |
| Analyst Productivity | NL queries eliminate Cypher learning curve |
| Compliance Readiness | Provenance manifests satisfy audit requirements |
| Platform Differentiation | Evidence-first approach is unique in market |

### Success Definition

| Metric | Target | Measurement |
|--------|--------|-------------|
| Time-to-Insight (TTI) | p50 ≤ 2s, p95 ≤ 5s | Server-side latency histogram |
| Citation Completeness | 100% of answers have ≥1 citation | Automated validation |
| Query Success Rate | ≥ 95% | Successful responses / total requests |
| User Adoption | 80% of active analysts use NL query weekly | Usage telemetry |

---

## 2. Problem Statement & Opportunity

### Problem Definition

| Pain Point | Impact | Evidence |
|------------|--------|----------|
| Cypher expertise required | Only 15% of analysts can write graph queries | User survey Q3 2025 |
| Unverifiable AI answers | 40% of AI-generated insights lack sources | QA audit findings |
| Slow investigation cycles | Average 45 min to answer complex questions | Time tracking data |
| Audit failures | 3 compliance findings in last quarter | Compliance reports |

### Current State

```
Analyst → Learns Cypher (weeks) → Writes Query → Gets Results → Manually Finds Sources → Creates Report
```

### Future State

```
Analyst → Asks Question (NL) → Reviews Cypher Preview → Gets Answer + Citations → Publishes with Provenance
```

### Opportunity

- **Market Size**: 500+ analysts across customer base
- **Revenue Impact**: Enables enterprise compliance tier ($50K ARR uplift)
- **Competitive Gap**: No competitor offers evidence-first RAG with graph explainability

---

## 3. User Requirements & Stories

### Primary Personas

| Persona | Goals | Pain Points |
|---------|-------|-------------|
| **Investigator** | Quick answers to complex questions | Can't write Cypher, needs sources |
| **Case Lead** | Verify team findings before publication | No way to trace answer provenance |
| **Compliance Officer** | Audit all published intelligence | Missing citation trails |

### Core User Stories

#### Epic: Natural Language Graph Query

| ID | Story | Acceptance Criteria | Priority |
|----|-------|---------------------|----------|
| US-01 | As an analyst, I want to ask questions in plain English so I can query the graph without learning Cypher | Given NL input, system returns answer within 5s with ≥1 citation | Must |
| US-02 | As an analyst, I want to preview the generated Cypher before execution so I can verify the query intent | Cypher shown in readable format; user can approve/reject | Must |
| US-03 | As an analyst, I want to see which graph paths support the answer so I can understand the reasoning | WhyPaths displayed with entity→relationship→entity chain | Must |
| US-04 | As a case lead, I want to filter queries by time/geo constraints so I can scope investigations | Date range and location filters applied to Cypher | Should |

#### Epic: Evidence-First Publishing

| ID | Story | Acceptance Criteria | Priority |
|----|-------|---------------------|----------|
| US-05 | As a reviewer, I want the system to block publishing answers without citations so we maintain quality | Publish button disabled when citations.length === 0 | Must |
| US-06 | As a compliance officer, I want exported reports to include provenance manifests so I can audit sources | Export includes JSON manifest with sourceIds, timestamps, paths | Must |
| US-07 | As an analyst, I want to click citations to view source snippets so I can verify accuracy | Citation click opens source document at relevant passage | Should |

---

## 4. Functional Requirements

### MoSCoW Prioritization

#### Must Have (MVP - Sprint 1-2)

| ID | Requirement | Description |
|----|-------------|-------------|
| FR-01 | NL-to-Cypher Translation | Convert natural language to valid Cypher with LLM |
| FR-02 | Cypher Preview & Approval | Display generated Cypher; require user approval before execution |
| FR-03 | Read-Only Execution | Execute approved Cypher in sandbox (no mutations) |
| FR-04 | Answer Generation | Generate answer from graph results using RAG |
| FR-05 | Inline Citations | Every answer includes entityIds that support it |
| FR-06 | WhyPath Rationale | Return graph paths (from→rel→to) that explain reasoning |
| FR-07 | Publish Gate | Block publish action if citations array is empty |
| FR-08 | Provenance Export | Include machine-readable manifest in all exports |

#### Should Have (Sprint 3)

| ID | Requirement | Description |
|----|-------------|-------------|
| FR-09 | Time/Geo Filters | Apply temporal and geographic constraints to queries |
| FR-10 | Citation Deep Links | Click citation to navigate to source with highlight |
| FR-11 | Query History | Store and replay previous NL queries |
| FR-12 | Confidence Scoring | Display 0-1 confidence based on path coverage |

#### Could Have (Future)

| ID | Requirement | Description |
|----|-------------|-------------|
| FR-13 | Query Suggestions | Auto-suggest queries based on investigation context |
| FR-14 | Multi-hop Reasoning | Support 3+ hop traversals with cost estimation |
| FR-15 | Batch Queries | Execute multiple NL queries in parallel |

#### Won't Have (v1)

| ID | Requirement | Rationale |
|----|-------------|-----------|
| FR-X1 | Write Operations via NL | Security risk; mutations require explicit Cypher |
| FR-X2 | Real-time Streaming | Complexity; batch responses sufficient for MVP |
| FR-X3 | Custom LLM Training | Cost/time; use prompt engineering instead |

---

## 5. Technical Requirements

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend (React)                         │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────────┐ │
│  │ NL Input Box │  │Cypher Preview│  │ Answer + Citations Panel│ │
│  └──────────────┘  └──────────────┘  └────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              │ GraphQL
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     API Gateway (Express)                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐   │
│  │Rate Limiter  │  │ OPA Policy   │  │ Request Validation   │   │
│  └──────────────┘  └──────────────┘  └──────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    GraphRAG Service Layer                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐   │
│  │NL→Cypher Gen │  │Graph Executor│  │ RAG Answer Generator │   │
│  │ (LLM-backed) │  │ (Read-only)  │  │ (Citation Required)  │   │
│  └──────────────┘  └──────────────┘  └──────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
        ┌──────────┐   ┌──────────┐   ┌──────────────┐
        │  Neo4j   │   │  Vector  │   │  Provenance  │
        │  Graph   │   │  Store   │   │    Ledger    │
        └──────────┘   └──────────┘   └──────────────┘
```

### API Specifications

#### GraphQL Schema (extends existing)

```graphql
# Already defined in server/src/graphql/schema/graphrag.graphql
extend type Query {
  graphRagAnswer(input: GraphRAGQueryInput!): GraphRAGResponse!
}

# New mutation for evidence-first publishing
extend type Mutation {
  publishInsight(input: PublishInsightInput!): PublishResult!
}

input PublishInsightInput {
  investigationId: ID!
  answerId: ID!
  title: String!
  # System validates citations.length > 0 before allowing publish
}

type PublishResult {
  success: Boolean!
  insightId: ID
  provenanceManifest: ProvenanceManifest
  error: String
}

type ProvenanceManifest {
  generatedAt: DateTime!
  sourceEntityIds: [ID!]!
  queryHash: String!
  cypherExecuted: String!
  pathsUsed: [WhyPath!]!
}
```

### Data Requirements

| Data Element | Source | Storage | Retention |
|--------------|--------|---------|-----------|
| NL Queries | User input | PostgreSQL | 90 days |
| Generated Cypher | LLM output | PostgreSQL | 90 days |
| Graph Results | Neo4j | Cache (Redis) | 1 hour |
| Provenance Manifests | System | PostgreSQL + S3 | 7 years |
| WhyPaths | Neo4j traversal | Response only | N/A |

### Dependencies

| Dependency | Version | Purpose |
|------------|---------|---------|
| Neo4j | 5.x | Graph database |
| OpenAI API | gpt-4 | NL-to-Cypher translation |
| prom-client | 15.x | Metrics collection |
| Redis | 7.x | Query result caching |

---

## 6. User Experience Requirements

### Design Principles

1. **Progressive Disclosure**: Show answer first, details on demand
2. **Trust Through Transparency**: Always show how answer was derived
3. **Fail Safe**: Block actions that would produce uncited content

### Interface Wireframe

```
┌────────────────────────────────────────────────────────────────┐
│ Investigation: Case #2025-1142                          [⚙️] │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ 🔍 Ask a question about this investigation...            │  │
│  │ ______________________________________________ [Ask]     │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                │
│  ┌─ Cypher Preview ───────────────────────────────────────┐   │
│  │ MATCH (p:Person)-[:TRANSACTED_WITH]->(o:Organization)  │   │
│  │ WHERE p.name CONTAINS 'Smith'                          │   │
│  │ RETURN p, o LIMIT 100                                  │   │
│  │                                    [✓ Approve] [✗ Edit] │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                │
│  ┌─ Answer ───────────────────────────────────────────────┐   │
│  │ John Smith has transacted with 3 organizations:        │   │
│  │ • Acme Corp [1]                                        │   │
│  │ • Global Trading Ltd [2]                               │   │
│  │ • Offshore Holdings [3]                                │   │
│  │                                                        │   │
│  │ Confidence: 0.92 ████████████░░                        │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                │
│  ┌─ Why Paths (Evidence) ─────────────────────────────────┐   │
│  │ [1] Person:John Smith →TRANSACTED_WITH→ Org:Acme Corp  │   │
│  │ [2] Person:John Smith →TRANSACTED_WITH→ Org:Global...  │   │
│  │ [3] Person:John Smith →OWNS→ Org:Offshore Holdings     │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                │
│  [📤 Publish to Brief]  [📋 Export with Provenance]           │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

### Accessibility Requirements

| Requirement | Standard | Implementation |
|-------------|----------|----------------|
| Keyboard Navigation | WCAG 2.1 AA | All actions accessible via Tab/Enter |
| Screen Reader | WCAG 2.1 AA | ARIA labels on all interactive elements |
| Color Contrast | WCAG 2.1 AA | 4.5:1 minimum ratio |
| Focus Indicators | WCAG 2.1 AA | Visible focus ring on all controls |

---

## 7. Non-Functional Requirements

### Performance Requirements

| Metric | Target | Measurement Method |
|--------|--------|-------------------|
| **Time-to-Insight (TTI)** | p50 ≤ 2s, p95 ≤ 5s | `intelgraph_graphrag_query_duration_seconds` histogram |
| **Cypher Generation** | p95 ≤ 1.5s | `intelgraph_nl_to_cypher_duration_seconds` histogram |
| **Graph Execution** | p95 ≤ 2s | `intelgraph_cypher_execution_duration_seconds` histogram |
| **Answer Generation** | p95 ≤ 1.5s | `intelgraph_rag_generation_duration_seconds` histogram |

### Reliability Requirements

| Metric | Target | Implementation |
|--------|--------|----------------|
| Availability | 99.5% | Health checks + auto-restart |
| Error Rate | < 1% | Circuit breaker on LLM calls |
| Data Durability | 99.999% | PostgreSQL + S3 replication |

### Security Requirements

| Requirement | Implementation |
|-------------|----------------|
| Query Sandboxing | Read-only Neo4j user; no DETACH DELETE |
| Input Validation | Sanitize NL input; reject injection patterns |
| Rate Limiting | 60 queries/min per user |
| Audit Logging | Log all queries with user, timestamp, Cypher |
| Data Classification | Tag provenance with classification level |

### Scalability Requirements

| Dimension | Current | Target (6 months) |
|-----------|---------|-------------------|
| Concurrent Users | 50 | 200 |
| Queries/Day | 1,000 | 10,000 |
| Graph Size | 1M nodes | 10M nodes |
| Response Cache Hit Rate | N/A | > 40% |

---

## 8. Success Metrics & Analytics

### Key Performance Indicators (KPIs)

| KPI | Definition | Target | Baseline |
|-----|------------|--------|----------|
| **Time-to-Insight (TTI)** | Time from query submit to answer displayed | p95 ≤ 5s | N/A (new) |
| **Citation Completeness** | % of answers with ≥1 citation | 100% | N/A (new) |
| **Query Success Rate** | Successful responses / total requests | ≥ 95% | N/A (new) |
| **Cypher Approval Rate** | Approved previews / total previews | ≥ 85% | N/A (new) |
| **Weekly Active Users** | Unique users executing NL queries | 80% of analysts | 0 |

### Telemetry Implementation

```typescript
// Metrics to add to server/src/observability/metrics.ts
export const graphragQueryDuration = new Histogram({
  name: 'intelgraph_graphrag_query_duration_seconds',
  help: 'End-to-end GraphRAG query latency',
  labelNames: ['status', 'investigation_id'] as const,
  buckets: [0.5, 1, 2, 3, 5, 10],
  registers: [registry],
});

export const citationCount = new Histogram({
  name: 'intelgraph_graphrag_citation_count',
  help: 'Number of citations per answer',
  labelNames: ['investigation_id'] as const,
  buckets: [0, 1, 2, 3, 5, 10, 20],
  registers: [registry],
});

export const publishBlockedNoCitation = new Counter({
  name: 'intelgraph_publish_blocked_no_citation_total',
  help: 'Publish attempts blocked due to missing citations',
  labelNames: ['investigation_id'] as const,
  registers: [registry],
});
```

### Dashboard Alerts

| Alert | Condition | Severity | Action |
|-------|-----------|----------|--------|
| High Latency | p95 TTI > 5s for 5 min | Warning | Page on-call |
| Citation Failure | Any answer with 0 citations | Critical | Block + alert |
| LLM Timeout | Cypher generation > 10s | Warning | Fallback to cache |
| Error Spike | Error rate > 5% for 2 min | Critical | Page on-call |

---

## 9. Implementation Plan

### Sprint 1: Core NL Query (2 weeks)

| Task | Owner | Estimate | Dependencies |
|------|-------|----------|--------------|
| Enhance NL-to-Cypher generator with LLM | Backend | 3d | OpenAI API key |
| Implement Cypher preview endpoint | Backend | 2d | - |
| Build Cypher preview UI component | Frontend | 2d | Design spec |
| Add read-only query executor | Backend | 2d | Neo4j read user |
| Integrate GraphRAG answer generation | Backend | 3d | Vector store |
| Add TTI metrics instrumentation | Backend | 1d | prom-client |
| Unit + integration tests | QA | 2d | All above |

**Sprint 1 Deliverables:**
- [ ] NL query → Cypher preview → approval flow
- [ ] Answer generation with citations
- [ ] TTI p95 ≤ 5s verified

### Sprint 2: Evidence-First Publishing (2 weeks)

| Task | Owner | Estimate | Dependencies |
|------|-------|----------|--------------|
| Implement WhyPath extraction | Backend | 2d | Sprint 1 |
| Build WhyPath visualization | Frontend | 3d | Design spec |
| Add publish gate (citation check) | Backend | 1d | - |
| Implement provenance manifest export | Backend | 2d | - |
| Build export UI with manifest download | Frontend | 2d | Backend API |
| Add citation completeness metrics | Backend | 1d | prom-client |
| E2E tests for publish flow | QA | 2d | All above |
| Performance testing + optimization | QA | 2d | All above |

**Sprint 2 Deliverables:**
- [ ] WhyPath display in answer panel
- [ ] Publish blocked when citations = 0
- [ ] Export includes provenance manifest
- [ ] 100% citation completeness verified

### Milestone Summary

```
Week 1-2 (Sprint 1)     Week 3-4 (Sprint 2)     Week 5+
────────────────────    ────────────────────    ────────────
[NL Query Core]         [Evidence Publishing]   [Enhancements]
• NL→Cypher             • WhyPaths              • Time/Geo filters
• Preview/Approve       • Publish gate          • Citation deep links
• Answer + Citations    • Provenance export     • Query history
• TTI metrics           • Citation metrics      • Confidence tuning
```

### Release Criteria

| Criterion | Validation |
|-----------|------------|
| All Must Have FRs implemented | PR review + QA sign-off |
| TTI p95 ≤ 5s | Load test with 50 concurrent users |
| Citation completeness = 100% | Automated test suite |
| No P0/P1 bugs | Bug triage review |
| Documentation complete | README + API docs |
| Rollback plan tested | DR runbook executed |

---

## 10. Risk Assessment & Mitigation

### Technical Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| LLM generates invalid Cypher | Medium | High | Cypher syntax validation before execution; fallback templates |
| LLM latency spikes | Medium | Medium | 10s timeout + cached fallback; queue overflow protection |
| Graph query timeout on large datasets | Medium | High | Query cost estimation; LIMIT enforcement; index optimization |
| Hallucinated citations | Low | Critical | Validate all entityIds exist before returning answer |

### Business Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Low user adoption | Medium | High | Analyst training; query suggestions; feedback loop |
| Compliance rejection | Low | Critical | Legal review of provenance manifest format |
| OpenAI API cost overrun | Medium | Medium | Token budgets; caching; usage alerts |

### Contingency Plans

| Scenario | Trigger | Response |
|----------|---------|----------|
| LLM unavailable | 3+ consecutive timeouts | Fall back to template-based Cypher generation |
| Citation validation fails | Any answer with invalid entityId | Block response; log error; alert team |
| Sprint 1 delayed | > 2 days behind schedule | Descope confidence scoring to Sprint 3 |

---

## Appendix A: Glossary

| Term | Definition |
|------|------------|
| **GraphRAG** | Retrieval-Augmented Generation over knowledge graphs |
| **WhyPath** | A chain of entities and relationships that support an answer |
| **TTI** | Time-to-Insight: end-to-end latency from query to answer |
| **Provenance Manifest** | Machine-readable record of sources used to generate content |
| **Citation Completeness** | Percentage of answers that include at least one valid citation |

---

## Appendix B: Related Documents

- [GraphRAG Schema](/server/src/graphql/schema/graphrag.graphql)
- [NL-to-Cypher Generator](/server/src/ai/nl_to_cypher/nl_to_cypher_generator.py)
- [Graph RAG Service](/server/src/ai/rag/graph_rag.py)
- [Evidence-First RAG Stub PRD](/prd_stub_evidence_first_rag_→_graph_rag_→_dag_runbooks_→_multimodal_v_1.md)
- [Observability Metrics](/server/src/observability/metrics.ts)

---

## Approval Sign-off

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Product Manager | | | |
| Engineering Lead | | | |
| Design Lead | | | |
| QA Lead | | | |
| Security | | | |
