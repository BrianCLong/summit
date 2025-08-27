# EXECUTIVE_BRIEF_v2.5.md

> One‑page board packet • IntelGraph v2.5 GA • 2025‑08‑27

## Why it matters (in one line)

IntelGraph v2.5 ships an enterprise‑grade intelligence platform that automates detection→incident→SOAR with audit‑ready governance, outpacing Palantir/Maltego on time‑to‑insight, control, and compliance.

## What's in the box (top 4)

1. **Real‑time Security Loop:** Alerts→Incidents→SOAR playbooks with audit & RBAC.
2. **MLOps Gates:** Accuracy/F1/regression/security/bias with drift and A/B.
3. **Governed GraphQL APIs:** RT Security, MLOps, OSINT/forensics, Crypto.
4. **Hardened Ops:** Helm network policies, PSS(restricted), SLO dashboards, DR runbooks.

## Proof (KPIs & SLOs)

* p95 API **<2s**; error rate **<1%**; autoscale **2–20** replicas.
* **99.9%** uptime target with burn‑rate alerts; multi‑region replication.
* **50+** Playwright E2E; k6 perf gates; accessibility checks (axe‑core).

## Risk posture & compliance

* Zero‑trust microsegmentation; secrets rotation; image hardening.
* GDPR/CCPA alignment; export‑control validation; dual‑control crypto ops.
* Immutable audit trails; reason‑for‑access prompts; ombuds loops.

## Customer value

* **Faster investigations:** live graph updates via subscriptions.
* **Safer decisions:** policy‑by‑default denials and explainable automations.
* **Lower ops burden:** pre‑baked runbooks, SLO dashboards, and DR procedures.

## Next 2 quarters (Post‑GA)

* **Q3 2025:** Prov‑Ledger GA, Disinfo Runbooks, full SLO dashboards.
* **Q4 2025:** Graph‑XAI integration, Predictive Threat Suite, regulated topologies.

## Ask (board)

* Approve **enterprise go‑to‑market** and regulated‑sector pilots.
* Endorse **Prov‑Ledger GA** in v2.5.1 and **Graph‑XAI** investment in Q4.

## Release Checklist (Technical)

✅ Release notes & exec brief build without lint warnings  
✅ Roadmap updated with Q3‑Q4 2025 priorities  
✅ Deprecation warnings visible for `searchGlobal` & `runPlaybook`  
✅ Helm values include `ingress.className`, `networkPolicy`, `podSecurity` blocks  
✅ k6 + Playwright suites passed; SLO burn‑rate alerts armed  
✅ SBOM & attestations ready for release artifacts

---