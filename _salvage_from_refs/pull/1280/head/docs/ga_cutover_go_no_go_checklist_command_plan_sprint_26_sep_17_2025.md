# GA Cutover — Go/No‑Go Checklist & Command Plan
**Release:** Sprint 26 • **Cutover Window:** Sep 17, 2025 • **Environment:** Production • **Change Type:** GA

---
## 1) Executive Snapshot
- **Scope Included:** SLO Monitoring & Alerting (P0–P6), K6 Load Tests (6 scenarios w/ auto go/no‑go), Provenance (SLSA‑3 w/ emergency bypass), Cost Guardrails (adaptive sampling), Change Freeze & DR via **igctl**, GA Mission‑Control Dashboard (real‑time rollback triggers).
- **Primary Success Criteria:**
  - All P0–P2 SLOs green during and post‑cutover.
  - K6 scenarios ≥ target throughput, ≤ latency/error thresholds.
  - Provenance manifests generated for every deployable; bypasses logged + approved.
  - Cost within $18k infra / $5k LLM monthly targets (projected & realized).
  - Zero unresolved Sev‑1/Sev‑2 incidents in T+24 window.

---
## 2) Go/No‑Go Decision Matrix (fill during readiness review)
| Gate | Owner | Input/Link | Threshold | Status | Decision |
|---|---|---|---|---|---|
| **G1: SLO Readiness** | SRE On‑call | SLO board | P0–P2 ≥ 99.9%, error budget ≥ 2w remaining | ☐ | ☐ Go / ☐ No‑Go |
| **G2: K6 Perf** | Perf Eng | K6 report | p95 latency ≤ X ms; err rate ≤ Y%; TPS ≥ Z | ☐ | ☐ Go / ☐ No‑Go |
| **G3: Provenance/Supply‑Chain** | Sec Eng | Build attestations | SLSA‑3 attestations present; policy passes; exceptions ≤ 0 | ☐ | ☐ Go / ☐ No‑Go |
| **G4: Change Freeze** | Release Mgr | Freeze ledger | Freeze active; exceptions documented/approved | ☐ | ☐ Go / ☐ No‑Go |
| **G5: DR/Backup** | DR Lead | igctl drill report | Last drill ≤ 7d; RPO/RTO met; restore verified | ☐ | ☐ Go / ☐ No‑Go |
| **G6: Cost Guardrails** | FinOps | Cost dashboard | Forecast within budget bands; downshift rules armed | ☐ | ☐ Go / ☐ No‑Go |
| **G7: Security** | AppSec | OPA/WebAuthn | OPA policies green; WebAuthn step‑up enabled | ☐ | ☐ Go / ☐ No‑Go |
| **G8: Support & Comms** | Support Lead | Comms plan | On‑call staffed; status page ready; templates queued | ☐ | ☐ Go / ☐ No‑Go |

**Final Decision:** ☐ GO ☐ NO‑GO • **Approvers:** PM ☐ • Eng Mgr ☐ • SRE ☐ • Sec ☐ • FinOps ☐ • Support ☐

---
## 3) Cutover Timeline — T‑24h → T+24h
**T‑24h (Sep 16, 09:00):**
- Freeze enters **enforced** state; exception queue closes EOD.
- Snapshot backups + restore test (non‑prod) via **igctl dr rehearse**.
- Pre‑flight K6 smoke on staging; baseline dashboards archived.

**T‑12h (Sep 16, 21:00):**
- Perf guardrails armed (auto downshift modes). 
- Provenance: verify SLSA‑3 attestations for release artifacts; post hash manifest to release notes.

**T‑2h (Sep 17, 07:00):**
- War‑room opens (bridges below). 
- Status page: “maintenance window” banner (if applicable).

**T‑0 (Sep 17, 09:00): Deploy & Switch**
- Canary 5% → 25% → 50% → 100% with auto‑rollback hooks.
- Run **igctl cutover execute** (scripts list in §7).

**T+0 to T+2h:**
- Observe SLOs; run K6 validation suite; certify provenance bundle; cost meter live.

**T+2h to T+24h:**
- Heightened monitoring; customer comms cadence; backlog of deferred changes reopened at T+24h if stable.

**Post T+24h:**
- Publish GA announcement; attach verifiable manifest; file post‑launch report; schedule retro.

---
## 4) Rollback Criteria & Procedure
**Instant Rollback Triggers (any one):**
- P0 outage > 5 min OR error rate > threshold for 10 min.
- p95 latency degradation > 30% sustained 10 min.
- Security policy regression (OPA deny on critical path) or missing attestations.
- Cost spike > 3× forecast for > 30 min with no remediation.

**Procedure:**
1. **igctl cutover rollback --to=<last‑stable>** (idempotent).
2. Flip traffic weights back to last stable; invalidate caches.
3. Run rollback K6 smoke + SLO check; confirm recovery.
4. Post incident on status page; open Sev‑1; start postmortem doc.

---
## 5) Monitoring & Alerting (War‑Room Views)
- **Mission Control Dashboard:** unified SLOs, error budget burn, saturation, queue depths, deploy health, rollback trigger panel.
- **Alert Tiers (P0–P6):** routing map to on‑call rotations; paging rules verified.
- **Golden Queries/Checks:** query p95 < threshold; ingestion E2E < 5 min for N docs; provenance signer health; OPA allow/deny counts; step‑up auth success rate.

---
## 6) Performance Validation (K6)
- **Scenarios (6):** read heavy, write heavy, mixed, long‑path graph, spike/soak, failure‑injection.
- **Auto Decisions:** pass if latency/err/TPS within SLO bands; otherwise block with diff vs. baseline.
- **Artifacts:** HTML reports + trend diff; attach to release notes.

---
## 7) Runbook Commands (igctl)
```bash
# DR rehearsal & verification
igctl dr rehearse --env prod --rpo-target 5m --rto-target 60m
igctl dr verify-restore --snapshot latest

# Cutover
igctl cutover execute --strategy canary --stages 5,25,50,100 --auto-rollback

# Rollback
igctl cutover rollback --to last-stable --confirm
```

---
## 8) Security, Governance, Provenance
- **WebAuthn step‑up** enforced on admin & deploy actions.
- **OPA policies** externalized; change‑sim run before enable.
- **SLSA‑3:** attestations (provenance, SBOM, signatures) for all artifacts; 
- **Emergency Bypass:** dual‑control, time‑boxed, logged; post‑hoc review required.

---
## 9) FinOps & Cost Guardrails
- **Targets:** $18k infra / $5k LLM per month.
- **Controls:** adaptive sampling, query budgets, slow‑query killer, archival tiering.
- **Downshift Ladder:** full → partial embeddings → cached results → read‑only mode (graceful).
- **Decision Points:** trigger at 1.2×, 1.5×, 2× forecast bands with pre‑approved actions.

---
## 10) Communications & Staffing
**War‑Room:** Slack #ga‑cutover + Zoom bridge; PagerDuty schedule linked.

| Role | Name | Coverage |
|---|---|---|
| Release Manager | ______ | T‑2h → T+4h |
| SRE On‑Call | ______ | 24h |
| AppSec | ______ | T‑2h → T+4h |
| Perf Eng | ______ | T‑1h → T+2h |
| Support Lead | ______ | T‑0 → T+24h |
| FinOps | ______ | T‑0 → T+4h |
| Comms | ______ | as needed |

**External Comms:** status page templates (maintenance, incident, resolved); customer email draft; internal heads‑up.

---
## 11) Acceptance, Sign‑off & Evidence
- Links: release notes, K6 reports, SLO snapshots, provenance manifest, DR rehearsal logs, cost forecast, policy sim diff.
- **Approvals:** checklist in §2; captured in change record.

---
## 12) Post‑Launch Validation & Retro
- **T+2h:** customer smoke tests passed; support volume normal; cost telemetry steady.
- **T+24h:** confirm no hidden regressions; reopen change window.
- **Retro (within 72h):** metrics review, incident review (if any), update runbooks, backlog next steps.

---
### Appendix A — SLO Reference (edit with your thresholds)
- Availability (P0): ≥ 99.95% during window; error budget ≥ X.
- Latency (p95): read ≤ ___ ms; write ≤ ___ ms; 3‑hop graph query ≤ ___ ms.
- Ingest E2E: ≤ 5 min for 10k docs.
- Auth step‑up success: ≥ 99%.
- Provenance signer health: 100% artifacts attested.

### Appendix B — Risk Log
| ID | Risk | Likelihood | Impact | Owner | Mitigation | Status |
|---|---|---|---|---|---|---|
| R‑01 | Perf regression on long‑path queries | M | H | Perf Eng | Extra cache warmup; K6 long‑path | ☐ |
| R‑02 | OPA policy drift blocks prod queries | L | H | AppSec | Simulate policy; feature flag rollback | ☐ |
| R‑03 | Cost spike from LLM burst | M | M | FinOps | Downshift ladder; cap tokens | ☐ |

---
**Document Owner:** ______ • **Version:** 1.0 • **Last Updated:** Sep 17, 2025