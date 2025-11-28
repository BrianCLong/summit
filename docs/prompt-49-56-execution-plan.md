# Prompts #49–#56: Execution Playbook to Reach "Clean & Green" Code

## Scope & Reality Check
The requested scope (full services, UIs, miners, notebooks, archives, notification hub, design system, capacity planner, and integrity guard) is larger than can be shipped in a single change. This playbook codifies how to reach fully operational, merge-ready code across all tracks while keeping feature flags off until each vertical meets its Definition of Done.

- **Feature flags:** `MOTIF_MINER_ENABLED`, `CDFE_ENABLED`, `CSJH_ENABLED`, `SNS_ENABLED`, `NHAI_ENABLED`, `IG_DS_ENABLED`, `WSCP_ENABLED`, `GICG_ENABLED` remain default-off until each track clears tests, perf, and reviewer/dual-control gates.
- **DB + event isolation:** No cross-service DB access; only typed events/GraphQL contracts. Services have independent migrations and seeds under `services/*/db`.
- **Read-only prod paths:** Graph access is snapshot-pinned and read-only; outputs avoid PII and use hashed receipts/manifests.
- **Perf bars:** Reads p95 ≤1.5s; prompt-specific SLAs (kickoff ≤400ms for mining, enqueue→deliver ≤300ms for notify, hydration p95 ≤3s for 95th percentile subgraphs) enforced in CI.
- **Tests as gates:** Unit + contract + Playwright E2E required per track; k6 perf where specified; golden fixtures for deterministic miners/notebooks/violations.

## Workstream Execution Packets
Each packet lists code locations, primary dependencies, CI gates, and rollout steps required to convert the blueprint into committed, mergeable code.

### #49 Motif Miner & Pattern Bank (MM/PB)
- **Code layout:**
  - Miner: `ai/motif-miner/` (Python 3.12, PyTorch, NetworkX) with temporal sampler, gSpan/GRAM-style miner, significance tests, explainers (instance paths + strengths).
  - Pattern Bank: `services/pattern-bank/` (Node/TS + Postgres) with CRUD, versioning, approvals; events `pattern.published|deprecated`.
  - UI: `client/apps/motif-miner/` (React + Cytoscape, jQuery overlays) for discover → inspect → promote with prevalence sparklines.
- **Determinism:** Seeded sampling; golden motif fixtures in `ai/motif-miner/tests/fixtures`.
- **CI gates:** Python unit + significance tests; Jest/contract for Pattern Bank; Playwright mine→inspect→promote; queue kickoff p95 ≤400ms with progress events.
- **Rollout:** Seed fixtures → API contracts → event schemas → UI wiring → perf guardrails → preview → canary → flag on per-tenant.

### #50 Consent, DSAR & FOIA Engine (CDFE)
- **Code layout:**
  - Service: `services/consent-dsar/` (Node/TS + Postgres) with consent ledger, DSAR/FOIA workflows, due-date SLAs, scope calculators, immutable audit, dual-control denials; events `dsar.opened|fulfilled|denied`.
  - UI: `client/apps/consent-dsar/` with request queue, scope preview, progress tracker, jQuery inline redaction previews.
- **Constraints:** Legal basis via LAC (#4); no fulfilment without redaction receipts (hash-only).
- **CI gates:** SLA timer Jest; golden receipt fixtures; Playwright request→scope→export→verify; lint/format.
- **Tuning defaults:** Jurisdictions preload GDPR/CCPA/FOIA; SLAs DSAR 30d, FOIA 20 business days, urgent appeals 10.

### #51 Cold Store & JIT Hydration (CSJH)
- **Code layout:** `services/cold-store/` (Node/TS) with Parquet packer, delta manifests, hydration API; object store client; Postgres index; UI under `client/apps/cold-store/` for archive/hydrate/cost estimator.
- **Constraints:** Append-only manifests; encrypted via KMS (#27); residency via SRP (#42); no PII in logs.
- **CI gates:** Manifest consistency (hydrated == snapshot) tests; k6 hydration benchmarks; Playwright archive→hydrate→verify.
- **Tuning defaults:** Archive at ≥90 days inactivity or ≥500MB snapshot; hydration SLA p95 ≤3s for 95th percentile subgraph.

### #52 Sandboxed Notebook Studio (SNS)
- **Code layout:**
  - UI: `apps/web/notebook-studio/` (React 18 + jQuery controls) with code/markdown cells, citation widgets, snapshot attach.
  - Runner: `services/notebook-runner/` (Python 3.12 + Celery containers first; Pyodide later) with restricted libs, time/memory caps, signed outputs, event `notebook.result.signed`.
  - Exporters: PDF/HTML with provenance map.
- **Constraints:** Network-off by default; explicit allow-list; no secrets; read-only to prod; outputs include citation map.
- **CI gates:** Coverage ≥95%; sandbox escape tests; seeded deterministic runs; Playwright author→run→export; lint/format.
- **Allow-list v1:** numpy, pandas, matplotlib, networkx, scipy, scikit-learn, tqdm.

### #53 Notifications Hub & Analyst Inbox (NHAI)
- **Code layout:** `services/notify-hub/` (Node/TS + Redis Streams) with routing rules, digests, quiet hours, adapters (email/webhook/Tray); UI `client/apps/notify-hub/` with triage, assign, mute, SLA badges, keyboard/bulk actions (jQuery overlays).
- **Constraints:** LAC filter pre-fan-out; no payload PII in delivery metadata; rate/volume caps per tenant; backpressure with Cost Guard (#6).
- **CI gates:** Delivery accuracy + digest grouping Jest; Playwright multi-client triage; enqueue→deliver p95 ≤300ms; lint/format.
- **Defaults:** Digest cadence hourly; quiet hours 22:00–06:00 local; P0–P3 map to Critical/High/Medium/Low.

### #54 IntelGraph Design System & Component Kit (IG-DS)
- **Code layout:** `apps/ig-ds/` with tokens (color/type/spacing/motion), components (Panels, Tooltips, DataGrid, Toasts), patterns (Provenance Tooltip, Command Palette); Storybook + visual regression; MUI compatibility layer; jQuery utilities for DOM micro-interactions; ESLint/Stylelint configs.
- **Constraints:** Tree-shakable; no CSS globals; keyboard-first focus rings; RTL/I18N hooks; versioned releases with changelog/migration notes.
- **CI gates:** Storybook image snapshots; axe a11y; bundle size budgets; Playwright kitchen sink; lint/format.
- **Priority:** Panels, DataGrid, Tooltips, Toasts, Provenance Tooltip, Command Palette; lock brand-neutral color + spacing tokens first.

### #55 Workload Simulator & Capacity Planner (WSCP)
- **Code layout:** `ops/wscp/` (Go or Node) with scenario DSL, replay using synthetic traces (#21), persisted queries (#15/#26), subscription patterns (#46); outputs Terraform/HPA hints; dashboards for projected p95/99, saturation, cost curves; weekly CI job opening issues on projected SLO regression.
- **Constraints:** Read-only to prod; anonymized trace shapes only; advisory outputs only.
- **CI gates:** Accuracy vs past periods; drift alarms; weekly CI automation; lint/format; preview + canary.
- **Defaults:** Planning horizons 30/90/180 days; autoscaling policies target CPU and RPS per pool first.

### #56 Graph Integrity & Contradiction Guard (GICG)
- **Code layout:** `services/integrity-guard/` (Node/TS) with invariant rule packs (identity uniqueness, temporal sanity, required acyclicity, mutually exclusive claims); contradiction detectors; UI integrity meter with drill-down and jQuery overlays for in-place fixes (merge/split/annotate); events `integrity.violation|resolved`; hooks to DQ Dashboards (#16) and Rules (#28).
- **Constraints:** Read-only except fix suggestions; full audit on suppress/override; no auto-edits without approval.
- **CI gates:** Fixture violation corpus; false-positive bounds; Playwright detect→review→resolve; lint/format.
- **Defaults:** Enforce identity uniqueness, temporal ordering (no future-dated claims), acyclicity for designated relationships, mutually exclusive claims; suppressions by Leads/Admins with dual-control.

## Unified Delivery Checklist
1. Stand up branch per track (table above), scaffold service/UI directories, and add feature flag guards.
2. Land schema contracts (GraphQL/REST), event schemas, and migrations for each service with golden fixtures.
3. Implement core logic + validation + audit; wire metrics + progress events; enforce PII scrubbing.
4. Build UIs with React + jQuery glue; add Cytoscape for motif UI, Storybook for IG-DS, and required overlays.
5. Add tests: unit + contract + golden fixtures; Playwright per track; k6 where specified; coverage thresholds enforced in CI.
6. Add perf + SLA monitors (kickoff, enqueue→deliver, hydration) with alerting and auto-rollback hooks.
7. Run preview deploys per branch; execute smoke (lint/unit) on PR open; full E2E + perf on merge to branch; promote to canary after green.
8. Perform reviewer or dual-control approvals where required; only then flip feature flag on a per-tenant basis.

## Next Actions to Begin Coding
- Generate scaffolds for each service/UI under the listed paths with feature-flag guards.
- Check in golden fixtures (motifs, receipts, violation corpus, seeded notebooks) to make tests deterministic.
- Wire CI jobs: lint/format, unit + contract, Playwright suites, k6 jobs for CSJH/NHAI, bundle-size/a11y for IG-DS, weekly WSCP run that files issues on drift/SLO risk.
- Add perf budgets to `turbo.json`/package scripts; ensure gates fail on SLA regressions.

This plan is designed to keep subsequent code changes mergeable, deterministic, and fully audited while the actual implementations are delivered incrementally behind feature flags.
