# IntelGraph — PagerDuty Service & Routing Matrix

**Date:** September 17, 2025
**Audience:** SRE, SecOps, Eng Leads, Support
**Scope:** Production (All regions/tenants)
**Objective:** Consistent, low‑noise, fast‑response incident routing aligned to GA cutover guardrails.

---

## 1) Incident Taxonomy & SLAs

Severities

* SEV‑1 (Critical): Broad tenant impact, data loss risk, or SLO burn > 10%/day. TTA: 5 min | TTR: 60 min | Status cadence: 15 min.
* SEV‑2 (High): Multi‑tenant or high‑value feature degraded, SLO burn 6–10%/day. TTA: 10 min | TTR: 2 h | Status cadence: 30 min.
* SEV‑3 (Moderate): Limited tenant/feature impact; workaround available. TTA: 30 min | TTR: 24 h.
* SEV‑4 (Low): Non‑urgent; backlog candidates. TTA: NBD | TTR: Sprint.

Auto‑severities (from alerts):

* SEV‑1: Any Rollback Trigger sustained > 10 min.
* SEV‑2: Top alerts breached > 20 min or 2× in 1 h.
* SEV‑3: New alert class below rollback thresholds.

---

## 2) Business Services & Dependencies

| Business Service | Technical Services | Owner (Primary) | RTO | RPO |
| --- | --- | --- | ---: | --: |
| IntelGraph API | GraphQL Gateway, Redis, Neo4j, OPA, WebAuthn | SRE (App/API) | 60m | 5m |
| Event Reasoner (ER) | Messaging/Queues, DLQ, Bulk Ops UI | Data Eng | 120m | 5m |
| Policy & Privacy | OPA, Privacy Reasoner, Licensing | Security Eng | 60m | 0m |
| Identity & AuthN | WebAuthn, Risk Engine | Security Eng | 30m | 0m |
| FinOps Observability | Cost Engine, Sampling Controller | SRE/FinOps | 4h | 15m |
| Supply Chain | verify‑bundle, CI/CD Gates | Platform Sec | 4h | N/A |

---

## 3) Routing Rules (examples)

| Match | Service | Sev | Escalation | Action |
| --- | --- | --- | --- | --- |
| error_budget_burn > 10%/day OR rollback_trigger | Affected Business Service | SEV‑1 | Duty Manager | War room + runbook link |
| graphql_cache_hit < 85% for 10m | GraphQL Gateway | SEV‑2 | API → SRE | Attach PQ warm script |
| redis_p99 > 5ms OR evictions > 2%/min | Redis | SEV‑2 | Platform → SRE | Conservative cache flag |
| neo4j_replica_lag > 250ms | Neo4j | SEV‑2 | Data → Data Lead | Route reads to primary |

---

## 4) On‑Call Notifications

Primary: push (immediate) → SMS (2m) → Voice (5m).  
Secondary: push (5m) → SMS (10m).  
Duty Manager: push+SMS on SEV‑1, 10m delay on SEV‑2.

