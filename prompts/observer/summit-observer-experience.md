# Summit Observer Experience (Jules Prompt)

You are Jules operating on BrianCLong/summit. Your mission is SUMMIT OBSERVER EXPERIENCE: design and wire an opinionated end-to-end workflow for IntelGraph / OSINT operators so that a first-time analyst can (1) stand up Summit in a sandbox, (2) run a structured investigation, and (3) export a shareable brief, without needing to read general dev docs.

HARD CONSTRAINTS

- No net-new ML models or heavy infra; reuse existing IntelGraph, OSINT, and Maestro capabilities.
- No changes to GA/stabilization/risk policies except adding links / operator-facing surfaces.
- Prefer small, composable scripts and markdown over new UI code unless strictly necessary.
- Treat “Observer” as non-developer: no yarn/pnpm, no code editing.

OBJECTIVE
Deliver a cohesive “Observer Golden Path” made of:

1. A single operator entrypoint doc.
2. A minimal IntelGraph investigation template + sample scenario.
3. A one-click (or one-command) sandbox launch + teardown path.
4. A structured “investigation brief” export flow.

SCOPE ANCHORS
Focus on:

- intelgraph/, competitive/, cognitive-\* modules as the core investigation engine.
- Existing Maestro / orchestration pieces for pipelines (.maestro/, .orchestrator/).
- Existing RUNBOOKS, docs/ARCHITECTURE.md, and GA runbooks only as link targets.

PHASE 1 — Observer entrypoint

1. Create docs/observer/OBSERVER_GOLDEN_PATH.md aimed at:
   - OSINT / intel analysts, risk teams, investigative journalists.
   - Non-developer users with Docker but no repo familiarity.

   The doc must include:
   - “Who this is for” and “What you can do in 60–90 minutes”.
   - “Single command / click” startup:
     - Prefer: `make observer-up` (see Phase 2) or a documented Docker Compose command.
   - Step-by-step flow:
     1. Start Summit in observer mode.
     2. Open IntelGraph UI / primary endpoints (exact URLs).
     3. Load or select a scenario (sample dataset + questions).
     4. Run 1–2 guided investigations.
     5. Export a brief and where it lands on disk.

PHASE 2 — Observer sandbox commands 2) Under compose/ or make targets, add an “observer” profile if not already present:

- E.g. compose/observer/ with:
  - core services only: frontend, backend, graph, timeseries, Maestro workers required for IntelGraph and OSINT pipelines.
  - no heavy or risky integrations (real external connectors off by default).

3. Add Make targets:
   - `make observer-up`
   - `make observer-down`
   - `make observer-smoke`

   Behavior:
   - observer-up: bring up only observer profile services and print:
     - Frontend URL.
     - IntelGraph / graph endpoints.
   - observer-smoke: run a minimal “can I query a graph and see results?” check; fail fast with remediation hints.

PHASE 3 — IntelGraph investigation template 4) Create docs/observer/INTELGRAPH_INVESTIGATION_TEMPLATE.md with:

- Sections an analyst can literally copy:
  - Context & Objective.
  - Hypotheses.
  - Key entities & relationships of interest.
  - Data sources used (internal vs external).
  - Queries run (with example IntelGraph / GraphQL snippets).
  - Findings & confidence.
  - Follow-ups / monitoring.

5. Add at least one concrete scenario file:
   - e.g. docs/observer/scenarios/SCENARIO_competitive_landscape_example.md
   - Contains:
     - A short narrative (“You are analyzing Company X’s influence graph in Sector Y…”).
     - Exact steps:
       - Which Summit UI view to open.
       - Which preset queries or panels to run.
       - Where sample data lives (GOLDEN/datasets or fixtures).
       - How to copy query output into the investigation template.

PHASE 4 — Investigation brief export 6) Implement a small helper under scripts/observer/:

- scripts/observer/export_brief.mjs that:
  - Ingests a filled-in investigation markdown (local path).
  - Optionally enriches it with:
    - timestamps.
    - dataset identifiers / Git SHA.
    - links to underlying queries (if recorded).
  - Emits a normalized brief under:
    - artifacts/observer/briefs/BRIEF*<slug>*<timestamp>.md
    - plus a JSON manifest with metadata.

7. Optionally, if safe and simple:
   - Add a “Export brief” button/wiring in an existing UI panel that:
     - Serializes a minimal JSON with:
       - selected entities.
       - query parameters.
       - tags/labels.
     - Writes to a location the export_brief.mjs script can pick up.
   - If UI changes are non-trivial, document this as FUTURE WORK instead of implementing.

PHASE 5 — Observer UX polish & guardrails 8) Add an “Observer mode” call-out to:

- README “Quickstart (Golden Path)” section:
  - Short bullet: “For analysts / observers, see docs/observer/OBSERVER_GOLDEN_PATH.md”.
- docs/ARCHITECTURE.md:
  - Brief section explaining what an “Observer” deployment is (reduced-surface, read-mostly, analysis-first).

9. Ensure:
   - Observer mode runs with:
     - No write access to production-like external systems by default.
     - Dummy connectors or local fixture data for demos.
   - Any non-local data plane integrations are opt-in and documented clearly.

PHASE 6 — Validation 10) Dry-run the observer path: - Using only OBSERVER_GOLDEN_PATH.md + scenario doc: - Bring up observer environment. - Execute the scenario. - Produce an investigation brief artifact. - Capture friction points; if they require code or doc tweaks, apply the smallest fix.

DELIVERABLES

- docs/observer/OBSERVER_GOLDEN_PATH.md
- docs/observer/INTELGRAPH_INVESTIGATION_TEMPLATE.md
- docs/observer/scenarios/SCENARIO\_\*.md (at least one concrete example)
- compose/observer/ (or equivalent) + Make targets:
  - make observer-up / observer-down / observer-smoke
- scripts/observer/export_brief.mjs
- artifacts/observer/briefs/\* (sample / fixture)
- README and docs/ARCHITECTURE.md call-outs for Observer mode
- PR: branch `jules/summit-observer-experience-<timestamp>` with:
  - evidence of an end-to-end observer dry-run (commands + paths to produced brief).

STOP CONDITION

- Stop once:
  - A non-developer analyst can:
    - Follow OBSERVER_GOLDEN_PATH.md from a clean clone.
    - Start observer mode.
    - Run at least one IntelGraph scenario.
    - Produce a BRIEF\_\* artifact that captures findings in a structured, reusable format,
  - without needing to open generic dev docs or touch code.
