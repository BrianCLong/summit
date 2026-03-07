# GA Disinformation Edge — General Availability (GA) Launch Playbook

**Owner:** Merge & Release Captain (Royalcrown IG)
**Scope:** Move from Limited Beta → GA with safe, reversible changes, complete observability, and auditability across **dev → stage → prod**.
**Principles:** Observability-first • IaC everywhere • Progressive delivery • Security & governance by default • Compliance guardrails • DR & resilience • Blameless postmortems.

---

## 1) Readiness Gates (Must be Green Before GA Cut)

**Product**

- [ ] Feature set frozen behind **feature flags** with safe defaults.
- [ ] Playbooks: Polling Place, Ballot Process, Deepfake, Data Fabrication, Harassment complete and versioned.
- [ ] GA-Context Graph coverage ≥ 95% of GA counties; entity tests pass.

**Quality**

- [ ] Unit ≥ 90% critical-path coverage; e2e passes for “ingest → verify → respond → ledger export”.
- [ ] Load: p95 < 1.5s for query endpoints; sustained 5× beta peak for 60 min; zero unbounded queues.
- [ ] HAZARD v2 accuracy lift vs. baseline: +5 pts AUPRC on eval set.

**Security**

- [ ] OPA policies enforced (ABAC/RBAC); admin actions gated with WebAuthn/FIDO2 step-up auth.
- [ ] Secrets in **sealed-secrets**; zero plaintext in repos/CI logs.
- [ ] SCA/SAST clean: 0 criticals, 0 highs; SBOM published.

**Compliance**

- [ ] DPIA completed & signed; retention schedule configured; dual-control deletes verified.
- [ ] Immutable audit trails on by default (who/what/why/when).
- [ ] Nonpartisan policy & non-persuasion checks wired in red-team harness.

**Reliability/DR**

- [ ] Cross-region replicas configured; backups w/ PITR validated; last **chaos drill** < 30 days.
- [ ] RTO ≤ 30 min, RPO ≤ 5 min documented and tested.

**Observability**

- [ ] OTEL traces across ingest→verify→respond; Prometheus metrics & alerts for golden signals.
- [ ] SLO dashboards (availability & latency) green for 14 consecutive days.

**Docs & Ops**

- [ ] Runbooks for top incident classes updated; on-call rotation staffed.
- [ ] Public transparency explainer live; API & integration docs versioned.

---

## 2) Environments & Promotion Flow

- **dev**: auto-deploy from trunk; preview env per PR (ephemeral, auto-destroy on merge/close).
- **stage**: nightly promotion on green checks; **chaos/rollback simulation** runs here.
- **prod**: GA cut through **canary + progressive traffic**; schema behind **migration gates**.

**Promotion Criteria**

- All gates green; no open Sev-1/2; SLO burn = 0 for previous 24h; cost dashboard within budget envelope.

---

## 3) GA Release Train (T‑14 → T+7)

**T‑14 to T‑7: Stabilize & Prove**

- Freeze scope; mark nonessential items for post‑GA.
- Complete DPIA, security sign‑off, and legal review.
- Load test at 5× beta peak; DR game day; rollback rehearsal.

**T‑6 to T‑3: Pre‑Cut**

- Finalize canary plan (segments, health SLO, abort thresholds).
- Prepare release notes, change log, and partner enablement kits.
- Verify analytics & audit export endpoints; run red-team mutation drill.

**T‑2 to T‑0: Cut Readiness**

- Freeze artifacts (OCI images, Helm charts, Terraform plan) with checksums.
- Stage deployment exact‑as‑prod; sign Evidence Ledger chain-of-custody.

**T0: GA Cut**

- Deploy canary (5% traffic) for 30–60 min. Hold **migration gates** (read-only).
- Monitor golden signals: error rate, p95 latency, saturation, HAZARD scorer stability.
- Promotion to 25% → 50% → 100% on green; auto‑rollback if any SLO breach (p95 + error rate) sustained > 5 min.

**T+1 to T+7: Soak & Harden**

- Daily health review; backlog triage; publish metrics snapshot (TTV, TTR, Precision@5).
- Execute post‑GA chaos drill; close out postmortem(s); ship patch train if needed.

---

## 4) Canary & Rollback Plan (Template)

**Scope:** web/API, verification workers, HAZARD service, ledger signer, retrieval index.
**Guarded Migrations:** Index schema v2 (behind flag `index_v2_migration_gate`), DB migration `2025_12_29` with dual‑write + shadow reads.
**Health Checks:**

- Golden signals: error rate, p95 latency, CPU/memory saturation, queue lag, signer failure rate.
- Product KPIs: Time‑to‑Verification (median), Evidence Ledger write success %, false‑positive rate on shadow set.
  **Abort Conditions:** Any two of: error rate >1%, p95 >1.5s, queue lag > 2× baseline for 5 min, signer failures >0.1%.
  **Rollback:** `helm rollback release@rev` + feature flags to safe defaults + revert traffic split; run smoke & data consistency checks.

---

## 5) Policy Gates in CI/CD (Golden Path)

- **Build/Test**: unit, contract, e2e, mutation tests, load/k6 smoke.
- **Security**: SAST, SCA, IaC policy (OPA/Conftest), container scan, SBOM attach.
- **Infra**: Terraform plan + policy check; Helm lint + dry‑run; migration gates verified.
- **Compliance**: DPIA present, retention config, audit toggles enforced.
- **Observability**: OTEL spans required; metrics/alerts diff reviewed.

---

## 6) RACI — GA Day

| Area                  | R              | A                       | C                 | I            |
| --------------------- | -------------- | ----------------------- | ----------------- | ------------ |
| Release Orchestration | Deployment Eng | Merge & Release Captain | SRE, Security     | All          |
| Canary Watch          | SRE            | Deployment Eng          | Product, Data Sci | Stakeholders |
| Schema/Migration Gate | DB Eng         | Deployment Eng          | App Eng           | SRE          |
| Rollback Decision     | SRE Lead       | Release Captain         | Security, Product | All          |
| External Comms        | Comms Lead     | PM                      | Legal             | Partners     |

---

## 7) GA Communications Kit

**Audience:** partners, agencies, platforms, public.
**Principles:** nonpartisan, non‑persuasion, privacy‑respecting, transparent.

**Artifacts**

- Release notes (public + technical).
- Transparency explainer: how we verify; limits & uncertainties; how to report issues.
- Security & privacy summary (DPIA highlights, retention/rights).
- Partner enablement: API guide, quota/SLOs, playbook usage, incident contacts.
- Press FAQ: scope, safeguards, what we don’t do.

**Snippets (fill‑in)**

- **Fact box template** and **correction template** aligned to Style Guide.
- **Status page** links and uptime/SLO definitions.

---

## 8) Observability & SLOs

- **Service SLOs:** Availability 99.9%; p95 latency < 1.5s (verify API); ledger write success ≥ 99.95%.
- **Alerts:** SLO burn, anomaly detection on narrative velocity, signer failure, index freshness.
- **Dashboards:** Latency heatmaps, queue lag, per‑county retrieval freshness, feature‑flag impact.

---

## 9) Security, Privacy, Compliance

- ABAC/RBAC via OPA; reason‑for‑access prompts; immutable audits.
- Sealed-secrets; no secrets in repos/CI; token scopes least‑privilege.
- DPIA stored; retention/purge jobs with dual‑control deletes; FOIA‑grade Evidence Ledger.

---

## 10) Post‑GA KPIs & Review (30/60/90)

- Precision@5 / Recall@5 on GA eval sets; TTV/TTR medians; false‑positive harm reports.
- Partner satisfaction (NPS‑Ops); incident MTTR; rollback drills passed.
- Cost per verified item; autoscaling efficiency; index freshness SLA.

---

## 11) Runbooks (Quick Links / Summaries)

- **High Error/Latency**: throttle ingest, scale workers, switch to degraded mode (text‑only), notify partners.
- **Signer Failures**: fail‑open policy? (No—fail‑closed for ledger), queue park, rotate keys, replay.
- **Index Staleness**: flip `freshness_override` flag, prioritize official sources, backfill job.
- **HAZARD Drift**: freeze model version, roll back to N‑1, re‑score shadow set.

---

## 12) Acceptance Evidence (Audit)

- Links to test runs, SBOM, Terraform/Helm plan outputs, signed release bundle checksums, chaos drill logs, and canary/rollback decision records.

**GA is green when:** all readiness gates pass, canary completes without breach, audits are immutable, and post‑cut soak shows SLO burn = 0 with partner confirmations collected.
