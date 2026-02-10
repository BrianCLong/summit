# Sprint 3: Docker & Containerization (Sprint Brief)

**Sprint window:** Tue **Feb 10, 2026** → Tue **Feb 24, 2026** (milestone due **Feb 25, 2026**)
**Theme:** *“Ship a production-shaped runtime: deployable, observable, and failure-tolerant.”*
**Goal:** Deploy CompanyOS to a real cloud environment using Terraform + Helm, with baseline observability (APM + tracing) and resilience proof (chaos-lite), while unblocking any P0 security/runtime defaults.

---

## 🎯 Sprint Objective

By sprint end, we can **deploy CompanyOS to a real cloud environment using Terraform + Helm**, with **baseline observability (APM + tracing)** and **resilience proof (chaos-lite)**, while unblocking any **P0 security/runtime defaults** that would make the deployment non-auditable or unsafe.

**Definition of Done (sprint-level):**
*   **Repeatable deploy**: `terraform apply` + `helm install/upgrade` produces a working environment with documented variables and rollback steps.
*   **Observable**: traces + key service metrics visible; alerts wired for at least “service down” + latency/error burn.
*   **Evidence**: artifacts attached in repo (runbooks, ADRs where needed, dashboards screenshots/JSON exports, CI logs, and release notes).
*   **Policy gates**: no “known bad defaults” (e.g., insecure dev container secrets) blocking production-shaped runtime.

---

## 📋 Committed Scope

### A) Deployment & Runtime (paved road)
1.  **Terraform scripts for cloud deployment**: Terraform baseline: network + cluster + minimum add-ons.
2.  **Kubernetes Helm chart for production**: Installable with sane defaults, values documented, secrets handled appropriately.
3.  **Graph database sharding/clustering**: ADR + spike-backed recommendation, plus a minimum viable config or a clearly staged plan.

### B) Observability & Reliability (non-negotiable for prod)
4.  **Application performance monitoring**: APM dashboard + alerting (latency, error rate, saturation).
5.  **Anomaly alerting**: “Golden signals” baseline.
6.  **Chaos engineering for resilience**: One failure scenario (pod kill / network delay / DB restart) with measured impact and a runbook update.

### C) Integrations & UX Surface (time-boxed, only if A/B on track)
7.  **API for third-party integrations** (Flagged)
8.  **OSINT data integration** (Flagged)
9.  **Timeline view for investigations** (Flagged)
10. **Interactive 3D graph visualization** (Flagged)

### Mandatory Carryover (P0 Blockers)
*   **Neo4j dev container: enforce non-default password & GDS plugin (P0)**
*   **obs: OpenTelemetry tracing (P0)**
*   **fix: CORS/Helmet defaults (P0)**
*   **db: Postgres migrations (P0)** / **db: Neo4j constraints/indexes (P0)** (if required for correct-by-construction deploy)

---

## 📅 Execution Plan (Two-track)

### Week 1 (Feb 10–14): “Make it deploy”
**Gate:** A clean deploy path exists.
*   Terraform baseline.
*   Helm chart installable.
*   OTel tracing baseline (at least one service emits traces).

### Week 2 (Feb 17–24): “Make it trustworthy”
**Gate:** Production-shaped (observable + resilient + rollbackable).
*   APM dashboard + alerting.
*   Chaos-lite drill.
*   Sharding/clustering ADR.

---

## 🛠 Roles & Ownership
*   **SRE/DevOps lead:** Terraform + Helm + release/rollback playbooks.
*   **Platform engineer:** OTel/metrics/log structure, dashboard templates, alert routing.
*   **Security engineer:** Secrets handling, container hardening, policy gates.
*   **Backend lead:** Integration APIs, OSINT ingestion, DB readiness.
*   **Frontend lead:** Timeline view + 3D viz (after Gate A/B).

---

## 📦 Evidence Artifacts
*   **Runbooks:** Deploy, rollback, incident response.
*   **Dashboards:** JSON/exported config + screenshots.
*   **ADR(s):** Sharding/clustering.
*   **Release notes:** Changes, verification, rollback.
*   **CI evidence:** Pipeline logs + artifact outputs.
