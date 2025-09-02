# 📜 Council Report — IntelGraph CI/CD & DevOps Hardening

**Chair:** Markus Wolf  
**Date:** Aug 22, 2025  
**Mandate:** Deliver “boringly excellent” software with reproducible builds, SLSA-grade supply chain, GitOps-driven CD, golden paths, observability, hard cost/quality gates, and push‑button ops.

> “Let shadows convene and the tripwires sing.” — Opening of Session

---

## I. Executive Summary

**Status:** The initial **90‑day plan (M1–M7)** and the subsequent **Phase 2 ‘Prove‑It’ Hardening** are reported **complete**. Foundations for supply‑chain security, GitOps, golden‑path scaffolds, observability gates, cost controls, zero‑downtime schema rails, secretless CI, and chaos drills are in place. Preview environments, CD policy gates (canary + auto‑rollback + schema hooks), and governance checks (warrant/authority/licensing/provenance/citations) are implemented.

**Next Mandate (Phase 3):** Evidence at scale, enforcement by default, and operational bake. We now convert scaffolds and workflows into **auditable guarantees** and **operational muscle memory**.

---

## II. What’s Complete (Concise)

- **Supply chain:** CycloneDX SBOMs, Trivy/Gitleaks gates (fail on Critical/High), Cosign signing, provenance generation & upload.
- **GitOps & CD:** Argo CD scaffold; Argo Rollouts with canary + auto‑rollback on SLO burn; OPA/Conftest policy checks.
- **DevEx Golden Path:** Backstage catalog + service templates; docs preview & release‑notes generation; Dependabot/Renovate.
- **Testing:** Unit/contract/Cypher, E2E (ingest→resolve→runbook→report), k6 load, mutation/fuzz seeds, security (authz, query depth).
- **Observability:** OTEL baked‑in, Prometheus rules, Grafana dashboards, synthetic checks, **trace‑coverage SLO** gate.
- **Data & Schema:** Migration linting + pre‑install migration hook; shadow‑read pattern baseline.
- **Secrets & Identity:** OIDC/short‑lived credentials; pre‑commit secret scans.
- **FinOps:** Per‑PR cost diff; budget guard job; Kubecost integration hooks.
- **Ops drills:** Nightly chaos in stage; DR dry‑run scripts; basic ChatOps for deploy/rollback/preview.

---

## III. Evidence Matrix (where to prove it)

> Use these locations/names if you followed the Council scaffold; adjust to your repo structure as needed.

| Capability             | Primary Evidence                           | Secondary Evidence             | How to Verify                                   |
| ---------------------- | ------------------------------------------ | ------------------------------ | ----------------------------------------------- |
| SBOM + Vuln gates      | `sbom.spdx.json` artifact; `trivy.sarif`   | CI job `build_test_scan`       | PR shows SBOM + failing status on Critical/High |
| Signing + Provenance   | `dist/provenance.json`; Cosign attestation | S3/KMS attest bucket object    | `cosign verify-attestation` against ECR tag     |
| GitOps CD              | `platform/gitops/argo/...`                 | Argo UI health; sync history   | Roll a canary and see AnalysisTemplates execute |
| OPA Policy Gates       | `policy/*.rego`                            | CI job `policy_gates`          | Deliberately remove warrant → CI fails          |
| Canary + Auto‑rollback | `charts/core/templates/rollout.yaml`       | Prom rules + AnalysisTemplates | Trip SLO burn → rollout aborts/rollbacks        |
| Schema Gates           | Helm `pre-install` Job                     | Migration lints in CI          | Introduce forbidden op → gate blocks            |
| Preview Envs           | `.github/workflows/preview.yml`            | Namespaces `pr-<nr>`           | Open PR → preview URL responds; smoke passes    |
| Observability          | OTEL annotations in chart                  | Grafana dashboards             | Trace coverage gate ≥ threshold                 |
| FinOps Guards          | `ci/scripts/cost_guard.sh`                 | `cost-guard.yml` workflow      | Push change with high cost delta → gate fails   |
| Chaos & DR             | `chaos.yml`, `dr_restore_dry_run.sh`       | Runbook updates                | Nightly stage pod kill; restore timer recorded  |

---

## IV. Operational Readiness Review (Go/No‑Go)

**All must be GREEN to ship to prod without escort:**

1. **Zero Criticals/Highs** in code + image scan (exceptions need SecOps waiver).
2. **Signed images + verified provenance** for the release tag.
3. **Policy pack pass:** warrant/authority binding, license/TOS compliance, provenance present, citations resolve.
4. **Canary health checks green:** error‑rate + SLO burn **< thresholds** across 3 consecutive intervals.
5. **Schema gate pass:** migration lint clean; shadow‑read error budget unaffected.
6. **SRE on‑call, runbook links, and alerts** verified for the service.
7. **Cost guard:** budget deltas within bounds; storage projections sane.
8. **Backout plan tested** in last 30 days; ChatOps rollback working.

---

## V. Phase 3 Orders — “Evidence & Enforcement” (30 days)

**Objective:** Turn practices into
**enforced defaults** with auditable proofs and a production bake.

### A. Enforce by Default

- **Admission control:** Deploy image‑policy/admission to **reject unsigned/unattested images** and missing SBOM labels.
- **Namespace baselines:** Push mandatory NetworkPolicies, resource limits, and OTEL sidecar/annotations via GitOps for all envs.
- **Policy pack v2:** Expand OPA with rule IDs, severities, and remediation hints; enforce on PR and pre‑promote.
- **Secrets:** Replace placeholders with real **SealedSecrets**; add rotation SLO and failing gate for secrets >90 days.

### B. Production Bake & Drills

- **72‑hour bake** of the platform in **stage** with synthetic traffic at P50/P95 steady load; no Sev‑1 allowed.
- **Two game‑days:** 1) dependency outage; 2) data migration rollback under load. Capture MTTR and rollback timing.
- **DR timed restore:** Target **RPO ≤ 15m / RTO ≤ 60m** for core services; publish evidence.

### C. Adoption & Scale

- **Onboard 5 services** via golden path; deprecate legacy bootstrap. Scorecard in Backstage: **golden‑path compliance ≥ 80%**.
- **DORA pipeline:** Automate lead time, deployment frequency, MTTR, CFR dashboards; weekly scorecard to leadership.

### D. FinOps Discipline

- **Hard budgets** per service; CI gate thresholds; weekly FinOps mail with top cost deltas and right‑size suggestions.

### E. Security & Compliance

- **Threat model** refresh for top 3 services; map gates to controls; publish “evidence pack” per release.

---

## VI. KPI Scoreboard (targets)

- **Lead time** ↓ 40% vs. W1 baseline; **deploy freq** ≥ daily to stage, ≥ weekly to prod.
- **Change failure rate** ≤ 10%; **MTTR** ↓ 30%.
- **Trace coverage** ≥ 70% critical paths; **synthetics** on top 5 journeys.
- **100% signed images**; **0 long‑lived keys** in CI.
- **Cost/request** ↓ 15% on targeted services.
- **Game‑day pass** x2 per quarter; DR meet RPO/RTO.

---

## VII. Annex — Templates & Snippets

### A. Evidence Pack Layout

```
evidence-pack/
  release-<tag>/
    sbom/ sbom-<tag>.json
    provenance/ provenance-<tag>.json
    scans/ trivy.sarif gitleaks.json
    policies/ conftest-results.json
    rollout/ canary-metrics.json slo-burn.json
    schema/ migrate-lint.txt shadow-read.txt
    finops/ pr-<nr>-cost-diff.json
    chaos-dr/ run-YYYYMMDD.json
```

### B. Go/No‑Go Memo (one page)

- **Service | Version | Change summary**
- **Risks & mitigations**
- **Gates summary** (Criticals=0 ✓, Sign/Prov ✓, Policy ✓, Canary ✓, Schema ✓, Cost ✓)
- **Rollback plan + owner**
- **Decision:** GO / NO‑GO (signatures)

### C. Make Targets (optional)

```
make sbom sign attest policy test-e2e cost-guard rollout canary status evidence-pack
```

---

## VIII. Closing (Wolf)

The scaffolding is sound. Phase 3 demands discipline: **deny by default, prove by artifact, and drill under stress**. Execute the orders above; convene the Council for the production bake review with a full evidence pack.
