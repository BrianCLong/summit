# MC v0.3+ Expansion Plan — +2 Tenants & Tier‑3 Scoped Autonomy Pilot (v2025.09.25)

> Scope: Expand A/A GA from 3 → 5 tenants (with 14‑day green prerequisite) and run a Tier‑3 **scoped** autonomy pilot on **TENANT_001** (read‑only scope + HITL override). Incorporates Day 15–30 artifacts into evidence.

---

## Conductor Summary
**Goal**: Safely scale multi‑region resilience and trial scoped autonomy without breaching SLO/cost/privacy guardrails.  
**Constraints**: Org SLOs & budgets; deny‑by‑default; residency/purpose gates always ON; HITL for export/retention; 14‑day green before expansion.  
**Risks**: Replication skew, conflict spikes, autonomy drift, privacy regressions.  
**Mitigation**: Per‑tenant flags, tripwires, counterfactual sim, compensation, rollback playbooks.

**Definition of Done**  
- +2 tenants (TENANT_004, TENANT_005) at A/A GA with 14 consecutive days green (SLO/cost/privacy).  
- Tier‑3 pilot completes with zero P1s; autonomy success rate ≥ 99.9%; compensation rate ≤ 0.5%; simulation false‑negative ≤ 0.1%.  
- Evidence bundles updated; GA Delta Report appended; QI catalog v1 frozen & referenced.

---

## A) A/A Expansion (+2 Tenants)

### A.1 Tenant Readiness Checklist
- Traffic profile & SLO baseline; residency tags verified.  
- Data volume & hot‑key cache plan; query budgets set.  
- DR drill schedule enrolled (monthly JSON).  
- Persisted‑only compliance ≥ 99.9%.

### A.2 Rollout Plan (per tenant)
1. **Stage** 24h bake with k6 + chaos in staging; attach artifacts.
2. **Canary** 20% (8h) → 50% (8h) → 100% (24h soak).  
3. **Validation**: replication lag ≤1m; conflict ≤0.05%; RPO≤5m, RTO≤30m; privacy violations=0; budget ≤80%.  
4. **Evidence**: append to `dist/evidence-v0.3.x-mc.json` with tenant section.

### A.3 Tripwires (auto‑actions)
- Error‑budget <60% (tenant): pause rollout.  
- Replication lag >60s for 10m: bias GLB to healthy region.  
- Conflict rate >0.1% or non‑persisted >0.1%: rollback tenant to A/P.  
- Residency violation: immediate rollback + page DPO.

### A.4 Backout (per tenant)
- GLB bias to single region; disable TTL auto‑tune; keep persisted‑only; replay idempotent ops; preserve provenance logs.

---

## B) Tier‑3 Scoped Autonomy Pilot (TENANT_001)

### B.1 Scope & Controls
- **Scope**: read‑only derived entity updates (e.g., cache/materialized views) — *no export/retention/cross‑tenant*.  
- **Controls**: counterfactual simulation (shadow env) + approval token; HITL override required; compensation available; audit evidence on every enactment.

### B.2 Acceptance & KPIs
- Autonomy success rate ≥ 99.9%; compensation ≤ 0.5%.  
- Simulation false‑negative rate ≤ 0.1%.  
- No SLO regressions; cost within budget; zero privacy incidents.

### B.3 Pilot Runbook
```bash
# Enable pilot flags (TENANT_001)
mc autonomy set --tenant TENANT_001 --tier T3 --scope read-only --require-hitl true
# Pre-enactment simulation
mc autonomy simulate --tenant TENANT_001 --op-set derived_updates --evidence out/sim.json
# Enact with approval
mc autonomy enact --tenant TENANT_001 --approval-token $TOKEN --from-sim out/sim.json --evidence out/enact.json
# Compensation (if tripwire hits)
mc autonomy compensate --tenant TENANT_001 --from-evidence out/enact.json
```

### B.4 Tripwires
- Error‑budget burn fast(2%/1h) or slow(10%/6h) → halt autonomy, switch to read‑only.  
- Anomaly in risk score or residency denial → auto‑abort enactment.

### B.5 Backout
- `mc autonomy set --tenant TENANT_001 --tier T2` (downgrade).  
- Disable enactments; keep simulator for analysis.

---

## C) Evidence Integration
- **GA Delta Report** `ga-delta-report-v0.3.json` linked in release notes.  
- **QI Catalog v1** YAML/JSON attached; status **FROZEN v1.0.0** (90‑day review).  
- **DR Drill Schedule** JSON referenced by runbooks and calendar.  
- **Privacy Dashboard Tiles** JSON imported to Grafana (internal admin only).

---

## D) RACI
| Workstream | R | A | C | I |
|---|---|---|---|---|
| A/A Expansion | SRE | MC | Platform Sec, Data | PM |
| Tier‑3 Pilot | MC | CTO | Platform Sec, API | PM |
| Privacy & QI Governance | DPO | MC | Platform Sec, Data | PM |
| Evidence & Dashboards | DevEx | MC | SRE, Sec | PM |

---

## E) Timeline & Milestones
- Week 0: Readiness gates; flags prepared; evidence integration.  
- Weeks 1–2: Wave‑A tenant (TENANT_004) rollout & soak.  
- Weeks 3–4: Wave‑B tenant (TENANT_005) rollout & soak.  
- Weeks 1–4: TENANT_001 autonomy pilot (weekly review).  
- Week 5: Decision — expand autonomy pilot or hold; publish evidence bundle `v0.3.1‑mc`.
