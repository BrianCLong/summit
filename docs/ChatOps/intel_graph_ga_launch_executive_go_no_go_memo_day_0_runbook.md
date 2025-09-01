# IntelGraph GA Launch — Executive Go/No‑Go Memo & Day‑0 Runbook

**Decision:** **GO** (immediate)  
**Scope:** Full IntelGraph GA as described in the Final Readiness Summary.  
**Command Center Window:** Launch (T‑0) → T+7 days  
**Change Policy:** 72h change freeze (exception via Incident Commander only).  

---

## 1) Go/No‑Go Rationale (Condensed)
- All critical domains at 100% readiness; acceptance criteria met across security, ops, analytics, and legal.
- Extensive pre‑prod validation with SLOs exceeded and zero P0 security findings.
- Canary + feature flag posture in place; instant rollback path defined (see §5).

**GO with Guardrails:** proceed under strict monitors, defined abort thresholds, and a staffed command center.

---

## 2) Launch Gates & Abort Criteria
**Hard Gates (must be GREEN at T‑0):**
1. **AuthN/Z & Policy**: OIDC/JWKS live; ABAC/RBAC effective; policy simulator dry‑run clean.
2. **mTLS Everywhere**: service mesh cert rotation verified (expiry ≥ 30 days).
3. **Provenance & Export**: manifest signer healthy; hash‑tree verification passes.
4. **Observability**: metrics/traces/logs complete; SLO burn alerts armed.
5. **Backups & DR**: PITR enabled; last restore test < 14 days; cross‑region replica healthy.
6. **Data License Engine**: block/allow decisions observed in pre‑launch dry run.
7. **Runbooks**: incident classes loaded in wiki; on‑call has access/permissions.
8. **Comms**: status page draft staged; stakeholder mailers queued.

**Abort / Rollback Triggers (any TWO sustained 10 min → rollback; any ONE sustained 30 min → rollback):**
- p95 Graph API latency > **1.5s** for standard queries OR UI p95 > **150ms** for trivial reads.
- Error rate (5xx) > **1.5%** across any core service.
- MTTR projection > **30 min** for P1 based on active incident.
- Policy engine denies > **1%** of normal user actions erroneously (confirmed false‑positive rate).
- Security: unauthorized access alert (high confidence) or key/cert compromise indicator.
- Data integrity: provenance signer failure > **5 min** or export verifier mismatch observed.

**Pause Triggers (investigate; 60‑min cap):** ETL backlog growth > **3x** baseline; cost guard breach; drift detector red.

---

## 3) Command Center Plan (T‑0 → T+7d)
**War Room:** dedicated channel (#ga‑warroom) + Zoom bridge + status page draft.  
**Cadence:**  
- **T‑0**: Launch command; smoke tests (see §4) immediately.
- **First 24h**: stand‑ups at **T+1h**, **T+6h**, **T+12h**, **T+24h** (15 min each, decision‑focused).  
- **Days 2–7**: daily stand‑up **09:00 local**, plus ad‑hoc flare‑ups.

**Roster & On‑Call (primary → backup):**
- **Incident Commander (IC):** Product Lead → CTO
- **SRE/Platform:** SRE‑1 → SRE‑2
- **App/API:** Backend‑1 → Backend‑2
- **Data/ETL:** Data‑1 → Data‑2
- **Security (Blue Team):** Sec‑1 → Sec‑2
- **Privacy/Ombuds:** Privacy‑1 → Privacy‑2
- **Legal (Export/Policy):** Counsel‑1 → Counsel‑2
- **Comms/Status Page:** Comms‑1 → Comms‑2
- **Customer Success:** CS‑1 → CS‑2

**Comms Matrix:**
- **Internal**: War room → Execs (hourly digest Day 1; twice daily Days 2–3; daily thereafter).
- **External**: Status page only for user‑impacting incidents; RCA within 5 business days if applicable.

---

## 4) Day‑0 Smoke Tests (15–30 min total)
**Pass/Fail = proceed/rollback input to IC.**

1) **Auth & Policy**  
- Login (OIDC) + step‑up auth.  
- Attempt blocked export → verify human‑readable reason and appeal path.  
- **Success:** tokens issued; policy denial reason visible; audit entry present.

2) **Graph Core & Query**  
- NL→Cypher preview; sandbox execute; cost estimate visible.  
- 3‑hop neighborhood query returns < 1.5s p95.

3) **Ingest & ER**  
- Ingest sample CSV/JSON; PII flags; lineage recorded; ≥10 MERGE auto‑accepts; review queue populated.

4) **Analytics**  
- Link prediction returns ≥ 50 edges; AUC ≥ 0.85 on fixture; communities ≥ 6 with modularity displayed.

5) **Anomaly & Drift**  
- LOF outliers ≥ 20; drift panel shows JSD when threshold exceeded.

6) **Explainability**  
- Feature weights + ≤3 meta‑paths rendered; UI contributions view.

7) **Provenance & Export**  
- Export bundle with signed manifest; external verifier passes.

8) **Observability & Cost Guard**  
- SLO dashboard live; slow‑query killer engages on synthetic hog; alert delivered to on‑call.

---

## 5) Rollback Plan (Feature‑Flag + Versioned)
**Strategy:** Blue/green with canary cohort; DB migrations are additive and gated.

**Procedure:**
1. Freeze new traffic to canary; drain within 2 minutes.  
2. Flip feature flags to **SAFE** profile; disable heavy analytics; downshift cost profile.  
3. Roll router back to prior stable release; verify health checks.  
4. Verify schema compatibility; apply down‑migration only if explicitly approved by IC + DBA.  
5. Post‑rollback smoke tests (§4) and audit export of incident artifacts.

**Evidence Preservation:** retain logs, traces, and export manifests; snapshot affected subgraphs.

---

## 6) Residual Risk Register (Top 12)
| # | Risk | Signal to Watch | Mitigation | Owner |
|---|------|-----------------|-----------|-------|
| 1 | Policy misconfig false‑blocks | Spike in denies on common actions | Pre‑prod policy sims; fast rule rollback | Security + Product |
| 2 | ER false merges/splits | Review queue load ↑; conflict density ↑ | Strict thresholds; human‑in‑loop; reversible merges | Data |
| 3 | Connector license drift | Export blocks from license engine | License registry audits; owner alerts | Legal + Data |
| 4 | Cost spike | SLO burn with CPU↑ | Budget caps; slow‑query killer; archival tiering | SRE |
| 5 | Drift/poisoned feeds | Drift alarms; anomaly on sensor health | Quarantine lanes; honeypot tags | Data + Sec |
| 6 | Multi‑tenant isolation bug | Cross‑tenant access anomaly | Chaos tests; policy simulation; honeytokens | Security |
| 7 | Provenance signer outage | Export verifier mismatch | HA signer; fallback queue; alerting | Platform |
| 8 | mTLS/cert expiry | Cert age alerts | Automated rotation; expiry dashboards | Platform |
| 9 | Data residency misroute | Region tag mismatch alerts | Routing guards; residency labels enforced | Platform + Legal |
|10 | Query planner pathologies | Tail latency spikes | Persisted queries; cost hints; caching | App |
|11 | Offline/edge sync conflict | Divergence reports | CRDT merge UI; operator approvals | Platform |
|12 | Guardrail bypass/prompt abuse | Guardrail breach attempts ↑ | Red‑team prompts logged; quarantine | Security + AI |

---

## 7) Metrics & Alerts (Live from T‑0)
| Domain | Metric | Target | Alert Threshold | Owner |
|---|---|---|---|---|
| Availability | System uptime | ≥ 99.8% | < 99.5% (rolling 1h) | SRE |
| Performance | Graph p95 (std query) | ≤ 1.5s | > 1.5s (10 min) | App/SRE |
| UI | p95 trivial reads | < 150ms | > 300ms (10 min) | App |
| Ingest | E2E 10k docs | ≤ 5m | > 8m (15 min) | Data |
| ER | Auto‑accept precision | ≥ 0.9 on gold set | < 0.85 (daily) | Data |
| Security | Critical vulns | 0 | Any detected | Security |
| Governance | Deny FP rate | < 0.3% | ≥ 1% (30 min) | Security/Product |
| Provenance | Verifier pass rate | 100% | < 99.9% (30 min) | Platform |
| Cost | Budget adherence | ≤ plan | +15% spike (1h) | SRE/FinOps |

---

## 8) Comms & Change Management
- **Change Freeze:** 72h; exceptions: security hotfix, rollback, or IC‑approved P1 fix.
- **Status Page:** only for user‑impacting events; include scope, impact, start time, mitigations.
- **Customer Advisory (if needed):** clear description, mitigations, ETR; route through Comms + Legal.
- **Internal Digest:** short, metric‑first summaries; incident IDs; decisions/outcomes.

---

## 9) Post‑Launch Assurance
- **T+48h:** success criteria review; close or remediate action items.
- **T+7d:** stability validation; AAR with owners; backlog items created with priorities.
- **T+14d:** governance/ethics check‑in; audit of denies/appeals; publish transparency notes (internal).

---

## 10) Reference Checklists
- **Incident Classes:** perf regression, ingest backlog, authz drift, cost spike, poisoned feed, export/license blocks, residency mismatch, prompt injection.
- **Golden Paths:** ingest→resolve→analyze→explain→export; copilot NL→Cypher w/ preview; disclosure bundle with manifest.
- **Escalation Ladder:** Engineer → Function Lead → IC → Exec/Legal/Ombuds.

*Prepared for immediate execution. Keep the war room calm, the dashboards bright, and the rollback switch within reach.*

