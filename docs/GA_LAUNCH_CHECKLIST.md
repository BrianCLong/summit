# GA Launch Checklist - "Disinfo Suite GA Readiness + Moat Pack"

## A) GA Product Contract (hardening + clarity)

- [ ] **1) GA API + SDK Contract Freeze**
  - [ ] OAS3: versioned endpoints, stable schemas
  - [ ] Typed SDK (TypeScript first)
  - [ ] Contract tests
- [ ] **2) Tenant-Ready Onboarding + Role Catalog**
  - [ ] Tenant creation workflow
  - [ ] Role/attribute catalog (Analyst, Approver, PartnerViewer, Admin)
  - [ ] Prebuilt policy profiles (Strict, Balanced, Fast Ops)

## B) Competitive Moat Features (GA-grade)

- [ ] **3) Receipts Everywhere (Provenance-First GA)**
  - [ ] 100% coverage on critical flows (ingest, transform, cluster, score, alert, approval, export, purge)
  - [ ] Receipts queryable + exportable
- [ ] **4) Policy-Gated Operations (OPA/ABAC + Simulation)**
  - [ ] Gate critical ops (export, attribution, retention, purge)
  - [ ] Policy simulation endpoint ("preflight")
  - [ ] Dual-control for sensitive operations
- [ ] **5) Selective Disclosure Intel Bundles v1**
  - [ ] Export format: IntelBundle v1
  - [ ] Redaction profiles
  - [ ] Verifiable via receipt hashes + signed manifest

## C) GA Quality: Evaluations, Safety, and Abuse-Resistance

- [ ] **6) Continuous Evaluation Harness (CI Gate)**
  - [ ] Offline eval set + drift monitor
  - [ ] Regression gates
  - [ ] Explainability minimum
- [ ] **7) Abuse & Safety Controls**
  - [ ] Guardrails against deceptive content
  - [ ] Rate limits + anomaly detection
  - [ ] Honey tokens/tripwires

## D) GA Operations: Reliability, SLOs, DR, Observability, Cost

- [ ] **8) SLOs + Dashboards + Alerts**
  - [ ] SLOs defined (uptime, latency, error rate)
  - [ ] Grafana dashboards (ingest lag, pipeline duration, etc.)
- [ ] **9) DR + Backup + Chaos Drill**
  - [ ] RPO/RTO proven
  - [ ] Backup verification
  - [ ] Receipts integrity check
- [ ] **10) FinOps & Billing Readiness**
  - [ ] Per-tenant metering
  - [ ] Cost attribution
  - [ ] Pricing tiers drafted

## E) Release Pack

- [ ] **Release Pack**
  - [ ] Helm charts + Terraform modules
  - [ ] Config profiles + seed data + quickstart

## F) Secure Supply Chain Proof

- [ ] **Secure Supply Chain Proof**
  - [ ] SBOM + SLSA attestations
  - [ ] Image signing
  - [ ] Dependency vuln gates

## G) Docs-as-Code

- [ ] **Docs-as-Code**
  - [ ] Admin/Partner/Analyst guides
  - [ ] Runbooks (ingest backlog, receipt failures, etc.)
  - [ ] Incident templates

## H) GA Sign-off Checklist

- [ ] **GA Sign-off Checklist**
  - [ ] SLOs verified
  - [ ] DR drill passed
  - [ ] Eval gates enabled
  - [ ] Pricing + SKU sheet
  - [ ] Support rotation
