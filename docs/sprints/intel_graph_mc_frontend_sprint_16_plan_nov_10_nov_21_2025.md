# IntelGraph Maestro Conductor (MC) — Frontend Sprint 16

**Window:** Nov 10 – Nov 21, 2025 (2 weeks, America/Denver)

---

## Conductor Summary (one‑screen)

**Goal:** Ship **Graph Explorer v0** (entity search + 1–3 hop paths), a **Privacy & Retention Console**, and a read‑only **Black‑Cell Bundle Importer** for offline provenance review—while maintaining org SLOs and budgets, and adding in‑product Help/Docs. This builds on Sprints 12–15 (Control Hub, SLOs, runs/graph/logs, evidence v0.2, incidents, admin/audit, usage, notifications, SW caching).

**Non‑Goals:** Full pipeline editor; custom analytics workbench; multi‑region DR controls (UI is read‑only this sprint); deep entity‑merge automation (review only).

**Assumptions:** Gateway exposes `/graph/search`, `/graph/neighbors`, `/graph/path`, `/policy/entities/:id`, `/policy/tags`, `/privacy/rtbf`, `/bundles/import/validate` (local validation library usable in browser). Persisted Query (PQ) ids for GETs; OPA `decide` available for tag edits/RTBF initiation.

**Constraints:** Org SLOs & cost guardrails enforced. Graph ops: **1‑hop p95 ≤ 300 ms**, **2–3 hop p95 ≤ 1,200 ms** with result caps + pagination. Initial route JS ≤ 200 KB; graph module lazy‑loaded. WCAG 2.2 AA; INP ≤ 200 ms p75.

**Definition of Done:**

- Users can search entities, expand 1‑hop neighbors, run constrained 2–3 hop path finds, and save/share a view. Latency hints surface SLO compliance.
- Privacy & Retention Console shows purpose tags, retention tier, license/TOS class; users with permission can update tags/tiers; initiate RTBF request.
- Black‑Cell Importer loads a local **evidence/provenance bundle** (no network), verifies hashes/signatures, and renders an annotated summary.
- In‑product Help/Docs overlay (⌘/Ctrl‑/) includes keyboard shortcuts and deep links.
- CI gates pass (axe, Lighthouse, bundlesize), OTel spans/logs added, feature flags documented.

**Top Risks & Mitigations:**

- **Large subgraphs** → node/edge capping, level‑of‑detail, virtual lists, server paging.
- **Path queries over‑broad** → guard with predicates + hop/time limits, show estimate pre‑run.
- **Policy edits confusion** → explicit capability badges + confirm modals + audit emit + undo.

---

## Scope (MoSCoW)

**Must**

1. **Graph Explorer v0**: entity search, 1‑hop expand, 2–3 hop path finder with filters.
2. **SLO surfacing** in Explorer: latency hints + warning banners when exceeding graph SLOs.
3. **Privacy & Retention Console**: view/edit purpose tags, retention tier, license/TOS class (OPA‑gated).
4. **RTBF initiation** flow (create request, show status read‑only).
5. **Black‑Cell Bundle Importer (RO)**: open local bundle, verify, render summary.
6. **Help/Docs overlay** with shortcuts and contextual links.
7. **Perf & a11y budgets** extended to Explorer & Privacy views.

**Should** 8) **Entity Merge Review Queue (RO)**: list suggested merges with diffs; approve path stub only. 9) **Saved & Shareable Graph Views** (persist/restore layout & filters); export PNG/SVG/JSON.

**Could** 10) **Multi‑Region Status widget** (RO): region, replica lag hints in header. 11) **Guided tutorial** for Explorer (coach marks; reduced motion respected).

---

## Backlog & RACI

**Capacity:** ~22–24 SP. Roles: FE‑Lead, FE‑Eng, QA, SRE, PM. R=Responsible, A=Accountable, C=Consulted, I=Informed.

| ID     | Story (Epic)                                     | MoSCoW | Est | R/A               | C/I      | Deps        |
| ------ | ------------------------------------------------ | -----: | --: | ----------------- | -------- | ----------- |
| FE‑501 | **Explorer shell** (route, lazy load, skeletons) |   Must |   2 | FE‑Lead / FE‑Lead | QA / PM  | —           |
| FE‑502 | **Entity search + 1‑hop neighbors** with paging  |   Must |   4 | FE‑Eng / FE‑Lead  | SRE / QA | FE‑501      |
| FE‑503 | **2–3 hop path finder** with predicates & caps   |   Must |   4 | FE‑Lead / FE‑Lead | SRE / QA | FE‑502      |
| FE‑504 | **SLO hints** (p95 surfacing, warnings)          |   Must |   2 | FE‑Eng / FE‑Lead  | PM / QA  | FE‑502/503  |
| FE‑505 | **Privacy & Retention Console** (RO)             |   Must |   3 | FE‑Eng / FE‑Lead  | PM / QA  | —           |
| FE‑506 | **Tag/Tier edit** (OPA‑gated) + audit emit       |   Must |   2 | FE‑Lead / FE‑Lead | SRE / QA | FE‑505      |
| FE‑507 | **RTBF initiation** + status RO                  |   Must |   2 | FE‑Eng / FE‑Lead  | PM / QA  | FE‑506      |
| FE‑508 | **Black‑Cell Importer (RO)**: verify & render    |   Must |   3 | FE‑Eng / FE‑Lead  | SRE / QA | —           |
| FE‑509 | **Help/Docs overlay** (⌘/Ctrl‑/)                 |   Must |   1 | FE‑Lead / FE‑Lead | PM / QA  | —           |
| FE‑510 | **Perf & a11y budgets** for Explorer/Privacy     |   Must |   1 | FE‑Lead / FE‑Lead | QA / PM  | FE‑501..509 |
| FE‑511 | **Merge Review Queue (RO)**                      | Should |   2 | FE‑Eng / FE‑Lead  | PM / QA  | —           |
| FE‑512 | **Saved graph views + export**                   | Should |   3 | FE‑Lead / FE‑Lead | QA / PM  | FE‑503      |
| FE‑513 | **Multi‑Region widget**                          |  Could |   1 | FE‑Eng / FE‑Lead  | SRE / QA | —           |
| FE‑514 | **Explorer tutorial**                            |  Could |   1 | FE‑Lead / FE‑Lead | PM / QA  | FE‑501      |

**Planned:** 24 SP (Must=20, Should=5, Could=2; target Must + one Should).

---

## Acceptance Criteria (selected)

**FE‑502 Search + 1‑hop**

- `GET /api/maestro/v1/graph/search?q=&type=&limit=&cursor` returns entities with type, id, labels; keyboard nav; empty state.
- `POST /api/maestro/v1/graph/neighbors` with {id, direction, types?, limit, cursor}; results virtualized; show fetch time and hint vs 300 ms SLO.

**FE‑503 Path finder (2–3 hops)**

- `POST /api/maestro/v1/graph/path` with {from, to, maxHops≤3, filters, limit}; show estimate and cap; render path with level‑of‑detail styles.
- p95 for executed query displayed; warn if > 1,200 ms; link to troubleshooting docs.

**FE‑504 SLO hints**

- Latency badge (Good/Watch/Hot) based on thresholds; tooltip explains SLOs and tips to narrow queries.

**FE‑505/506 Privacy & Retention**

- `GET /api/maestro/v1/policy/entities/:id` shows purpose tags, retention tier (ephemeral‑7d, short‑30d, standard‑365d, long‑1825d, legal‑hold), license/TOS class.
- Edit flow: OPA `decide` → confirm modal with diff; `PATCH /policy/entities/:id` updates; audit `policy.entity.updated` emitted; undo on failure.

**FE‑507 RTBF**

- `POST /api/maestro/v1/privacy/rtbf` with subject reference; show request id/status; RO list of requests with filters.

**FE‑508 Black‑Cell Importer (RO)**

- Loads local bundle (`.json`/`.tar.gz` manifest); verifies hashes/signature using embedded lib; shows summary (runs, artifacts, decisions, signatures, mismatches).
- No network calls; clear offline banner; export verification report JSON.

**FE‑512 Saved Views & Export**

- Persist layout/filters in server or local (flag‑controlled); shareable link with id; export PNG/SVG of current canvas and JSON of nodes/edges.

**FE‑510 Perf/A11y**

- Lighthouse mobile: FCP ≤ 1.8s, TTI ≤ 2.5s on Explorer; INP ≤ 200 ms p75 on expand/filter.
- axe: zero serious/critical; keyboard traversal across graph list and side panels; reduced motion honored.

---

## Design & ADRs

- **ADR‑028 Explorer Data Contract:** Thin DTOs; server‑side pagination; cap nodes/edges; deterministic ids.
- **ADR‑029 Path Queries:** Guardrails: maxHops=3, limit default 200 edges; server estimates before run; user prompts on exceeding caps.
- **ADR‑030 LOD & Virtualization:** Level‑of‑detail styles; virtualized lists; offscreen render deferral; Web Worker for layout (elkjs) when path result > 200 nodes.
- **ADR‑031 Privacy UI:** Purpose/retention editing with Zod schema; OPA‑gated writes; explicit audit trail.
- **ADR‑032 Black‑Cell Import:** Client‑only verifier; immutable provenance ledger fields displayed; report export.
- **ADR‑033 Help Overlay:** MDX‑backed docs with searchable index; keyboard shortcut ⌘/Ctrl‑/; focuses trap and escape.

---

## API Contracts (consumed)

- `GET /api/maestro/v1/graph/search → SearchResult[]`
- `POST /api/maestro/v1/graph/neighbors → { nodes: Node[], edges: Edge[], cursor? }`
- `POST /api/maestro/v1/graph/path → { nodes: Node[], edges: Edge[], stats }`
- `GET /api/maestro/v1/policy/entities/:id → PolicyEntity`
- `PATCH /api/maestro/v1/policy/entities/:id → PolicyEntity`
- `POST /api/maestro/v1/privacy/rtbf → RtbfRequest`
- `GET /api/maestro/v1/privacy/rtbf?cursor → { items: RtbfRequest[], cursor? }`
- `POST /api/maestro/v1/bundles/import/validate → ValidationReport` (or client‑side lib)

Headers: `Authorization`, `x-tenant-id`, `traceparent`, `x-trace-id`; persisted query ids for GETs; `opa-decision-id` echoed for audit correlation.

---

## Observability & SLOs (frontend)

- Spans: search, neighbors, path compute, render; privacy edit; RTBF create; bundle verify.
- Metrics: graph latency buckets, cap hits, path query aborts, saved‑view opens, verification failures.
- Alerts: Explorer client error rate > 1%/5m; path p95 > 1.2s sustained; INP > 200 ms p75.

---

## Testing, CI/CD & Budgets

- **Unit:** mappers, path request builder, privacy edit schema, bundle verifier adapter.
- **Integration:** neighbors paging, path limits, OPA deny flows, offline bundle verify.
- **E2E (Playwright):** search → expand → path; edit retention (allow/deny); create RTBF; import bundle; save/share view.
- **A11y:** axe on Explorer/Privacy; focus management; listbox/tree patterns.
- **Perf:** Lighthouse budgets; INP sampling; bundlesize route gates; worker offload under load.
- **Contracts:** PQ id checks; mock fixtures for graph/policy/privacy.

Pipelines gate on: lint, types, unit, integration, e2e smoke, a11y, bundlesize, Lighthouse, contracts.

---

## Rollout & Backout

- Flags: `FEATURE_EXPLORER_V0`, `FEATURE_POLICY_CONSOLE`, `FEATURE_RTFB_INIT`, `FEATURE_BLACKCELL_IMPORT`, `FEATURE_HELP_OVERLAY`.
- Canary 10% tenants; monitor graph p95s, policy write denials, RTBF creations, bundle verify failures.
- Backout: disable Explorer path/expand, keep search RO; hide policy edits; keep Privacy console RO; remove importer route.

---

## Demo Script (Sprint Review)

1. Search → expand 1‑hop → run a 3‑hop path with filters; show SLO badges and latency.
2. Open Privacy & Retention; update purpose tags and retention tier (allowed) then show a denied edit with OPA reason; initiate RTBF.
3. Import a Black‑Cell bundle; show verification result and export the report.
4. Save current graph view; share and reopen; export SVG.
5. Quick Help/Docs overlay with keyboard shortcuts and links to SLO explanations.

---

## Definition of Done (DoD)

- Must + at least one Should shipped; gates green; SLOs/budgets met; flags and docs updated.
- Release notes `v0.16.0`; screenshots for docs; sign‑offs: FE‑Lead ✅, QA ✅, SRE ✅, PM ✅.
