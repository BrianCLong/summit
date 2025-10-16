# IntelGraph Maestro Conductor (MC) — Frontend Sprint 18

**Window:** Dec 8 – Dec 19, 2025 (2 weeks, America/Denver)

---

## Conductor Summary (one‑screen)

**Goal:** Deliver **Pipeline Editor v0** (template‑guided builder + validation + dry‑run “Plan” preview), **Multi‑Region Status & Safe Failover (staging)**, and **Explorer v0.1** upgrades (server‑saved views + basic Merge Approval). Tighten i18n/a11y baseline and keep org SLOs/cost guardrails visible.

**Non‑Goals:** Full realtime co‑edit; arbitrary transform DSL UI; production tenant failover control (staging only this sprint); advanced merge heuristics.

**Assumptions:** All Sprint 12–17 features deployed. Gateway exposes `/pipelines/templates`, `/pipelines/drafts`, `/pipelines/validate`, `/pipelines/plan` (dry‑run), `/region/status`, `/region/failover/simulate` (staging), `/graph/views` (CRUD), `/entities/merge` (approve/deny with audit). OPA `decide` for create/update/approve.

**Constraints:** Org SLOs & budgets: route JS ≤ 200 KB (editor lazy‑loaded), INP ≤ 200 ms p75. Display SLOs: Graph ops 1‑hop p95 ≤ 300 ms, 2–3 hop p95 ≤ 1,200 ms; Ingest targets per defaults. WCAG 2.2 AA.

**Definition of Done:**

- Users can build a pipeline from a template, configure steps, pass validation, preview an execution **Plan** (estimated cost/time + resources), and save as **Draft** or **Publish** if allowed.
- Multi‑Region page shows region health/replica lag/readiness; can run **staging‑only failover simulation** with clear guardrails.
- Explorer saved views persist server‑side; basic **Merge Approval** (approve/deny) updates provenance/audit; capability badges surface OPA reasons.
- CI gates green (axe/Lighthouse/bundlesize), OTel spans added for editor/plan/region ops; release notes drafted.

**Top Risks & Mitigations:**

- **Editor complexity** → template‑driven schema + Zod; per‑step validation; diff/rollback of drafts.
- **Plan calc latency** → debounce, server estimates; show spinner with SLO hints; cache by hash.
- **Failover misuse** → staging‑only flag; confirmation text; read‑only in prod; audit every simulation.

---

## Scope (MoSCoW)

**Must**

1. **Pipeline Editor v0** (template catalog → step config → validate → plan → save draft/publish).
2. **Plan Preview** with estimated duration/cost, resource footprint, and SLO fit.
3. **Server‑saved Explorer Views** (CRUD) + shareable IDs.
4. **Merge Approval (basic)**: approve/deny suggested merges with reason; audit emit.
5. **Multi‑Region Status** (RO) + **Failover Simulation (staging)** with safeguards.
6. **Perf & a11y + i18n baseline** for new routes; route‑level bundlesize gates.

**Should** 7) **Template Import/Export** (JSON) with signature field (RO verify). 8) **Drafts versioning** with diff viewer and rollback.

**Could** 9) **YAML import** → JSON schema transform (beta). 10) **Editor command palette** (search steps/params) and keyboard shortcuts.

---

## Backlog & RACI

**Capacity:** ~22–24 SP. Roles: FE‑Lead, FE‑Eng, QA, SRE, PM. R=Responsible, A=Accountable, C=Consulted, I=Informed.

| ID     | Story (Epic)                                           | MoSCoW | Est | R/A               | C/I         | Deps        |
| ------ | ------------------------------------------------------ | -----: | --: | ----------------- | ----------- | ----------- |
| FE‑701 | **Editor Shell** (lazy route, stepper, templates list) |   Must |   2 | FE‑Lead / FE‑Lead | PM / QA     | —           |
| FE‑702 | **Step Config & Validation** (Zod + per‑step errors)   |   Must |   4 | FE‑Eng / FE‑Lead  | SRE / QA    | FE‑701      |
| FE‑703 | **Plan Preview** (server `/plan`) + SLO/cost hints     |   Must |   3 | FE‑Lead / FE‑Lead | PM,SRE / QA | FE‑702      |
| FE‑704 | **Drafts CRUD** (`/drafts`) + publish (OPA‑gated)      |   Must |   3 | FE‑Eng / FE‑Lead  | PM / QA     | FE‑702      |
| FE‑705 | **Explorer Saved Views (CRUD)** (`/graph/views`)       |   Must |   2 | FE‑Eng / FE‑Lead  | SRE / QA    | —           |
| FE‑706 | **Merge Approval (basic)** (approve/deny + reason)     |   Must |   3 | FE‑Lead / FE‑Lead | PM,SRE / QA | FE‑705      |
| FE‑707 | **Multi‑Region Status** (RO)                           |   Must |   2 | FE‑Eng / FE‑Lead  | SRE / QA    | —           |
| FE‑708 | **Failover Simulation (staging)** + safeguards         |   Must |   3 | FE‑Lead / FE‑Lead | SRE / QA    | FE‑707      |
| FE‑709 | **Perf/a11y + i18n baseline**                          |   Must |   1 | FE‑Lead / FE‑Lead | QA / PM     | FE‑701..708 |
| FE‑710 | **Template Import/Export** (JSON + verify)             | Should |   2 | FE‑Eng / FE‑Lead  | PM / QA     | FE‑701      |
| FE‑711 | **Drafts versioning + diff/rollback**                  | Should |   2 | FE‑Lead / FE‑Lead | PM / QA     | FE‑704      |
| FE‑712 | **YAML import (beta)**                                 |  Could |   1 | FE‑Eng / FE‑Lead  | SRE / QA    | FE‑710      |
| FE‑713 | **Editor command palette**                             |  Could |   1 | FE‑Lead / FE‑Lead | PM / QA     | FE‑701      |

**Planned:** 24 SP (Must=20, Should=4, Could=2; target Must + one Should).

---

## Acceptance Criteria (selected)

**FE‑701/702 Editor & Validation**

- Templates load via `GET /api/maestro/v1/pipelines/templates` (name, version, steps, params). Step forms generated from schema; invalid inputs blocked with inline help.
- Validation runs client‑side (Zod) and server‑side via `POST /api/maestro/v1/pipelines/validate`; both must pass to proceed to Plan.

**FE‑703 Plan Preview**

- `POST /api/maestro/v1/pipelines/plan` with draft config returns `{estDuration, estCost, resources, risks, sloFit}`.
- UI shows SLO/cost hints: green/watch/hot with thresholds; tooltip explains assumptions.
- Cached by config hash; reuses prior result if unchanged.

**FE‑704 Drafts & Publish**

- Drafts: `POST/GET/PATCH /api/maestro/v1/pipelines/drafts`; publish via `POST /api/maestro/v1/pipelines` (OPA allow required).
- Version history retained; diff viewer highlights param & step changes; rollback to any prior version.
- All writes emit audit events `pipeline.draft.updated` / `pipeline.published` with `opa-decision-id` if present.

**FE‑705 Saved Views (Explorer)**

- `GET/POST/PATCH/DELETE /api/maestro/v1/graph/views` for view JSON (layout, filters, selection). Shareable `viewId` links restore state.

**FE‑706 Merge Approval**

- `POST /api/maestro/v1/entities/merge` with {candidates, decision, reason}; OPA decide gates action; audit `entity.merge.decided` emitted.
- UI shows diffs (attributes, edges), risk notes, and requires a reason when approving.

**FE‑707/708 Multi‑Region**

- `GET /api/maestro/v1/region/status` shows primary/replicas, lag, health checks; badges explain SLOs.
- **Failover Simulation** (staging only): `POST /api/maestro/v1/region/failover/simulate` with confirmation text; RO in prod.
- Simulation shows expected RTO/RPO, affected tenants; emits `region.failover.simulated` audit.

**FE‑709 Perf/a11y + i18n**

- Lighthouse mobile: FCP ≤ 1.8s, TTI ≤ 2.5s for Editor shell; INP ≤ 200 ms p75 for step edits.
- axe: zero serious/critical; forms accessible; keyboard shortcuts documented; i18n ids extracted for new strings.

**FE‑710/711 Templates & Versioning**

- Import/Export JSON verified (signature field optional RO verify); error states clear; version diff view shows semantic changes.

---

## Design & ADRs

- **ADR‑039 Template‑Driven Editor:** Templates carry JSON Schema + UI hints; forms autogenerate with overrides; step graph compiled deterministically.
- **ADR‑040 Dual Validation:** Client Zod + server validate; merge errors; surface actionable messages.
- **ADR‑041 Plan Engine Contract:** Stable DTO for estimates; cache by config hash; surface SLO/cost deltas.
- **ADR‑042 Draft Versioning:** Immutable versions; diff/rollback; audit hooks.
- **ADR‑043 Region UI:** Read‑only metrics; simulation only in staging; explicit guardrails and audit.

---

## API Contracts (consumed)

- `GET /api/maestro/v1/pipelines/templates → Template[]`
- `POST /api/maestro/v1/pipelines/validate → ValidationReport`
- `POST /api/maestro/v1/pipelines/plan → PlanEstimate`
- `GET/POST/PATCH /api/maestro/v1/pipelines/drafts → PipelineDraft|PipelineDraft[]`
- `POST /api/maestro/v1/pipelines → Pipeline`
- `GET /api/maestro/v1/graph/views → { items: View[], cursor? }`
- `POST/PATCH/DELETE /api/maestro/v1/graph/views/:id`
- `POST /api/maestro/v1/entities/merge → MergeDecision`
- `GET /api/maestro/v1/region/status → RegionStatus`
- `POST /api/maestro/v1/region/failover/simulate → SimulationReport`

Headers: `Authorization`, `x-tenant-id`, `traceparent`, `x-trace-id`; PQ ids for GETs; `opa-decision-id` echoed where available.

---

## Observability & SLOs (frontend)

- Spans: template load, validation, plan compute, draft save/publish, view CRUD, merge decision, region status/simulate.
- Metrics: plan latency buckets, validation error categories, publish success rate, merge approves/denies, simulation runs.
- Alerts: editor client error > 1%/5m; plan p95 > 1s sustained; INP > 200 ms p75 on editor.

---

## Testing, CI/CD & Budgets

- **Unit:** schema→form mapper, plan request builder, diff viewer, merge review component.
- **Integration:** server validate + client validate merge; plan caching; drafts versioning; OPA deny flows; simulation guard.
- **E2E (Playwright):** build pipeline from template → validate → plan → save draft → publish (allowed/denied); save Explorer view; approve a merge; run staging failover simulation.
- **A11y:** axe across editor/merge/region; form error semantics; listbox/menu patterns.
- **Perf:** Lighthouse budgets; bundlesize gates; INP sampling during step edits.
- **Contracts:** PQ id checks; fixtures for templates/validate/plan/region.

Pipelines gate on: lint, types, unit, integration, e2e smoke, a11y, bundlesize, Lighthouse, contracts.

---

## Rollout & Backout

- Flags: `FEATURE_PIPELINE_EDITOR_V0`, `FEATURE_PLAN_PREVIEW`, `FEATURE_EXPLORER_VIEWS_SERVER`, `FEATURE_MERGE_APPROVAL`, `FEATURE_REGION_STATUS`, `FEATURE_FAILOVER_SIM`.
- Canary 10% tenants; monitor plan latency, publish failures, merge actions, simulation usage.
- Backout: disable publish path (keep drafts), hide simulation, keep views RO; editor remains behind flag.

---

## Demo Script (Sprint Review)

1. Create pipeline from template; show client/server validation; run Plan; explain SLO/cost hints.
2. Save draft; show version diff; publish (allowed), then attempt publish (denied) and show OPA reason.
3. Explorer: open/save a server‑saved view; share link and restore it.
4. Approve a merge with reason; show audit event and provenance link.
5. Multi‑Region: review status; run a **staging** failover simulation with confirmation and show the simulation report.

---

## Definition of Done (DoD)

- Must + at least one Should shipped; CI gates green; SLOs & budgets surfaced; flags/docs updated.
- Release notes `v0.18.0`; sign‑offs: FE‑Lead ✅, QA ✅, SRE ✅, PM ✅.
