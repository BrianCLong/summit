# IntelGraph — Release Notes v1.0.0 (GA)

**Release Date:** 2025-09-17  
**Release Type:** General Availability (GA)  
**Owners:** IntelGraph Maestro Conductor (MC) · SRE Lead · Security Lead · Product

---

## Summary
IntelGraph reaches General Availability with enterprise‑grade SLOs, WebAuthn step‑up security, policy reasoning via OPA, SLSA3 supply‑chain verification, and automated DR/runbooks. This release completes Sprint 26 (GA Cutover & Scale) and formalizes platform guardrails for performance, security, cost, and provenance.

---

## What’s New
- **P0 — SLO Alignment & Performance Envelope**
  - GraphQL persisted queries (hash‑based) with LRU + Redis caching
  - Response caching with per‑tenant isolation + intelligent invalidation
  - Neo4j query optimization with read‑replica routing and profiled plans
  - k6 load testing (5 scenarios) with real‑time SLO validation gates

- **P1 — ER Adjudication v1 (Productionized)**
  - Backpressure mgmt with circuit breaker + adaptive rate limiting
  - Dead Letter Queue (DLQ) categorization, reprocessing, batch ops
  - Bulk actions UI with keyboard shortcuts + progress tracking
  - React hook for bulk ops with robust error handling

- **P2 — Policy Reasoner Phase‑1**
  - OPA integration with warm cache + decision logs
  - Privacy reasoner (data classification, retention tiers, PII detection)
  - Licensing enforcement (usage tracking + violation detection)
  - GraphQL API: real‑time subscriptions & policy management UI

- **P3 — Security Step‑Up & Session Binding**
  - WebAuthn enforcer with risk‑based step‑up
  - Gateway‑wide middleware for real‑time risk evaluation
  - APIs for registration, authentication, step‑up flows
  - Risk factors: device, location, behavior, operation

- **P4 — Provenance Everywhere**
  - `verify-bundle` CLI for SLSA provenance verification + round‑trip proof
  - CD workflow gate (mandatory); emergency bypass with 2‑person rule
  - Policy for builder trust & SLSA levels; vuln scanning blocks deploy

- **P5 — Cost Guardrails & Observability Hygiene**
  - Cost tracking engine with adaptive sampling + budget alerts
  - Optimization recommendations (rightsizing, storage, scheduling)
  - Real‑time cost monitoring with anomaly detection & forecast

- **P6 — DR/Change‑Freeze Drills & Runbooks**
  - DR drill orchestrator + CLI for drills, freezes, runbook generation
  - Weekly automated scenarios with post‑analysis
  - Emergency procedures with rollback/incident response

---

## SLOs & Key Results
- **API/GraphQL Gateway**: reads p95 ≤ 350 ms; writes p95 ≤ 700 ms; subs p95 ≤ 250 ms  
- **Graph Operations (Neo4j)**: 1‑hop p95 ≤ 300 ms; 2–3 hop p95 ≤ 1,200 ms  
- **Reliability (ER System)**: 2× peak load, <60s queue lag, <0.1% DLQ rate  
- **Cost Reduction**: Observability costs down 60–80% with adaptive sampling

---

## Breaking Changes
- **Persisted Query Enforcement**: Clients must transmit allowed query hashes; non‑allowlisted operations are rejected.  
- **Default‑Deny Policy**: OPA policies enforce allowlist behavior; routes must declare purpose/tenant context.

---

## Deprecations
- Legacy unauthenticated routes removed.  
- Previous bulk actions UI replaced by the new keyboard‑driven interface.

---

## Migrations
- Backwards compatible; no destructive DB schema changes.  
- Feature flags default‑off for non‑GA functionality.

---

## Security & Privacy Highlights
- OIDC + WebAuthn with risk‑based step‑up; mTLS service mesh  
- ABAC via OPA; tenant scoping and purpose tags  
- Field‑level encryption for sensitive attributes  
- Privacy defaults: PII → `short-30d` retention; purpose limitation enforced

---

## Supply Chain & Provenance
- SLSA3 provenance required; `verify-bundle` gate in CD  
- Builder trust policy; round‑trip proof required  
- Vulnerability scanning blocks release; emergency bypass requires dual approval and is fully audited

---

## Observability & Cost Guardrails
- Dashboards: API latency/error budget, ingest throughput, cost burn & forecast, policy decisions, WebAuthn outcomes, Neo4j ops, cache hit ratios  
- Alerts: 80% budget consumption, SLO burn >1.5×, DLQ >0.1%, step‑up fail >0.5%, cache hit <70%, cost forecast > guardrail

---

## DR & Change‑Freeze
- DR orchestrations: replica failover, region read‑only, ingest backlog, provenance outage  
- Change‑freeze windows managed via CLI; audited emergency bypass (two approvers)

---

## Install/Upgrade Notes
1. Deploy v1.0.0 via canary (10% → 50% → 100%); auto‑rollback on SLO breach.  
2. Enable WebAuthn step‑up enforcement and monitor for 30 minutes.  
3. Flip response cache + persisted query allowlist to **enforce**.  
4. Export baseline dashboards; validate alerts.

---

## CLI Quick Reference
```bash
# Provenance
verify-bundle verify --bundle dist/release.bundle --policy slsa3.yaml --require-roundtrip

# Change‑freeze
igctl freeze start --reason "GA Cutover" --approvers alice,bob
igctl freeze bypass request --ticket SEC-123 --reason "Hotfix"

# DR orchestrator
ingdrill run failover --target neo4j-replica-1 --assert rpo<=5m rto<=10m

# DLQ reprocess
igdlq ls --since 24h && igdlq reprocess --category policy-mismatch --batch 500

# Policy simulation
igopa simulate --bundle opa/bundle.tar.gz --input samples/requests.json --diff prod-baseline.json

# k6 suite
k6 run k6/scenario-smoke.js && k6 run k6/scenario-peak.js
```

---

## Known Issues
- None blocking GA. Minor: policy UI lag for very large rule diffs; workaround documented; fix targeted for Sprint 27.

---

## Sign‑Offs
- MC: ✅ · SRE Lead: ✅ · Security Lead: ✅ · Product: ✅

