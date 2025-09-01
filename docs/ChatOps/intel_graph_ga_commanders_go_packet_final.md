# IntelGraph GA — Commander’s GO Packet (Final)

> Author: J. Robert LeMay (Cmdr., Launch Authority)
> Date: 2025‑08‑24 (America/Denver)

---

## 0) Executive GO Order
**ORDER:** Proceed to **General Availability** immediately. All preconditions met. Authority to execute vested in **Brian Long** and the **Multi‑Service Architecture Team**. Command hierarchy and abort criteria below are binding. Deviations require **two‑person approval** (IC + Counsel) and written rationale.

**Change posture:** **Code Freeze (critical‑fix only)** from T‑0 to T+72h. Feature flags allowed for **downshifts only** (no net‑new exposure).

---

## 1) Command & Control
- **Incident Commander (IC):** \_\_\_\_\_ (rotates every 8h)
- **Deputy IC:** \_\_\_\_\_
- **SRE Lead:** \_\_\_\_\_
- **Security Lead:** \_\_\_\_\_
- **AI/Graph Lead:** \_\_\_\_\_
- **Platform/Infra Lead:** \_\_\_\_\_
- **Product/UX Lead:** \_\_\_\_\_
- **Legal/Compliance (on‑call):** \_\_\_\_\_
- **Forensics Officer:** \_\_\_\_\_
- **Comms Lead (internal/external):** \_\_\_\_\_

**War‑Room:**
- **Primary Bridge:** \_\_\_\_\_
- **Backup Bridge:** \_\_\_\_\_
- **Primary Comms Channel:** \_\_\_\_\_
- **Status Cadence:** Hourly at T+1h→T+12h; every 3h to T+48h; 2× daily T+2→T+7.

---

## 2) Launch Checklist — Day 0 (Sign as completed)
- [ ] **mTLS matrix green** across all 20+ services (cert chain + rotation rehearsal verified)
- [ ] **AdminSec/IAM**: OIDC/JWKS live; step‑up auth; SCIM sync health; break‑glass tested
- [ ] **Policy Engine**: 2000+ rules loaded; cache warm; shadow‑diff vs. last 7d traffic clean
- [ ] **Observability**: OTEL traces flowing; SLO dashboards populated; golden queries pinned
- [ ] **GraphAI**: embeddings ≤10s; LP AUC ≥0.85 on gold set; explainability panels visible
- [ ] **ER**: auto‑accept threshold locked; REVIEW queue staffed; override logging on
- [ ] **Export/Prov‑Ledger**: signed bundle → external verifier passes; hash chain intact
- [ ] **Data License Registry**: enforcement ON; blocked‑export reasons readable; appeal path live
- [ ] **DR/Backups**: PITR checkpoints recent; cross‑region replica current; restore drill hash
- [ ] **Comms**: launch notice sent (audience/roles/timeboxes); status page updated

---

## 3) Golden Signals & SLO Guardrails
> **Hold the line. If any trip, execute the playbooks and consider rollback at the decision points below.**

**Availability**
- Core APIs (Gateway, GraphQL, Worker, Policy): **≥99.9%** rolling 1h
- Web Console p95 TTFB: **<300 ms**

**Latency (p95)**
- AuthN/AuthZ round‑trip: **<250 ms**
- Graph query (3‑hop, 50k nodes neighborhood): **<1.5 s**
- ER candidate lookup: **<750 ms**
- Export signing: **<2.0 s**

**Error Budgets (1h)**
- 5xx on Core APIs: **<0.3%**
- 403/Policy denials attributed to rule regressions: **<0.5%** of authorized attempts

**Security & Integrity**
- P0 vulns: **0**
- Prov‑ledger write failures: **0** (any non‑zero is an **instant hold**)

**Cost/Load**
- Worker queue age: **<60 s** median; **<5 min** p95
- Query budgeter: tenant hits **<1%** emergency downshift events/hour

---

## 4) Abort & Rollback Criteria (Hard Gates)
Trigger **HOLD** immediately and escalate to IC + Counsel if **any** of the following sustain beyond the dwell time:

1) **Availability <99.5% for ≥30 min** across ≥2 core services.  
2) **Gateway p95 >2.0 s for ≥15 min** with no exogenous incident.  
3) **AuthZ regression**: policy engine miss or cache corruption causes **>1% 403 spikes** on previously allowed calls for ≥10 min.  
4) **Data integrity threat**: prov‑ledger write loss, manifest hash mismatch, or unverifiable export (**any event = HOLD**).  
5) **Security breach**: confirmed exploit or data exfiltration attempt with partial success (**instant rollback window opens**).  
6) **Legal non‑compliance signal**: license/TOS engine bypass or jurisdiction routing failure affecting real data.

**Rollback Window:** 30‑minute engineered window at T+0→T+6h (dark deploy assets staged). **Roll forward** only with two‑person approval after risk analysis captured.

---

## 5) Day‑0→Day‑7 Operations Timeline
**T+0h** — GO live.  
**T+1h** — Full **smoke suite** (below).  
**T+6h** — Cross‑vertical workflow validation + policy shadow‑diff report.  
**T+24h** — Burn‑in review; SLO budget check; user feedback sample.  
**T+48h** — Success criteria review; cost guard posture tuning.  
**T+7d** — Stability validation; freeze lifts upon sign‑off; retrospective scheduled.

---

## 6) Smoke Tests (E2E, scripted)
- **Auth Path:** login→step‑up→privileged action→audit record check
- **mTLS Handshake Matrix:** service↔service pairs, staged cert rotation rehearsal
- **Ingest→Resolve:** sample OSINT/FinIntel/Cyber datasets → ER (≥10 auto‑accepts) → REVIEW queue
- **Graph Analytics:** embeddings train ≤10s; LP predicts ≥50 edges; communities ≥6; anomalies ≥20 LOF flags
- **Explainability:** feature importances + ≤3 meta‑paths returned and visible in UI
- **Drift Dashboard:** inject JSD>0.1 sample; alert surfaces on board
- **Export:** create Graph AI Bundle; manifest verifies with external tool
- **Policy Guardrails:** attempt blocked action; human‑readable reason + appeal path shown

---

## 7) Residual Risk Register (Top 10) & Mitigations
1. **mTLS rotation edge cases** → Staged rotation plan; dual‑CA grace; pre‑cutover canary.
2. **Policy engine latency under rule bursts** → Warm caches; shadow eval; degrade to allow‑list for critical paths with audit.
3. **ER false merges post‑GA** → Tighten auto‑accept thresholds; nightly drift audit; reversible merges enforced.
4. **Graph store saturation during peak LP/overlay** → Query budgets; cost estimator; kill‑switch for pathological queries.
5. **Connector license misconfiguration** → License registry hard‑enforced; export blockers; counsel standby on overrides.
6. **Secrets rotation lockout** → Break‑glass accounts, time‑boxed; WebAuthn recovery keys escrowed.
7. **Jurisdiction/data‑residency drift** → Policy tags on write; route validators; region‑pinned storage checks.
8. **Prompt‑injection/model abuse** → Guardrail monitor; quarantine prompts; red‑team log review daily.
9. **Telemetry poisoning/noise** → Sensor sanity filters; quarantine; outlier windows tuned.
10. **UI perf regressions** → Perf budgets; auto‑rollback on regress; lighthouse/TTFI alarms.

---

## 8) Communications Plan
- **Internal:** T‑0 GO bulletin (scope, freeze, contacts, dashboards). Hourly updates first 12h, then per cadence.
- **External (customers/partners):** GA announcement at T+2h; status page live; change log with security notes.
- **Regulatory/Legal:** pre‑brief Counsel; store compliance artifacts; notify on any policy override.

---

## 9) Evidence & Audit Capture
- Immutable audit on all admin and policy changes; **reason‑for‑access** prompts ON.
- Capture **SLO reports**, **policy shadow‑diffs**, **export manifests**, **incident timelines**, **red‑team prompts**.
- Store in **Disclosure Packager** with signed manifests; hash tree anchored per policy.

---

## 10) Post‑Launch Success Metrics (D+7, D+30)
- **Availability:** ≥99.95% multi‑service (7d); ≥99.97% (30d)
- **User Satisfaction:** ≥85% first‑month CSAT
- **Ops Automation:** ≥80% automated remediation hit rate maintained
- **Compliance:** 0 critical findings; appeals SLA ≤5 business days
- **Unit Cost:** ≤ baseline −12% sustained

---

## 11) Exception & Change Policy (T‑0 → T+72h)
- **Allowed:** downshifts, feature flag OFF, config risk reductions
- **Denied:** net‑new features, schema changes, non‑urgent infra swaps
- **Process:** raise RFC in war‑room; IC + Counsel co‑sign; attach rollback and blast radius

---

## 12) Sign‑Offs
**GO Confirmed By:**
- Brian Long — Final Authority  
- Intelligence Teams — DRI  
- Security Team — DRI  
- SRE Team — DRI  
- AI/ML Team — DRI  
- Legal Counsel — DRI  
- Product Team — DRI  
- Platform Team — DRI  

*Sign and date below. Attach artifacts to Disclosure Packager.*

---

## 13) Appendices (fill in)
- Dashboard URLs / Saved views
- On‑call schedule (rotations)
- Runbook links (incident classes, cost guard, policy simulation, purge)
- Sample datasets and gold tests references

— End of GO Packet —

