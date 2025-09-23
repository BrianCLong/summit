# Project Plan — IntelGraph Beyond

**North‑Star Metric:** Time‑to‑Insight (TTI) P50 < 5 minutes; P95 < 15 minutes.  
**Guardrail:** P0 query latency P95 < 300 ms.

## OKRs (Q3–Q4 2025)
- **O1: Ship Investigator‑Ready GraphRAG**
  - KR1: >70% of test cases return grounded answers
  - KR2: Median end‑to‑end time < 90s
- **O2: Coverage of 6 priority connectors**
  - KR1: SIEM (Splunk/Elastic), EDR (CrowdStrike), OSINT (Twitter, Reddit), Brand mentions
- **O3: Reliability & Observability**
  - KR1: 95th percentile error budget ≥ 99.5%
  - KR2: OTel traces for 80% of resolvers

## Epics
1. GraphRAG Pipeline
2. Entity & Relationship Schema Hardening
3. Connectors & Ingest
4. RBAC/ABAC + Policy
5. Observability
6. Performance & Cost

## 12‑Week Plan (Gantt)
```
Week 1-2: Epics 2,3 kickoff — schema, connector scaffolds
Week 3-6: Epic 1 mainline — chunking, retriever, summarizer
Week 4-8: Epic 4 — roles, attributes, OPA policies
Week 5-10: Epic 5 — OTel, dashboards, alerts
Week 6-12: Epic 6 — profiling & caching, Neo4j tuning
```
