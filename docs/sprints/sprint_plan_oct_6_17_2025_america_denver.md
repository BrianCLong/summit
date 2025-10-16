# Sprint Plan — Oct 6–17, 2025 (America/Denver)

> **Context:** Third sprint in the sequence. Build on GA Triage v2 to harden access controls, broaden visibility across clouds, and deepen automation for responders.

---

## 1) Sprint Goal (SMART)

Ship **RBAC Phase 1** (scopes + roles) and **Cross‑Cloud Asset Inventory v1** with \>= **85% asset coverage**, deliver **Threat Intel Dedup + Scoring v1** cutting duplicate indicators by **\>=60%**, and release **EDR Live Response Toolkit v1** (read‑only + guided) — **by Oct 17, 2025**.

**Key outcomes**

- RBAC Phase 1 enabled for all internal users; legacy permissions frozen behind flag.
- Unified asset inventory for AWS/Azure/GCP with normalization and ownership tags.
- TI pipeline removes \>=60% duplicate IOCs; confidence score exposed to detections.
- EDR live response toolkit (collect triage artifacts safely) available to on‑call.

---

## 2) Success Metrics & Verification

- **RBAC adoption:** 100% internal users mapped; zero P1 authz regressions.  
  _Verify:_ Access logs, permission audit, break‑glass drill.
- **Asset inventory coverage:** \>=85% of active compute/identity assets per cloud; freshness \<= 24h.  
  _Verify:_ Cross‑check vs cloud APIs; weekly reconciliation report.
- **TI effectiveness:** Duplicate IOC rate ↓ \>=60%; mean confidence score calibrated (Brier score \<= 0.20 on eval set).  
  _Verify:_ Pipeline metrics; sampled analyst validation.
- **EDR toolkit reliability:** \>=95% success on artifact collection; execution time P95 \<= 2m.  
  _Verify:_ SOAR/EDR run logs; synthetic jobs overnight.

---

## 3) Scope

**Must‑have (commit):**

- RBAC Phase 1: role matrix (Viewer/Analyst/Responder/Admin), scope checks at API/UI, migration script, break‑glass.
- Asset Inventory v1: AWS/Azure/GCP collectors, normalization (host, account, container, function), ownership tags, API + UI table.
- Threat Intel Dedup/Scoring v1: feed adapters (2 new), fuzzy + exact dedup, confidence model (rule‑based v1), export to detections.
- EDR Live Response Toolkit v1: log/package collection, process list, network snapshot (read‑only), chain of custody.
- Observability: dashboards and alerts for all new services; runbooks.

**Stretch:**

- Identity graph enrichment: join Okta/AD ↔ inventory ↔ alerts (host ↔ user ↔ account).
- Detection‑as‑Code Pipeline v2: golden datasets and breaking‑change CI gate.
- TI sandbox: URL/file detonation pre‑filter (10% sample).

**Out‑of‑scope:**

- RBAC Phase 2 (granular resource‑level permissions); mobile clients; customer‑facing inventory exports.

---

## 4) Team & Capacity

- Same roster as prior sprint; **commit 40 pts** (\~50 nominal × focus 0.8).

---

## 5) Backlog (Ready for Sprint)

### Epic L — RBAC Phase 1 (12 pts)

- **L1 — Role matrix & policy engine wiring** (5 pts)  
  _AC:_ roles: Viewer/Analyst/Responder/Admin; deny‑by‑default; feature flag.
- **L2 — UI/API guards + audit** (4 pts)  
  _AC:_ protected routes; 403 UX; audit events; regression tests.
- **L3 — Migration + break‑glass** (3 pts)  
  _AC:_ mapping script; emergency admin path; tabletop drill.

### Epic M — Cross‑Cloud Asset Inventory v1 (12 pts)

- **M1 — Cloud collectors (AWS/Azure/GCP)** (5 pts)  
  _AC:_ pagination/rate‑limit safe; delta sync; retries.
- **M2 — Normalization & ownership tags** (4 pts)  
  _AC:_ schema v1; owner inference rules; data dictionary.
- **M3 — API + UI table** (3 pts)  
  _AC:_ filter/search; export CSV; link to alerts.

### Epic N — Threat Intel Dedup + Scoring v1 (8 pts)

- **N1 — Feed adapters + parsing** (3 pts)  
  _AC:_ STIX/TAXII + CSV; error budget; tests.
- **N2 — Dedup (exact + fuzzy)** (3 pts)  
  _AC:_ hash/domain/IP canonicalization; near‑dup threshold.
- **N3 — Confidence model (rule‑based)** (2 pts)  
  _AC:_ score 0–100; provenance; override via admin.

### Epic O — EDR Live Response Toolkit v1 (6 pts)

- **O1 — Artifact pack (logs, processes, net)** (4 pts)  
  _AC:_ read‑only; timeout/rollback; chain‑of‑custody.
- **O2 — SOAR action + UI trigger** (2 pts)  
  _AC:_ dry‑run; audit; success telemetry.

### Epic P — Observability & Runbooks (2 pts)

- **P1 — Dashboards/alerts + SLOs** (2 pts)  
  _AC:_ uptime, error rate, latency; pager thresholds; on‑call doc.

> **Planned:** 40 pts commit + 8–10 pts stretch bucket.

---

## 6) Dependencies & Assumptions

- Cloud API credentials with least privilege; rate limits documented.
- RBAC policy definitions reviewed by Security/Legal; emergency access stored in vault.
- TI feeds licensed; usage terms allow dedup/scoring/storage.
- EDR vendor supports live response read‑only actions via API.

---

## 7) Timeline & Ceremonies

- **Oct 6** — Planning & Kickoff; RBAC tabletop (30m).
- **Oct 10** — Mid‑sprint demo/checkpoint.
- **Oct 14** — Grooming for next sprint.
- **Oct 17** — Demo + Retro + Release cut.

---

## 8) Definition of Ready (DoR)

- Role matrix approved; data schemas defined; service owners assigned.
- Flags/telemetry named; test data available; sec/privacy review notes attached.

## 9) Definition of Done (DoD)

- Feature flags deployed; tests pass (unit/integration); dashboards live.
- Runbooks updated; enablement notes posted to #analyst‑ops.
- Backwards‑compat/rollback documented; access logs audited.

---

## 10) QA & Validation Plan

- Unit coverage \>=80% on changed services.
- RBAC authz tests: positive/negative matrix per role.
- Inventory reconciliation: sample 100 assets per cloud; report diffs.
- TI dedup A/B: pre/post duplicate rate with confidence calibration.
- EDR toolkit synthetic run nightly on staging fleet.

---

## 11) Risk Register (RAID)

| Risk                                    | Prob. | Impact | Owner | Mitigation                                            |
| --------------------------------------- | ----- | -----: | ----- | ----------------------------------------------------- |
| Over‑restrictive RBAC blocks analysts   | Med   |   High | L2    | Shadow mode + break‑glass + logs                      |
| Cloud API throttling/limits             | Med   |    Med | M1    | Backoff/queue; sparse fields; delta sync              |
| TI dedup over‑merges (loss)             | Low   |    Med | N2    | Conservative thresholds; manual review queue          |
| EDR live response destabilizes endpoint | Low   |   High | O1    | Read‑only v1; timeout/rollback; vendor best‑practices |
| Ownership tagging inaccuracies          | Med   |    Med | M2    | Owner inference rules + manual override + report      |

---

## 12) Communications & Status

- **Channels:** #sprint‑room (daily), #analyst‑ops (enablement), Exec update (Fri).
- **Reports:** Burnup, RBAC adoption, inventory coverage, TI dedup %, EDR success.
- **Escalation:** PM → Eng Lead → Director.

---

## 13) Compliance/Security Guardrails

- Least privilege for cloud collectors; access tokens rotated; audit logging.
- PII handling: none stored in TI artifacts beyond necessary observables.
- Chain‑of‑custody for EDR artifacts; signed bundles; retention policy.

---

## 14) Release & Rollback

- **Staged rollout:** Internal users first; then broader cohorts.
- **Rollback:** Disable RBAC enforcement flag; stop inventory sync; revert TI pipeline; disable live response actions.
- **Docs:** Release notes; analyst changelog; customer comms (if external).

---

## 15) Next Sprint Seeds (Oct 20–31)

- RBAC Phase 2 (resource‑level and project‑scoped permissions).
- Inventory v1.1 (agent ↔ cloud reconcile; CMDB export; drift alerts).
- TI sandbox expansion (full detonation + ML confidence v2).
- SOAR v1.2 (auto‑approve with risk score, human‑in‑the‑loop UI).

---

_Prepared by: Covert Insights — last updated Sep 7, 2025 (America/Denver)._
