# Sprint Title

IG Frontend Sprint — “Activities In” (Runbooks + Case Timeline)

# Sprint Window

Sep 15 → Sep 26, 2025 (2 weeks)

# Objective (Commander’s Intent)

Deliver a first-class **Activities** experience that surfaces runbooks, case tasks, executions, and audit events directly in the IntelGraph UI. Analysts can (1) see everything that happened, (2) launch + monitor runbooks from context, and (3) fold outputs into briefs — all with provenance and guardrails.

# Success Criteria (Exit)

- Activities panel live in tri‑pane; p95 load ≤ 1.5s for last 7 days, ≥ 5k events.
- Runbook Catalog + Launcher available from case, graph selection, and command palette.
- Runbook Run view (status, steps, logs, artifacts, provenance) with live updates.
- Task & SLA hooking: create/assign tasks from any runbook step; show 4‑eyes gates where flagged.
- “Add to Brief” action for any artifact/activity with inline citation metadata.
- A11y AA+, keyboard-first; dark/light parity.
- Telemetry + SLO dashboards; screenshot/E2E tests pass; demo script recorded.

---

# Scope (What we are building this sprint)

1. **Activities Panel (Case Timeline)**
   - Dockable panel in tri‑pane; filters by type (Runbook, Task, Comment, Import, Export, Policy, Audit), actor, date, tag.
   - Time‑brush sync with Timeline view; infinite scroll + day jump; quick search.
   - Activity cards: title, actor, time, type icon, tags (case, entities), status chip, and actions (open, add to brief, copy link).

2. **Runbook Catalog & Launcher**
   - Catalog drawer listing available runbooks with badges (domain, risk level, runtime est.).
   - Run context: seed from selection (nodes/edges) or case; preflight sheet shows **Assumptions, Data Scope, Legal Basis, KPIs, XAI notes**; consent/authority checkbox.
   - Primary actions: _Simulate_, _Dry‑run with stubs_, _Execute_ (if authority present).

3. **Runbook Run View**
   - Header: name, run‑id, status, createdBy, authority, case link.
   - Tabs: **Overview** (status, progress bar, inputs/outputs), **Steps** (DAG with per‑step logs + retry), **Artifacts** (tables/maps/graphs allowing “Add to Brief”), **Provenance** (manifest, hashes), **Policy** (reasons/denials, appeal path), **Audit** (who/what/why/when).

4. **Tasks & SLA Integration**
   - Create/assign tasks from any activity/step; due‑by with SLA timer; watchers; @mentions.
   - High‑risk steps require 4‑eyes approval modal with reason capture.

5. **Brief/Report Hooks**
   - “Add to Brief” on any artifact/activity → adds caption + link to verifiable manifest.

6. **Command Palette Actions**
   - `Runbook: Open Catalog`, `Runbook: Launch <name>`, `Activities: Filter …`, `Brief: Add Last Artifact`.

---

# Out of Scope (this sprint)

- New runbook algorithms (use existing library);
- Cross‑tenant deconfliction; federation;
- Mobile/offline kits (stub telemetry only);
- External partner exports beyond existing adapters.

---

# User Stories & Acceptance Criteria

## S1. See case activities quickly

**As** an analyst **I want** a timeline of all case activities **so that** I can grasp current status fast.

- **AC1:** Loading the last 7 days shows within ≤ 1.5s at p95.
- **AC2:** Filter chips: Type, Actor, Tag, Status; combined filtering updates list < 300ms after debounce.
- **AC3:** Clicking a card deep‑links to its detail; back preserves filters/scroll.

## S2. Launch a runbook from context

**As** an analyst **I want** to launch a runbook from selected nodes/edges **so that** inputs are auto‑scoped.

- **AC1:** Catalog shows only runbooks that accept the current selection type; incompatible ones are disabled with rationale tooltip.
- **AC2:** Preflight shows Assumptions, Data Scope, Legal Basis, KPIs, XAI notes; must confirm authority checkbox before _Execute_.
- **AC3:** _Simulate_ produces expected artifacts using stubs/fixtures; _Dry‑run_ exercises DAG without external calls.

## S3. Monitor a runbook run

**As** an analyst **I want** live status, step logs, and artifacts **so that** I can intervene or report.

- **AC1:** Status updates via WS/SSE within ≤ 2s of server event.
- **AC2:** Per‑step retry/skip with reason capture; audit trail records operator, time, reason.
- **AC3:** Artifacts can be previewed (table/map/graph); one‑click “Add to Brief”.

## S4. Tasking & 4‑eyes on risky steps

**As** a lead **I want** to assign tasks with SLAs and require dual‑control where flagged **so that** governance is upheld.

- **AC1:** Create task from any activity; assignee, due date, SLA timer visible in Activities panel.
- **AC2:** Steps marked `risk=high` enforce 4‑eyes approval; denial shows human‑readable policy reason; approval/denial captured in audit.

## S5. Brief integration

**As** a report writer **I want** to add vetted artifacts to my brief **so that** evidence stays cited.

- **AC1:** “Add to Brief” adds figure with caption + link; removing from brief does not delete source artifact.
- **AC2:** Export brief to PDF/HTML succeeds and includes redaction map if present.

## S6. A11y & Performance

- **AC1:** Keyboard traversal for all interactive elements; screen‑reader labels present.
- **AC2:** No layout shift > 0.1 CLS; initial paint ≤ 1.0s on standard demo dataset.

---

# UX Notes (Wireflow)

- **Tri‑pane:** left Nav → center Graph/Map/Timeline → right Activities panel (toggle with `A`).
- **Catalog Drawer:** slides from right over Activities; search, domain filters, badges (CTI/DFIR/AML/HRD/etc.).
- **Run View DAG:** step nodes with status chips; click to expand log pane; top progress bar shows % and ETA.
- **Provenance Tab:** table of exhibits with checksums, source, transform chain; copy manifest.
- **Policy Tab:** banner for denials with reason + appeal path link.

---

# Engineering Plan

## Frontend (React + TS)

- New routes: `/cases/:id/activities`, `/runbooks`, `/runs/:runId`.
- State: `activitiesStore`, `runbooksStore`, `runsStore` (RTK Query or TanStack Query).
- Real‑time: SSE/WS subscription `activities:caseId:*` and `runbookRuns:*`.
- Components:
  - `<ActivitiesPanel />` (filters, list, virtualized scroller, card renderer)
  - `<RunbookCatalogDrawer />`
  - `<RunbookPreflight />`
  - `<RunbookRunView />` with tabs (Overview, Steps, Artifacts, Provenance, Policy, Audit)
  - `<AddToBriefButton />`
  - `<FourEyesModal />`
- Command Palette hooks: actions listed above.
- A11y: focus traps, aria‑labels, roving tab index in lists.

## API / Contracts (GraphQL suggested)

- `type Activity { id, caseId, type, status, actor, occurredAt, tags, payloadPreview, artifactRefs, policyRefs }`
- Queries: `activities(caseId, after?, filter?)`, `runbooks(filter?)`, `runbook(id)`, `runbookRun(id)`
- Mutations: `launchRunbook(input)`, `retryRunStep(runId, stepId)`, `createTask(input)`, `addArtifactToBrief(input)`
- Subscriptions: `activityStream(caseId)`, `runbookRunUpdates(runId)`
- Persisted queries + cost hints; field‑level authz via ABAC labels.

## Telemetry & SLOs

- OTEL spans around Activities fetch, Run launch, Run updates; custom metric `ui.activities.load_ms`.
- Dashboards: p95 Activities load, WS reconnects, run update latency, error rates.

## Test & Fixtures

- Golden fixtures for Activities (5k events/7d), 3 sample runbooks (CTI Rapid Attribution, DFIR Phish Cluster, Crisis Ops) with stub artifacts.
- E2E flows: S1→S5; screenshot diffs for UI; load test virtualized list.

---

# Dependencies & Assumptions

- Agent Runtime exposes `listRunbooks`, `launch`, `getRun`, and emits run events (or mock).
- Brief/Report module accepts artifact payloads + captions and can export PDF/HTML.
- Policy engine returns human‑readable denials with appeal path.

---

# Risks & Mitigations

- **Event flood** → Virtualization + paged history; server cursors.
- **Policy gating confusion** → Always show denial rationale; preflight checklists.
- **Authz drift** → Field‑level authz + defensive rendering (hide vs. disable with reason tooltip).
- **Performance** → Cache window, request coalescing, background prefetch on idle.

---

# Definition of Done (DoD)

- All ACs green in CI;
- A11y audit passes;
- SLO dashboards wired;
- Demo video recorded;
- Docs: developer README, ops runbook, analyst quickstart.

---

# Demo Script (5 minutes)

1. Open a case → Activities shows last week; filter to Runbook + Task; drill into run.
2. Select entities on graph → open Catalog; launch Runbook R1 with preflight consent.
3. Watch live run; open a Step; retry with reason; add artifact to Brief.
4. Show 4‑eyes approval on a high‑risk step; denial shows policy reason.
5. Export Brief to PDF; show provenance manifest and activity deep links.
