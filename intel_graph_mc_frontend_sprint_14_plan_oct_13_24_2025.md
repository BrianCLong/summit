# IntelGraph Maestro Conductor (MC) — Frontend Sprint 14

**Window:** Oct 13 – Oct 24, 2025 (2 weeks, America/Denver)

---

## Conductor Summary (one‑screen)

**Goal:** Round out the Control Hub with an **Incidents & SLO Detail** flow, ship **Admin Feature Flags (write + audit)**, roll **Persisted Queries + SW caching** across key reads, and add a fast **Command Palette / Global Search**. Harden a11y/perf and finalize evidence viewer for offline validation.

**Non‑Goals:** Full pipeline editor; multi‑region residency controls; air‑gapped installer UI; custom dashboards.

**Assumptions:** Sprint 12/13 shipped (auth, hub, SLO panel, run detail, run graph, streaming logs, evidence v0.2, OPA badges). Gateway provides `/incidents/:id`, `/slo/:id`, `/slo/alerts`, `/flags` (RW), `/search` (typeahead), persisted query ids.

**Constraints:** Org SLOs & cost guardrails; route JS ≤ 200 KB for core; ancillary features lazy‑load; WCAG 2.2 AA; INP ≤ 200 ms p75 on interactive views.

**Definition of Done:**

- Users can find incidents via Command Palette, open **Incident Detail**, see timeline, related runs, and SLO impact. SLO Detail shows burn history, thresholds, and alert rules (read/update if permitted).
- Admin Feature Flags screen supports toggle with audit stub/events and OPA‑aware capability gating.
- Apollo persisted queries enabled across summary/runs/slo/incidents; Service Worker (SW) caches reads for fast repeat and offline **Evidence Viewer** works on saved JSON.
- CI gates (axe, Lighthouse, bundlesize) pass; telemetry spans emitted for search, flag writes, and SW cache hits.

**Top Risks & Mitigations:**

- **Search latency under load** → debounce, cache, cancel inflight; SW cache hot terms.
- **Flags mis‑toggle** → confirm dialog + optimistic UI rollback + audit event with reason.
- **Offline viewer confusion** → clear offline/online banner; checksum verify prior to display.

---

## Scope (MoSCoW)

**Must**

1. **Incident Detail** page: timeline (events, runs, changes), related artifacts, evidence links.
2. **SLO Detail** with burn history, target thresholds, alert rules view/edit (if allowed).
3. **Admin Feature Flags** (RW): list, search, toggle, reason, audit log emission.
4. **Persisted Queries rollout** to summary/runs/slo/incidents + HTTP ETag; SW caching (SWR) for those reads.
5. **Command Palette / Global Search** (⌘/Ctrl‑K) for runs/incidents/tenants/routes.
6. **Perf & a11y hardening**: INP improvements, focus order, reduced motion.

**Should** 7) **Saved filters** for Runs & Incidents with shareable deep links. 8) **Evidence Viewer (offline)**: client‑only page that loads a local evidence JSON v0.2 and verifies hashes.

**Could** 9) **High‑contrast theme** + density tokens. 10) **Announcements/Rollout banner** fed from feature flags metadata.

---

## Backlog & RACI

**Capacity:** ~22–24 SP. Roles: FE‑Lead, FE‑Eng, QA, SRE, PM. R=Responsible, A=Accountable, C=Consulted, I=Informed.

| ID     | Story (Epic)                                                    | MoSCoW | Est | R/A               | C/I         | Deps       |
| ------ | --------------------------------------------------------------- | -----: | --: | ----------------- | ----------- | ---------- |
| FE‑301 | **Incident Detail** view with timeline + related runs/artifacts |   Must |   5 | FE‑Lead / FE‑Lead | PM,SRE / QA | FE‑207     |
| FE‑302 | **SLO Detail + Alerts** (view/edit if allowed)                  |   Must |   4 | FE‑Eng / FE‑Lead  | SRE / QA    | FE‑106     |
| FE‑303 | **Admin Feature Flags (RW)** + audit event emission             |   Must |   4 | FE‑Eng / FE‑Lead  | PM,SRE / QA | FE‑209     |
| FE‑304 | **Persisted Queries + SW cache** (summary/runs/slo/incidents)   |   Must |   4 | FE‑Lead / FE‑Lead | SRE / QA    | FE‑208     |
| FE‑305 | **Command Palette / Global Search** with typeahead              |   Must |   3 | FE‑Eng / FE‑Lead  | PM / QA     | FE‑101/102 |
| FE‑306 | **Perf & a11y hardening** (INP, focus, motion)                  |   Must |   2 | FE‑Lead / FE‑Lead | QA / PM     | —          |
| FE‑307 | **Saved filters + deep links** (Runs/Incidents)                 | Should |   2 | FE‑Eng / FE‑Lead  | PM / QA     | FE‑102     |
| FE‑308 | **Offline Evidence Viewer** (standalone route)                  | Should |   3 | FE‑Eng / FE‑Lead  | SRE / QA    | FE‑204     |
| FE‑309 | **High‑contrast + density** tokens                              |  Could |   1 | FE‑Eng / FE‑Lead  | QA / PM     | FE‑110     |
| FE‑310 | **Announcements banner**                                        |  Could |   1 | FE‑Eng / FE‑Lead  | PM / QA     | FE‑209     |

**Planned:** 24 SP (Must=22, Should=5, Could=2; aim to ship Must + one Should).

---

## Acceptance Criteria (selected)

**FE‑301 Incident Detail**

- `GET /api/maestro/v1/incidents/:id` returns {id, status, startedAt, resolvedAt?, events[], relatedRuns[], impactedSlo[]}. Timeline virtualized; keyboard navigable; ESC closes panels.
- Related run click opens run detail; evidence links open viewer.

**FE‑302 SLO Detail + Alerts**

- `GET /api/maestro/v1/slo/:id` + `/slo/:id/history`; show burn %, error budget, targets; incidents markers.
- If `allow(update_slo_alerts)` from OPA, enable edit: thresholds, channels (RW to `/slo/:id/alerts`).

**FE‑303 Feature Flags (RW)**

- Lists flags with search; toggle shows confirm modal with reason text.
- `PATCH /api/maestro/v1/flags/:id` on confirm; optimistic update with rollback on failure.
- Emits `audit.flag.updated` event payload; shows OPA reason if denied.

**FE‑304 Persisted Queries + SW cache**

- All reads use PQ ids; 304 respected with ETag; SW intercepts and caches; SWR layer refreshes in background.
- Telemetry records cache hit/miss; offline mode banner shown when network absent.

**FE‑305 Command Palette**

- Opens on ⌘/Ctrl‑K; supports runs/incidents/tenants/routes; keyboard only operation; recent items.
- Uses `GET /api/maestro/v1/search?q=` with cancelable requests; debounced.

**FE‑308 Offline Evidence Viewer**

- Load local `evidence-run-*.json`; verify file integrity fields; present attestations and signatures; no network calls.

**FE‑306 Perf/A11y**

- INP ≤ 200 ms p75 on Incident & SLO pages; LCP ≤ 2.5s on mobile.
- axe: zero serious/critical issues; visible focus; reduced motion honored.

---

## Design & ADRs

- **ADR‑018 Incident Modeling UI:** Timeline virtualization; group by phase; lazy related fetch.
- **ADR‑019 Alerts Editing:** Form state with Zod schema; optimistic RW gated by OPA; undo on error.
- **ADR‑020 PQ + SW Caching:** Apollo link chain ordering (persisted → ETag → retry); Workbox for runtime caching; SWR surface.
- **ADR‑021 Command Palette:** Local MRU + server search; cancel tokens; accessible listbox pattern.
- **ADR‑022 Offline Evidence Viewer:** Pure client route; JSON schema v0.2 validate; checksum pre‑verify.

---

## API Contracts (consumed)

- `GET /api/maestro/v1/incidents/:id → Incident`
- `GET /api/maestro/v1/slo/:id → Slo`
- `GET /api/maestro/v1/slo/:id/history → SloPoint[]`
- `GET /api/maestro/v1/slo/:id/alerts → AlertRule[]`
- `PATCH /api/maestro/v1/slo/:id/alerts → AlertRule[]`
- `GET /api/maestro/v1/search?q= → SearchResult[]`
- `GET /api/maestro/v1/flags → Flag[]`, `PATCH /api/maestro/v1/flags/:id → Flag`

Headers: `Authorization`, `x-tenant-id`, `traceparent`, `x-trace-id`; OPA decision endpoint as in Sprint 13.

---

## Observability & SLOs (frontend)

- Spans: search request/resolve, SW cache hit/miss, flags toggle path, alerts update.
- Web vitals (FCP, LCP, CLS, INP) monitored; alert if INP degrades > 20% vs baseline.
- Custom metrics: palette opens, search cancels, offline viewer loads, audit events sent.

---

## Testing, CI/CD & Budgets

- **Unit:** alerts form schema, PQ link, SW cache utils, palette hook.
- **Integration:** SW caching under offline; search cancellation; flags optimistic rollback.
- **E2E (Playwright):** open incident, edit alert (allowed/denied), toggle flag (confirm/rollback), palette nav, offline evidence viewer.
- **A11y:** axe on Incident & SLO; listbox semantics; contrast tests including high‑contrast theme.
- **Perf:** Lighthouse CI budgets; INP sampling; bundlesize route gates.
- **Contracts:** mock server for new endpoints; PQ id checks.

Pipelines gate on: lint, types, unit, integration, e2e smoke, a11y, bundlesize, Lighthouse, contracts.

---

## Rollout & Backout

- Flags: `FEATURE_INCIDENT_DETAIL`, `FEATURE_SLO_DETAIL`, `FEATURE_FLAGS_RW`, `FEATURE_SW_CACHE`, `FEATURE_COMMAND_PALETTE`, `FEATURE_EVIDENCE_VIEWER_OFFLINE`.
- Canary 10%; monitor INP, search latencies, flag errors, offline cache hit‑rate.
- Backout: disable features; keep read‑only flags; remove SW caching via versioned SW; incident links fall back to basic view.

---

## Demo Script (Sprint Review)

1. Use ⌘/Ctrl‑K to find an incident; open Incident Detail; walk timeline and related runs.
2. Open SLO Detail; show burn history and edit an alert; demonstrate OPA deny path with explanation.
3. Toggle a feature flag with reason; show audit stub payload in console/OTel.
4. Repeat a summary/runs load to show PQ + SW cache speedup; simulate offline and open Evidence Viewer with a local JSON.

---

## Definition of Done (DoD)

- Must + at least one Should complete; all CI gates green; SLOs/budgets met.
- Release notes `v0.14.0`; flags & docs updated; sign‑offs: FE‑Lead ✅, QA ✅, SRE ✅, PM ✅.
