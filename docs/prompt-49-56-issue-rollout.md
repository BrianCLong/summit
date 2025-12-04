# Prompts #49–#56: End-to-End Issue & Branch Rollout Blueprint

This blueprint turns prompts #49–#56 into merge-ready issues, branches, and CI guardrails. Each track is feature-flagged, event-coupled (no shared DBs), pinned to deterministic fixtures, and staged for preview + canary with auto-rollback. Use this as the single source of truth when opening issues, creating branches, and configuring CI pipelines.

## Global Release Principles (applies to #49–#56)
- **Feature flags only:** All code paths behind their respective `*_ENABLED` flag; default off in prod until sign-off.
- **Event-coupled, DB-isolated:** Services interact via typed events/GraphQL only; no cross-service DB reads/writes.
- **Snapshot-pinned inputs:** Read-only graph snapshots; deterministic seeds for miners/simulators/sandboxes.
- **No PII anywhere:** Exports, delivery metadata, logs, and manifests scrub PII; receipts/hashes only.
- **Preview + canary:** Every branch deploys a preview; canary with auto-rollback gated on green tests + SLAs.
- **Performance guardrails:** Target p95 ≤1.5s for reads plus prompt-specific SLAs (queue kickoff/delivery/hydration).
- **Audit & provenance:** Provenance notes, reviewer or dual-control where specified; immutable audit trails.
- **Tests as gates:** Unit + contract + Playwright E2E required; k6 where specified; golden fixtures for determinism.

## Issue & Branch Scaffolding Table
| Prompt | Issue Title | Branch | Feature Flag | CI / Gates (must-pass) |
| --- | --- | --- | --- | --- |
| #49 — Motif Miner & Pattern Bank (MM/PB) | `[MM/PB] Unsupervised motif miner with pattern promotion` | `feat/motif-miner/pattern-bank` | `MOTIF_MINER_ENABLED` | Jest miners + significance; golden motif fixtures; seed determinism; Playwright mine→inspect→promote; queue kickoff p95 ≤400ms emitting progress events. |
| #50 — Consent, DSAR & FOIA Engine (CDFE) | `[CDFE] Consent ledger + DSAR/FOIA workflows` | `feat/consent-dsar/workflows` | `CDFE_ENABLED` | SLA timers + dual-control Jest; golden receipt/hash fixtures; Playwright request→scope→export→verify; block fulfilment without LAC + redaction receipts. |
| #51 — Cold Store & JIT Hydration (CSJH) | `[CSJH] Cold archive + hydration service` | `feat/cold-store/hydration` | `CSJH_ENABLED` | k6 hydration benchmarks; manifest consistency (hydrated == snapshot); Playwright archive→hydrate→verify; enforce KMS + residency; append-only manifests. |
| #52 — Sandboxed Notebook Studio (SNS) | `[SNS] Read-only sandboxed notebook studio` | `feat/notebook-studio/sandbox` | `SNS_ENABLED` | Coverage ≥95%; sandbox escape tests; seeded deterministic runs; Playwright author→run→export; network-off by default; signed outputs with citation map. |
| #53 — Notifications Hub & Analyst Inbox (NHAI) | `[NHAI] Notifications hub with analyst inbox` | `feat/notify-hub/inbox` | `NHAI_ENABLED` | Delivery accuracy + digest grouping Jest; rate/volume caps; Playwright multi-client triage; LAC filter before fan-out; enqueue→deliver p95 ≤300ms. |
| #54 — IntelGraph Design System & Component Kit (IG-DS) | `[IG-DS] Design system components + Storybook` | `feat/ig-ds/component-kit` | `IG_DS_ENABLED` | Storybook image snapshots; axe a11y; bundle size budgets; Playwright kitchen sink; enforce tree-shaking, no CSS globals, AAA focus, RTL/I18N hooks. |
| #55 — Workload Simulator & Capacity Planner (WSCP) | `[WSCP] Workload simulator and capacity planner` | `feat/wscp/capacity-planner` | `WSCP_ENABLED` | Accuracy vs past periods; drift alarms; weekly CI auto-issue on SLO regression; Terraform/HPA hints only; anonymized traces. |
| #56 — Graph Integrity & Contradiction Guard (GICG) | `[GICG] Invariant + contradiction guardrails` | `feat/integrity-guard/rules` | `GICG_ENABLED` | Fixture violation corpus; false-positive bounds; Playwright detect→review→resolve; audit suppress/override; read-only except fix suggestions. |

## Deep-Dive Rollout Playbooks
Each subsection lists the actionable implementation, observability, and QA flow to reach production behind the feature flag.

### #49 Motif Miner & Pattern Bank (MM/PB)
- **Entry:** Branch from `main` → `feat/motif-miner/pattern-bank`; gate releases behind `MOTIF_MINER_ENABLED`.
- **Build scope:** Temporal subgraph samplers; gSpan/GRAM-style miners with significance tests; instance explainers (path + strength); Node/TS Pattern Bank CRUD/versioning with `pattern.published|deprecated` events; React + Cytoscape discover→inspect→promote UI with prevalence sparklines.
- **Data constraints:** Read-only graph snapshots; no prod writes; no PII in exports; provenance notes + reviewer sign-off required for promotion.
- **Observability:** Progress events on mining jobs; queue kickoff p95 ≤400ms; emit counts per motif + confidence; alert on determinism drift (seed mismatch).
- **CI/QA:** Jest for miners + significance; golden motif fixtures; deterministic seeds; Playwright mine→inspect→promote; contract tests for Pattern Bank API; lint/format gates; preview deploy + canary.
- **Tuning defaults:** Min support = 3, confidence = 0.6; cap motifs to 6 nodes / 8 edges for v1.

### #50 Consent, DSAR & FOIA Engine (CDFE)
- **Entry:** Branch `feat/consent-dsar/workflows`; flag `CDFE_ENABLED` default off.
- **Build scope:** Consent ledger; DSAR/FOIA workflows with due-date SLAs; scope calculators; immutable audit; dual-control on denials; `dsar.opened|fulfilled|denied` events; inline redaction previews (jQuery) and export integrators (Brief/Disclosure #13/#7, Redact/DP #20).
- **Guardrails:** Legal basis checked via LAC (#4); no fulfilment without redaction receipts; no PII in receipts (hashes only).
- **Observability:** SLA timers with alerts; audit trail immutability checks; export receipts with hashes; queue metrics per jurisdiction.
- **CI/QA:** Jest SLA + dual-control tests; golden receipt fixtures; Playwright request→scope→export→verify; lint/format; preview + canary.
- **Tuning defaults:** Preload GDPR, CCPA, FOIA (US federal); SLAs: DSAR 30d, FOIA 20 business days, urgent appeals 10.

### #51 Cold Store & JIT Hydration (CSJH)
- **Entry:** Branch `feat/cold-store/hydration`; flag `CSJH_ENABLED`.
- **Build scope:** Node/TS service with Parquet packer and delta manifests; hydration API for subgraph shards; cache hints to Subgraph Cache (#23); UI for archive flow, hydration progress, cost estimator; events `archive.created|hydrated`.
- **Guardrails:** KMS encryption (#27); residency via SRP (#42); append-only manifests; no PII in logs; hydration reversible via manifests.
- **Observability:** Consistency checks (hydrated == snapshot); throughput dashboards; cost estimates surfaced in UI; hydration SLA targets per shard.
- **CI/QA:** k6 hydration benchmarks; Jest manifest/consistency tests; Playwright archive→hydrate→verify; lint/format; preview + canary.
- **Tuning defaults:** Archive cases inactive 90 days or ≥500MB snapshot; hydration SLA p95 ≤3s for 95th-percentile subgraph.

### #52 Sandboxed Notebook Studio (SNS)
- **Entry:** Branch `feat/notebook-studio/sandbox`; flag `SNS_ENABLED`.
- **Build scope:** React + jQuery notebook UI (code/markdown cells, citation widgets, attach snapshot); Python runner (Celery containers first, Pyodide later) with restricted libs; time/memory caps; signed outputs with citation map; event `notebook.result.signed`; export to PDF/HTML with provenance.
- **Guardrails:** Network-off by default with explicit allow-list; no secrets; snapshot pins; read-only to prod; outputs include citation map.
- **Observability:** Determinism checks on seeds; resource cap metrics; sandbox escape alarms; provenance signing logs.
- **CI/QA:** Coverage ≥95%; sandbox escape tests; deterministic seeded runs; Playwright author→run→export; lint/format; preview + canary.
- **Tuning defaults:** Prefer container runners first; allow-list numpy, pandas, matplotlib, networkx, scipy, scikit-learn, tqdm.

### #53 Notifications Hub & Analyst Inbox (NHAI)
- **Entry:** Branch `feat/notify-hub/inbox`; flag `NHAI_ENABLED`.
- **Build scope:** Node/TS service on Redis Streams; routing rules, digests, quiet hours; adapters (email/webhook/Tray); Inbox UI with triage, assign, mute, SLA badges, keyboard/bulk actions (jQuery); events `notify.delivered|failed|muted`.
- **Guardrails:** LAC filter before fan-out; no payload PII in delivery metadata; rate/volume caps per tenant; backpressure with Cost Guard (#6).
- **Observability:** p95 enqueue→deliver ≤300ms; digest grouping accuracy; delivery success/failure metrics; mute/snooze audit.
- **CI/QA:** Jest delivery accuracy + digest grouping + cap tests; Playwright multi-client triage; lint/format; preview + canary.
- **Tuning defaults:** Digest cadence hourly; quiet hours 22:00–06:00 local; priority taxonomy P0–P3 mapped to Critical/High/Medium/Low.

### #54 IntelGraph Design System & Component Kit (IG-DS)
- **Entry:** Branch `feat/ig-ds/component-kit`; flag `IG_DS_ENABLED`.
- **Build scope:** Tokens (color/type/spacing/motion), components (Panels, Tooltips, DataGrid, Toasts), patterns (Provenance Tooltip, Command Palette); Storybook with visual regression; MUI compatibility layer; jQuery utilities for DOM micro-interactions; ESLint/Stylelint configs; theming (light/dark/high-contrast).
- **Guardrails:** No CSS leaks/globals; tree-shakable bundles; keyboard-first focus rings; RTL/I18N hooks; versioned releases with changelog + migration notes.
- **Observability:** Bundle size budgets; accessibility score tracking; Storybook snapshot drift alerts; theme coverage reports.
- **CI/QA:** Storybook image snapshots; axe a11y tests; bundle size checks; Playwright kitchen-sink; lint/format; preview + canary.
- **Tuning defaults:** Prioritize Panels, DataGrid, Tooltips, Toasts, Provenance Tooltip, Command Palette; lock brand-neutral color + spacing tokens first.

### #55 Workload Simulator & Capacity Planner (WSCP)
- **Entry:** Branch `feat/wscp/capacity-planner`; flag `WSCP_ENABLED`.
- **Build scope:** Scenario DSL; replay against preview envs using synthetic traces (#21), persisted queries (#15/#26), subscription patterns (#46); bottleneck reports; Terraform/HPA hints output only; dashboards for projected p95/99, saturation, cost curves; weekly CI job opening issues on SLO regressions.
- **Guardrails:** Read-only to prod; anonymized trace shapes only; advisory outputs—no automatic changes.
- **Observability:** Drift alarms vs real past periods; planning horizon metrics; cost vs performance charts; regression issue attachments.
- **CI/QA:** Accuracy tests vs past periods; drift alarms; weekly CI auto-issue; lint/format; preview + canary.
- **Tuning defaults:** Planning horizons 30/90/180 days; target autoscaling on CPU and RPS per pool first.

### #56 Graph Integrity & Contradiction Guard (GICG)
- **Entry:** Branch `feat/integrity-guard/rules`; flag `GICG_ENABLED`.
- **Build scope:** Node/TS invariant rule packs (identity uniqueness, temporal sanity, required acyclicity, mutually exclusive claims); contradiction detectors; integrity meter UI with drill-down and jQuery overlays for in-place fixes (merge/split/annotate); events `integrity.violation|resolved`; hooks to DQ Dashboards (#16) + Rules (#28).
- **Guardrails:** Read-only aside from emitting fix suggestions; full audit on suppressions/overrides; no auto-edits without approval.
- **Observability:** Violation counts + “integrity debt”; false-positive rate bounds; suppression audits; SLA on detection pipelines.
- **CI/QA:** Fixture violation corpus; FP bound tests; Playwright detect→review→resolve; lint/format; preview + canary.
- **Tuning defaults:** Enforce identity uniqueness; temporal ordering (no future-dated claims); required acyclicity for designated relationship types; mutually exclusive claim detection; suppression by Leads/Admins with dual-control.

## Cross-Track Operating Cadence
- **Weekly:** Rehearse Playwright suites for all tracks in a shared nightly; rotate k6 hydration + enqueue/delivery/perf probes.
- **Preview smoke:** On PR open, run lint + unit + contract + golden fixtures; on merge to branch, run full Playwright + k6 (where applicable) + bundle size/a11y (IG-DS).
- **Release checklist:** Feature flag default off → preview ✅ → canary with SLA monitors ✅ → reviewer/dual-control approvals → flag on per-tenant.
- **Rollback plan:** Auto-rollback on SLA breach or determinism drift; keep manifests/snapshots for reversibility.
