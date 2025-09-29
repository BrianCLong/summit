# GA Cutover – Run of Show, Final Readiness & Rollback Playbook (Sprint 26)

**Product/Program:** IntelGraph Core GA  
**Cutover Window:** **Wed, Sept 17, 2025** (America/Denver, MDT)  
**Change ID:** GA-2025Q3-S26  
**Author:** Release Mgmt (with Dev, SRE, Sec, Comms)  
**Version:** 1.0 (final)  

---

## 0) Executive Snapshot
- **Status:** ✅ All GA cutover prerequisites delivered and validated in Stage.
- **Control Plane:** `igctl` enhanced; Go/No-Go matrix (G1–G8) codified; automated gate tracking online.
- **Rollback:** One‑click `execute --auto-rollback`, emergency `rollback --to last-stable`, DR rehearsal scripted.
- **Observability:** War Room Mission Control live; SLOs and alerts wired (P0–P6); cost guardrails active.
- **Comms:** 9 templates approved; Status Page + Slack/Email automations connected.

**Decision Owners:**  
- **Go/No-Go Chair:** Release Manager  
- **Delegates:** Eng Lead, SRE Lead, Security Lead, Product, Support  
- **Approvers for G8:** Support + Comms (manual step)

---

## 1) Go/No-Go Matrix (Snapshot)

| Gate | Name | Thresholds / Evidence | Source of Truth | Owner | State |
|---|---|---|---|---|---|
| **G1** | Infra & Capacity | Clusters healthy; autoscaling policies loaded; error rate ≤0.1% | Prometheus, kube health | SRE | ☐/☑ |
| **G2** | Provenance & Supply Chain | SLSA‑3 attestation present; SBOM scan green | CI/CD, prov-ledger | Sec | ☐/☑ |
| **G3** | Performance | GraphQL p95: read ≤350ms; write ≤700ms; Neo4j 1‑hop ≤300ms; OPA ≤25ms | War Room SLO board | Eng/SRE | ☐/☑ |
| **G4** | Reliability & Rollback | Canary pass @5→25→50→100; auto‑rollback signal tested | `igctl` logs + alerts | SRE | ☐/☑ |
| **G5** | Security Controls | WebAuthn step‑up ≥99% success; OPA policy suite loaded | Auth/OPA dashboards | Sec | ☐/☑ |
| **G6** | Cost Guardrails | Budgets: $18k infra / $5k LLM; adaptive sampling active (60–80% reduction) | FinOps panel | FinOps | ☐/☑ |
| **G7** | DR/BCP | RPO ≤5m, RTO ≤60m rehearsal evidence | DR drill report | SRE | ☐/☑ |
| **G8** | Support & Comms | Templates staged; on‑call tree confirmed; status page dry run | Comms tools | Support+Comms | ☐/☑ |

**Command:** `igctl cutover go-no-go --validate-all`  
**Manual Note:** G8 requires live human approvals in War Room.

---

## 2) Timeline – Run of Show (MDT)

**T‑72h (Sun 09/14 10:00):** Final stage soak complete, defect triage zero‑blockers.  
**T‑24h (Tue 09/16 10:00):** Freeze confirmed; comms “heads‑up” to customers scheduled.  
**T‑4h (Wed 09/17 02:00):** Pre‑flight checklist; DR assets synced; budget monitors reset.  
**T‑60m (03:00):** G1–G7 auto‑validation; G8 pre‑approval stand‑by.  
**T‑0 (04:00):** Go call (recorded); start canary.

**T+0 → T+120m (04:00–06:00): Canary Ladder**
1. **5%** traffic – 10m observe → if green, advance.  
2. **25%** – 15m observe.  
3. **50%** – 20m observe.  
4. **100%** – 30m stabilization.

**T+150m (06:30):** Post‑cutover validation suite; comms “GA live” if green.  
**T+4h (08:00):** Cost/latency spot‑check; support handoff briefing.  
**T+24h (Thu 09/18 04:00):** Health review; finalize postmortem (even if green) & performance regression scan.

---

## 3) War Room Operations
- **Bridge:** #war‑room (Slack) + Zoom + PagerDuty incident **IG‑GA‑S26**.
- **Roster (24×7 until T+24h):**
  - Release Manager (Chair) — decision + timekeeper
  - SRE Lead — traffic, rollback, DR
  - Eng Lead — app metrics, GraphQL/Neo4j
  - Security Lead — OPA/WebAuthn/provenance
  - FinOps — cost guard, adaptive sampling
  - Support Duty + Comms — templates, status page
- **Artifacts:** Runbook, change ticket, on‑call tree, dashboards, `igctl` console recording.

**Escalation ladder:** P0 (pager) → Chair within 2m; Exec notify if rollback is triggered.

---

## 4) Pre‑Flight Checklist (T‑60m)
- [ ] `igctl drill rehearse --env prod --rpo-target 5m --rto-target 60m` (evidence attached)
- [ ] Verify SBOM + SLSA‑3 provenance bundle for release artifacts
- [ ] Prometheus scrape OK; no stale series >5m; alertmanager routes green
- [ ] k6 perf pack baseline parsed; thresholds aligned with SLOs
- [ ] Feature flags config frozen; migration plans reviewed; backout plan loaded
- [ ] Status page: draft incident ready; comms templates filled with tokens
- [ ] Cost guard: budget counters reset; adaptive sampling at initial tier

---

## 5) Cutover Commands (Authoritative)

```bash
# Start canary with auto rollback
igctl cutover execute \
  --strategy canary \
  --stages 5,25,50,100 \
  --auto-rollback

# Validate gates anytime
igctl cutover go-no-go --validate-all

# Emergency rollback (to last prod point)
igctl cutover rollback --to last-stable --confirm

# DR rehearsal (pre-flight or during incident)
igctl drill rehearse --env prod --rpo-target 5m --rto-target 60m
```

**Operator Notes**
- Keep `igctl` in verbose mode with timestamped logs piped to the incident timeline.
- At each stage transition, record SLO snapshot and decision rationale.

---

## 6) Live Monitoring & Auto‑Triggers

### SLO Guardrails
- GraphQL p95 read **≤350ms**, write **≤700ms**
- Neo4j 1‑hop p95 **≤300ms**; OPA decision p95 **≤25ms**
- Error rate **≤0.1%**; availability **≥99.9%**

### Automated Rollback Triggers (any → rollback proposal)
- Error‑budget burn **>6%/hour** sustained **10+ minutes**
- Latency degradation **>30%** sustained **15+ minutes**
- Security policy failure signal or cost spike **>3×** baseline

**Operator Actions:** Acknowledge → 5‑min containment attempt (flags/sampling downshift) → if still breaching, approve rollback.

---

## 7) Cost Guardrails & Downshift Ladder

**Budgets:** Infra **$18k**, LLM **$5k** (GA window). Real‑time monitors in FinOps panel.  
**Ladder (6 tiers):**
1. **Advisory:** notify only; sample at nominal.  
2. **Throttling‑A:** reduce non‑critical batch jobs; LLM cache warm.
3. **Throttling‑B:** tighten query budgets; kill slow queries.
4. **Degrade‑A:** dim advanced analytics; keep core reads fast.
5. **Degrade‑B:** freeze writes for non‑essential paths.
6. **Emergency Mode:** essential endpoints only; autoscale down; comms update.

**Exit Criteria:** three consecutive 5‑min windows within budget + SLOs.

---

## 8) Post‑Cutover Validation (T+150m)
- [ ] API probes green (CRUD, auth flows, provenance write/read)
- [ ] Data migrations verified with row‑count + invariants
- [ ] Graph query benchmarks within thresholds
- [ ] OPA policies audited vs change set; deny logs empty of false positives
- [ ] Cost + adaptive sampling stabilized; tier rollback if safe
- [ ] Synthetic user journey (top 5) passes with ≤1.5s p95 total path
- [ ] Support queues nominal; no surge in error class tags

**Sign‑Off:** Eng Lead, SRE Lead, Security Lead, Product, Support+Comms.

---

## 9) Communications Plan

**Channels:** Status Page, Customer Email, Slack community, CSM 1:1 macros.  
**Templates (ready in tool):**
- **Pre‑cutover heads‑up** (T‑24h)
- **Canary started** (T+0)
- **Full traffic** (T+~60–90m)
- **Incident (degradation)** with ETA and actions
- **Emergency rollback** (if invoked) with next steps
- **GA complete** (T+150m) with release notes

**War‑Room Updates:** 30‑min cadence posts with gate status and SLO snapshot.

---

## 10) Risk Register (Top 10) & Mitigations
1. **Schema migration hot path** → *Mit:* dry‑run + shadow writes; backout script ready.
2. **OPA policy drift** → *Mit:* policy simulation vs historical queries pre‑cutover.
3. **Cache stampede under canary → 50%** → *Mit:* staged priming; rate‑limit.
4. **Unexpected LLM burst** → *Mit:* quota caps + ladder.
5. **Prom scrape gap** → *Mit:* blackbox probes; scrape freshness alert.
6. **WebAuthn step‑up success dips** → *Mit:* fallback flows, feature flag.
7. **Neo4j cluster leader flaps** → *Mit:* pin + readiness gates.
8. **Vendor incident (email/StatusPage)** → *Mit:* alt channels template.
9. **Rollback fails forward** → *Mit:* last‑stable verified + smoke test maintained.
10. **Comms lag** → *Mit:* automation hooks; on‑call acknowledger.

---

## 11) RACI & On‑Call Matrix

| Area | Responsible | Accountable | Consulted | Informed |
|---|---|---|---|---|
| Go/No‑Go | Release Mgr | Product Dir | Eng, SRE, Sec | Exec, CSM |
| Canary Ops | SRE Lead | Release Mgr | Eng Lead | All |
| Security | Sec Lead | CISO | SRE/Eng | All |
| Comms | Comms Mgr | Support Dir | Product | All |
| FinOps | FinOps | CFO Delegate | SRE/Eng | Exec |

**On‑Call Rotations (T‑0 → T+24h):**
- SRE: Primary / Secondary
- Eng: Primary / Secondary
- Security: Primary / Secondary
- Support: Primary / Secondary

---

## 12) Acceptance & Sign‑Off
> By checking the boxes below, we attest the criteria were met during GA cutover on Sept 17, 2025 (MDT).

- [ ] All **G1–G8** gates passed with evidence links.
- [ ] Canary stages completed within thresholds.
- [ ] No unresolved P0/P1 incidents at T+150m.
- [ ] Post‑cutover validation suite passed.
- [ ] Final comms delivered.

**Signatures:**  
Release Mgr ____  Eng Lead ____  SRE Lead ____  Security Lead ____  Product ____  Support ____  Comms ____

---

## 13) Appendices
- **A. Dashboards:** SLO, Error Budget, Cost Guard, Auth/OPA, Neo4j, GraphQL latency
- **B. Evidence Links:** DR drill, k6 reports, provenance/SBOM, gate validator outputs
- **C. Run Commands Cheat‑Sheet:** (laminated card export)
- **D. Troubleshooting Tree:** Symptom → Probable Cause → Action (1‑pager)

**End of Runbook**

