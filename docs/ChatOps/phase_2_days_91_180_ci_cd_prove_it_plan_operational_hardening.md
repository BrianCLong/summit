# Phase 2 (Days 91–180): CI/CD “Prove‑It” Plan & Operational Hardening

**Intent:** You’ve built the machine. Now we prove it under fire, lock the blast doors, and make deployment the safest path to production.

---

## North‑Star Outcomes (Victory Conditions)

- **DORA**: Lead time ≤ 1 day (P75), Deployment frequency ≥ daily (workdays), Change failure rate ≤ 10%, MTTR ≤ 30m (P75).
- **Reliability**: Service SLOs codified; error‑budget policy enforced (freeze on 2x multi‑window burn).
- **Security/Supply Chain**: SLSA Level 3 evidence captured for every release; no critical vulns; keys rotated; attestations verifiable.
- **Resilience**: RPO ≤ 5m, RTO ≤ 30m validated quarterly by DR restore tests.
- **Cost**: Unit economics dashboards live; budget alarms block wasteful merges.

---

## Workstreams & Deliverables

### 1) Control Plane Hardening (GitOps + Policy)

- **Deliverables**
  - OPA policy packs: namespace bounds, resource quotas/limits, image provenance required, network policy required, PDBs required, liveness/readiness gates.
  - **Progressive delivery defaults**: global canary steps, max surge/unavailable, abort on SLO burn.
  - **Promotion workflow**: auto‑promote on green canary; require change‑record for manual overrides.
- **Acceptance**: All app PRs receive policy decisions; any drift denied; failed policy blocks rollout.

### 2) SLSA & Supply‑Chain Maturity

- **Deliverables**
  - **In‑toto attestations** linked to SBOM + provenance; stored immutably (artifact store + transparency log).
  - **Dependency hygiene**: allow‑list for base images; SBOM diff job; OSS license checks gate.
  - **Key management**: short‑lived signing keys via OIDC; quarterly rotation playbook.
- **Acceptance**: Every artifact verifiable end‑to‑end; builds reproducible with `--no‑network`.

### 3) Reliability Engineering (SLOs, Burn Alerts, Chaos)

- **Deliverables**
  - SLOs per service (latency, availability, freshness); **multi‑window multi‑burn** alert rules.
  - **Game Days**: monthly chaos (pod kill, node drain, dependency brownout, region impairment) with runbook pass/fail.
  - **Auto‑rollback**: rollback on burn breach or health‑check regression.
- **Acceptance**: 3 consecutive Game Days pass; mean rollback < 5m; postmortems closed with actions.

### 4) DR & Business Continuity

- **Deliverables**
  - Cross‑region backups with encryption + restore automation; quarterly **full restore rehearsal** into a clean account/project.
  - **Failover playbook** with DNS, secrets, and data cutover steps.
- **Acceptance**: RPO/RTO met twice in a row; restore artifacts retained; audit trail complete.

### 5) Performance & Cost Guardrails

- **Deliverables**
  - **k6**/Locust load packs with **performance budgets** per endpoint; CI fails on budget regressions.
  - Cost models per workflow; PR **cost‑diff** with threshold gates; idle reaper jobs enforced.
- **Acceptance**: p95 under budget at baseline load; 50% surge tolerated without SLO breach.

### 6) Data & Schema Safety

- **Deliverables**
  - Migration framework: forward‑only, out‑of‑order handling, **backfill jobs** with cancellation and idempotency.
  - **Anonymized snapshots** + synthetic data packs for preview; data‑retention and DLP policies enforced.
- **Acceptance**: Zero blocked deploys on incompatible migrations for 60 days.

### 7) Platform & DevEx (Golden Path → Paved Road)

- **Deliverables**
  - Backstage templates for primary stacks (Node/TS, Python, Go) with baked‑in: OTEL, health endpoints, CI gates, rollout manifests.
  - **Scorecards**: service has SLOs, dashboards, runbooks, on‑call rota, cost owner, security owner.
  - **Trunk‑based** defaults: merge queue, feature flags, preview env TTL.
- **Acceptance**: 80% services onboarded to paved road; new service spin‑up ≤ 1 hour.

### 8) Compliance & Audit Readiness (Lightweight)

- **Deliverables**
  - Audit‑ready logs for deploys, approvals, policy decisions; retention + immutability policies.
  - Evidence pack generator: exports SLSA/SBOM/scan results per release.
- **Acceptance**: Internal audit checklist green; sample control walkthroughs pass.

---

## Execution Cadence

- **Wave A (Weeks 13–16):** Policy hardening, SLO definitions, burn‑rate alerts, k6 baseline.
- **Wave B (Weeks 17–20):** DR automation + full restore rehearsal; Backstage paved‑road templates.
- **Wave C (Weeks 21–24):** Attestations, key rotation, OSS license gates; Game Day #1.
- **Wave D (Weeks 25–26):** Performance budgets & cost thresholds; Game Day #2; audit evidence pack.
- **Wave E (Weeks 27–26+):** Multi‑region ready, runbook finals; Game Day #3; sign‑off.

> Adjust waves to your calendar; keep at least one Game Day per month.

---

## Immediate 7‑Day “Proving Ground” Checklist

- [ ] **Burn‑rate alerts live** (1h/6h and 2%/5% policies) tied to auto‑rollback.
- [ ] **Canary demo in prod** with a trivial change; prove rollback path.
- [ ] **SBOM diff job** annotates PRs; fail on new high/critical.
- [ ] **Key rotation drill** using OIDC‑issued short‑lived keys; retire static tokens.
- [ ] **k6 baseline** captured and stored; publish performance budgets.
- [ ] **DR dry‑run**: restore last backup into an isolated project; record RPO/RTO.
- [ ] **Policy pack v1** (limits/quotas, NetPol required, image provenance required) merged.
- [ ] **Scorecards** created in Backstage; owners assigned for top 5 services.

---

## Metrics & Reporting

- Weekly: DORA roll‑up, error‑budget spend, cost‑to‑serve by service, policy denials, SBOM drift.
- Monthly: Game Day results, DR rehearsal metrics, top regressions and remediations, paved‑road adoption.

---

## Risks & Mitigations

- **False‑positive gates** stall delivery → Stage gates first; progressive rollout; manual override with signed change record.
- **Alert fatigue** → Multi‑window burn alerts; SLO‑aligned routing; noise review weekly.
- **Key/attestation sprawl** → Central evidence store; rotate by automation; inventory jobs.

---

## Definition of Done (Phase 2)

- Three passing Game Days, two passing DR rehearsals, DORA targets met for 30 consecutive days, zero critical vulns, and ≥80% services on the paved road.

---

### Owner Map (fill‑in)

| Workstream              | Owner | Deputies | Review Cadence |
| ----------------------- | ----- | -------- | -------------- |
| Control Plane Hardening |       |          | Weekly         |
| SLSA & Supply Chain     |       |          | Weekly         |
| Reliability & Chaos     |       |          | Weekly         |
| DR & BCP                |       |          | Bi‑weekly      |
| Perf & Cost             |       |          | Weekly         |
| Data & Schema           |       |          | Bi‑weekly      |
| Platform & DevEx        |       |          | Bi‑weekly      |
| Compliance & Audit      |       |          | Monthly        |

---

### Appendix: Policy Pack v1 (Outline)

- deny if: no NetworkPolicy; no PodDisruptionBudget; containers without limits/requests; image without provenance attestation; cluster‑admin in workload; hostPath/privileged set; LoadBalancer without sourceRanges.

### Appendix: Game Day Scenarios (Rotating)

1. API dependency brownout (20% errors for 30m) → expect rollback.
2. Node pool exhaustion → autoscaler + PDB behavior verified.
3. Secrets backend outage → apps degrade gracefully; break‑glass documented.
4. Read replica lag > RPO → write throttling triggers; alert routes.
