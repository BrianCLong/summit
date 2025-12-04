# Sprint 34 Plan — IntelGraph (Apr 27–May 8, 2026)

**Cadence:** 2 weeks • **Timezone:** America/Denver • **Release cut:** May 8, 2026 → staging; **Prod target:** May 13 (pending gates & error‑budget)

---

## Conductor Summary (one‑screen)

**Goal.** Graduate **write‑quorum** from staging to a **limited‑prod pilot** (flagged tenants), finalize **Residency Migrator** for controlled moves, deliver **ER v1.5 (recall lift + conflict review)**, and ship **Explorer 2.2 (share controls + export)**. Prepare the platform for mid‑year compliance by assembling **SOC2 Evidence Pack v2** and running **chaos drills** focused on network partitions. Hold org SLO/cost guardrails.

**Non‑Goals.** Broad GA of active‑active writes; ML ER; public pricing.

**Assumptions.** S33 completed staging quorum pilot, invoice exports, and residency migrator dry‑run.

**Constraints.** Org SLOs & cost guardrails; ABAC/OPA; provenance immutable; feature flags/backout for risky paths.

**Risks.** (R1) Quorum latency spikes in prod; (R2) Residency migrations extend past downtime budget; (R3) ER recall lift increases merges risk; (R4) Chaos drills cause alert fatigue.

**Definition of Done.** All ACs pass; burn < 20%; CI green; Finance & Privacy sign‑offs recorded where applicable; evidence bundle attached.

---

## Scope & Deliverables

1. **Write‑Quorum Limited Prod Pilot**: 2 regions, quorum 2/2, tenant allowlist, sticky sessions, deterministic conflicts, backout < 10 min.
2. **Residency Migrator GA**: guided cutover with pre‑checks, redaction validation, and rollback plan.
3. **ER v1.5 (Recall Lift + Conflict Review)**: expanded blocking, reviewer conflict queue, safe merge/unmerge with audit.
4. **Explorer 2.2**: workspace share controls (scopes/expiry), CSV/PNG export with signatures, annotation diffing.
5. **Chaos & DR**: network partition chaos suite + multi‑region read/write drills; runbooks updated.
6. **SOC2 Evidence Pack v2**: add access reviews, quarterly key‑rotation proof, on‑call drill records, change‑management artifacts.
7. **Cost & SLO Optimizations**: cache normalization, LFUDA tweak, egress compression defaults tuned, quota presets refined.

---

## Sprint Backlog (Epics → Stories → Tasks)

> **MoSCoW** priority • **Pts** = story points

### E1 — Write‑Quorum Limited Prod Pilot (Must) — 18 pts

* **S1. Tenant allowlist + flag controls** (6 pts, *Alice*)
* **S2. Latency guards/HPA + dashboards** (6 pts, *Grace*)
* **S3. Backout drill & docs** (6 pts, *Kay*)

**AC**: For pilot tenants, write p95 ≤ 700 ms / p99 ≤ 1.5 s; read p95 within +15% baseline; conflict rate < 0.5% with resolver; backout < 10 min; no cross‑tenant mix.

---

### E2 — Residency Migrator GA (Must) — 12 pts

* **S1. GA checklist & preflight** (5 pts, *Ivy*)
* **S2. Guided cutover + rollback** (5 pts, *Ivy*)
* **S3. Privacy sign‑off & docs** (2 pts, *Kay*)

**AC**: Dry‑run finds zero PII/tag violations; cutover ≤ 30 min downtime; rollback restores service in ≤ 10 min; Privacy sign‑off recorded.

---

### E3 — ER v1.5 (Recall Lift + Conflict Review) (Must) — 14 pts

* **S1. Expanded blocking & thresholds** (6 pts, *Elena*)
* **S2. Conflict review queue + audit** (5 pts, *Jay*)
* **S3. Safe unmerge/merge rollback** (3 pts, *Elena*)

**AC**: Golden set **recall ≥ 0.935** while **precision ≥ 0.982**; reviewer actions audited; unmerge restores prior graph in < 5 min.

---

### E4 — Explorer 2.2 (Share Controls + Export) (Should) — 10 pts

* **S1. Share scopes/expiry + RBAC** (5 pts, *Jay*)
* **S2. CSV/PNG export + signatures** (3 pts, *Jay*)
* **S3. Annotation diff view** (2 pts, *Jay*)

**AC**: Share links expire/are revocable; exports verified by signature; a11y pass; Playwright smoke green.

---

### E5 — Chaos & DR (Should) — 8 pts

* **S1. Network partition chaos suite** (5 pts, *Grace*)
* **S2. Multi‑region drill + postmortem** (3 pts, *Kay*)

**AC**: Quorum holds under partition scenarios or cleanly fails over; alerts noise ≤ 1 page/24h; postmortem with tickets.

---

### E6 — SOC2 Evidence Pack v2 (Must) — 6 pts

* **S1. Evidence builder extensions** (4 pts, *Kay*)
* **S2. Access review snapshot + key‑rotation proof** (2 pts, *Ivy*)

**AC**: Bundle includes SLO reports, SBOM attestation, access reviews, key‑rotation proof, DR records; hashes recorded.

---

### E7 — Cost & SLO Optimizations (Should) — 6 pts

* **S1. Cache/LFUDA tuning** (3 pts, *Grace*)
* **S2. Egress compression defaults + docs** (3 pts, *Grace*)

**AC**: Cache hit‑rate ≥ 90% hot set; egress reduced ≥ 10% vs. baseline; SLOs maintained.

---

## Capacity & Forecast

* Team capacity ≈ **64 pts**; committed **~64 pts** (scope valve: E4/E7 may slip).

---

## Architecture & Contracts (Delta)

```mermaid
flowchart LR
client[Clients]
subgraph Gateway
  apollo[Apollo]
  ver[API v1.1]
  opa[OPA]
  cache[LFUDA Cache]
end
apollo --> writer[Write Router (Quorum, Flag)] --> neoA[(Neo4j Region A)]
writer --> neoB[(Neo4j Region B)]
writer -->|fallback| neoA
migrator[Residency Migrator GA] --> regions[(Regions)]
er[ER v1.5] --> neoA
explorer[Explorer 2.2] --> apollo
soc2[SOC2 Evidence Builder v2] --> bundle[(Evidence Bundle)]
```

**Quorum Pilot Config (prod)**

```yaml
write_quorum:
  enabled: false # per-tenant flag
  tenants: [TENANT_ALPHA, TENANT_BETA]
  regions: [us-west, us-east]
  quorum: 2
  conflict_resolver: last_write_wins # pilot only
```

**Explorer Export Manifest (PNG/CSV)**

```json
{
  "tenant": "TENANT_ALPHA",
  "workspace_id": "wsp_123",
  "type": "graph_png",
  "sha256": "...",
  "created_at": "2026-05-01T12:00:00Z"
}
```

---

## Security, Privacy & Policy

* ABAC/OPA; mTLS; field‑level encryption; signed exports; reviewer actions audited; Privacy sign‑off for migrations.

---

## Observability & SLOs

* Metrics: write p50/95/99, quorum RTT/conflicts, cache hit‑rate, ER precision/recall, migration duration, error‑budget.
* Alerts: quorum RTT > target, conflict spike, cache miss, migration overrun, budget @80%.

---

## CI/CD & Release

* Gates: lint/type/tests, e2e, perf (quorum), SBOM/CVE, policy sim.
* Canary: per‑tenant flag; backout disables quorum + routes writes to Region A; migrations paused.
* Evidence bundle: SLO report, k6 artifacts, SBOM, policy logs, signed exports, migration evidence.

---

## RACI

* **R**: Story owners • **A**: Tech Lead (Alice) • **C**: Security (Ivy), SRE (Grace), Privacy • **I**: PM, Finance.

---

## Checklists

**Acceptance Pack**

* [ ] All story ACs green
* [ ] SLO dashboards 24h green
* [ ] Perf & e2e gates green
* [ ] SBOM/CVE clear
* [ ] Policy sim passes
* [ ] Finance & Privacy sign‑offs recorded
* [ ] Evidence bundle attached

**Backout Plan**

* Disable quorum per‑tenant flags; force writes to Region A; revert ER thresholds; turn off exports; pause/resume migrator per runbook.
