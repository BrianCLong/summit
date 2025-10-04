# Product Requirements Document (PRD) Pack — Wave 2
Scope: Full PRDs for the next tranche of capabilities targeting Predictive/Strategic analytics, workflow/reporting, offline/edge, governance, and deep interoperability.

Included PRDs (12):
1) IG‑ANL‑C6 — Strategic Intelligence & Predictive Suite (Forecast/Causal/Counterfactual)
2) IG‑ANL‑C2 — Pattern Miner (Temporal Motifs, Co‑Travel, Structuring)
3) IG‑ANL‑C4 — Hypothesis Workbench (CH/COI)
4) IG‑COL‑E2 — Brief/Report Studio (Timeline/Map/Graph composition)
5) IG‑OPS‑H2 — Cost Guard & Archived Tiering
6) IG‑OPS‑H4 — Offline/Edge Kits & CRDT Sync
7) IG‑OPS‑H5 — Admin Studio (Schema, Health, Retries, Feature Flags)
8) IG‑INT‑G1 — STIX/TAXII, MISP, OpenCTI Interop
9) IG‑INT‑G3 — Productivity & Case Bridges (Slack/Teams, Jira/ServiceNow)
10) IG‑ING‑A2 — Ingest Wizard & Schema‑Aware ETL Assistant
11) IG‑ING‑A4 — Data License Registry & Enforcement
12) IG‑UX‑I2 — Command Palette, A11y AAA, Diff/Undo/Redo

> Structure: Summary, Problem, Users & Jobs, Requirements (Must/Should/Could), Non‑Functional Requirements, Architecture & APIs, Telemetry, Security & Compliance, Success Metrics, Rollout & Risks.

---
## 1) PRD — IG‑ANL‑C6 Strategic Intelligence & Predictive Suite
**Summary**: Unified forecasting, causal inference, and counterfactual simulation over graph/time series. KPI: forecast MAPE ≤ 12% on reference tasks; causal validity checks pass ≥95%.

**Problem**: Leaders need forward views with assumptions traced and reproducible, not black‑box magic.

**Users & Jobs**: Analysts curate signals, run models, compare scenarios, export decision briefs with provenance of assumptions.

**Requirements**
- **Must**: model registry (ARIMA/Prophet/Bayesian/graph temporal); causal DAG editor; backtesting harness; counterfactual runner; confidence/uncertainty bands; feature importance and causal justifications; policy‑aware constraints; provenance of datasets, transforms, seeds.
- **Should**: Auto‑segmentation by community/region; ensemble blender; drift/decay monitors.
- **Could**: Uplift modeling for interventions.

**NFRs**: 10k time series fit within 30m; p95 forecast < 2s per series; reproducibility by seed.

**Architecture & APIs**: `predict‑svc`, `causal‑svc`, `dset‑registry`, `backtest‑svc`. API: `POST /predict`; `POST /causal/dag`; `POST /counterfactual`.

**Telemetry**: MAPE/CRPS; backtest curves; drift; data freshness.

**Security & Compliance**: dataset licensing checks; purpose limitation; audit of parameter changes.

**Success**: Decision latency ↓25%; forecast adoption ≥70% of teams.

**Rollout**: start with forecasting + backtests → add causal → add counterfactuals.

---
## 2) PRD — IG‑ANL‑C2 Pattern Miner
**Summary**: Discover temporal motifs (rendezvous, convoy), co‑travelers, and structuring patterns with explainable outputs.

**Requirements**
- **Must**: library of detectors (motifs, subgraph isomorphisms, sequence mining); windowing; geo‑temporal joins; confidence scores; false‑positive controls; provenance of matches.
- **Should**: semi‑supervised hints; template authoring; dedupe across runs.
- **Could**: on‑device motif probes for edge kits.

**NFRs**: scan 100M edges < 20m; p95 result paging < 1.5s.

**APIs**: `POST /patterns/search`; `GET /patterns/{id}`.

**Success**: precision/recall ≥0.8 benchmark; analyst effort ↓30%.

---
## 3) PRD — IG‑ANL‑C4 Hypothesis Workbench (CH/COI)
**Summary**: Structured workspace to frame competing hypotheses, attach evidence, run tests, and resolve to COA or report.

**Requirements**
- **Must**: hypothesis cards; predicted/observed tracker; disconfirming evidence surfacer; bias checklists; link to COA/Report; provenance manifest on publish.
- **Should**: likelihood scoring with calibration; reviewer workflows.
- **Could**: Bayesian updating helpers.

**NFRs**: autosave; offline‑capable edits; p95 action < 200ms.

**APIs**: `POST /hypotheses`; `POST /hypotheses/{id}/evidence`; `POST /resolve`.

**Success**: unresolved→resolved ratio improves 20%; disconfirmation usage ≥60%.

---
## 4) PRD — IG‑COL‑E2 Brief/Report Studio
**Summary**: Compose narrative briefs with timeline/map/graph panels; auto‑citations and export packages.

**Requirements**
- **Must**: section templates; evidence drag‑in; auto citation numbers; snapshot lock; redaction presets; export to PDF/HTML with manifest.
- **Should**: collaboration with track changes; style themes.
- **Could**: quick “exec brief” generator.

**NFRs**: 50‑page export < 30s; a11y compliant exports.

**APIs**: `POST /briefs`; `POST /export`.

**Success**: report cycle time ↓35%; citation coverage 100%.

---
## 5) PRD — IG‑OPS‑H2 Cost Guard & Archived Tiering
**Summary**: Guardrails to reduce $/insight via query budgeting, storage tiering, and auto‑archive.

**Requirements**
- **Must**: unit‑cost catalog; query budget allocator; kill/shape slow queries; auto tiering to cold/Glacier; cost dashboards; alerts.
- **Should**: what‑if cost simulator.
- **Could**: per‑team budgets with chargeback.

**NFRs**: overhead ≤3%; tiering RTO < 2m for hot recall.

**APIs**: `POST /budget`; `GET /costs`; `POST /tiering/rules`.

**Success**: $/insight ↓25%; budget breaches <2%.

---
## 6) PRD — IG‑OPS‑H4 Offline/Edge Kits & CRDT Sync
**Summary**: Field‑deployable kit with local graph + CRDT sync to central; signed sync logs and conflict UI.

**Requirements**
- **Must**: portable bundle; local ingest and analysis; CRDT merge; conflict inspector; signed sync receipts; policy‑sealed compute at edge.
- **Should**: partial data eviction; bandwidth‑aware sync.
- **Could**: edge‑only motifs.

**NFRs**: sync p95 < 5m on 1GB delta; power‑fail robustness.

**APIs**: `POST /sync/push`; `POST /sync/pull`; `GET /conflicts`.

**Success**: offline ops continuity ≥99%; conflict resolution MTTR < 10m.

---
## 7) PRD — IG‑OPS‑H5 Admin Studio
**Summary**: One console for schema changes, health, retries, feature flags, and safe migrations.

**Requirements**
- **Must**: schema editor with diffs; job retry/backoff controls; health dashboards; feature flag mgmt; migration guardrails with simulation; audit.
- **Should**: runbook links; chatops integration.
- **Could**: change blast‑radius estimator.

**NFRs**: p95 interaction <150ms; 99.95%.

**APIs**: `POST /schema/diff`; `POST /flags`; `GET /health`.

**Success**: change failure rate ↓50%; MTTR ↓40%.

---
## 8) PRD — IG‑INT‑G1 STIX/TAXII, MISP, OpenCTI Interop
**Summary**: Standards‑based CTI interop: import/export, mapping to canonical model, and deconfliction hooks.

**Requirements**
- **Must**: TAXII client/server; STIX 2.x mapping; MISP feeders; OpenCTI bridge; schema versioning; confidence/marking compatibility; round‑trip tests.
- **Should**: transformation presets; watchlists.
- **Could**: proof‑carrying STIX attachments.

**NFRs**: import 1M indicators < 30m; export 100k < 2m.

**APIs**: `POST /stix/import`; `POST /taxii/collections`.

**Success**: partner interop pass ≥3 ecosystems; mapping loss <2%.

---
## 9) PRD — IG‑INT‑G3 Productivity & Case Bridges
**Summary**: Deep integrations with Slack/Teams (chatops), Jira/ServiceNow (case/ticket bi‑sync).

**Requirements**
- **Must**: message actions (send to case, attach evidence); notifications; slash commands; Jira/SNOW issue sync; permission mirroring; health & retry queues.
- **Should**: playbook triggers; templates.
- **Could**: AI triage suggestions in chat.

**NFRs**: round‑trip < 10s; data loss <0.01%.

**APIs**: `POST /chat/command`; `POST /cases/sync`.

**Success**: triage latency ↓20%; sync failures <0.1%.

---
## 10) PRD — IG‑ING‑A2 Ingest Wizard & Schema‑Aware ETL Assistant
**Summary**: Guided ingestion with schema mapping, PII detection, redaction presets, and testable pipelines.

**Requirements**
- **Must**: wizard steps (source→schema→map→classify→test→deploy); sample validation; PII classifier; redaction/minimization; provenance recorder; rollback.
- **Should**: recipe library; error explainers.
- **Could**: auto‑schema inference + suggestions.

**NFRs**: TTV ≤ 30m typical source; test feedback < 5s.

**APIs**: `POST /wizard/session`; `POST /map`; `POST /deploy`.

**Success**: first‑time success ≥90%; ingest defects ↓30%.

---
## 11) PRD — IG‑ING‑A4 Data License Registry & Enforcement
**Summary**: Central license registry controlling ingest, query, and export per dataset and partner terms.

**Requirements**
- **Must**: license records; term codification; real‑time enforcement; appeals workflow; export blocker; reporting.
- **Should**: partner portal view; exceptions with dual control.
- **Could**: machine‑readable license exchange.

**NFRs**: p99 eval < 5ms; uptime 99.99%.

**APIs**: `POST /licenses`; `POST /enforce`; `GET /reports`.

**Success**: violations → 0; partner audits pass 100%.

---
## 12) PRD — IG‑UX‑I2 Command Palette, A11y AAA, Diff/Undo/Redo
**Summary**: Universal command surface; full accessibility compliance; robust history with diff/undo/redo.

**Requirements**
- **Must**: fuzzy command palette; keyboard coverage ≥95%; WCAG AAA; diff/undo/redo across entities and cases; explain overlays hook‑points.
- **Should**: macros; per‑user shortcuts.
- **Could**: voice control (opt‑in).

**NFRs**: palette open < 80ms; undo commit < 120ms.

**APIs**: `POST /commands/run`; `GET /history/{id}`.

**Success**: task time ↓20%; a11y audit 100% pass.

---
### Global Sections (applies to all above)
**Security & Compliance**: ABAC/OPA integration; DPIA where PII; encryption at rest/in transit; export manifests; legal hold where applicable.

**Telemetry & Analytics**: event taxonomies per feature; adoption, task‑time, error/budget metrics; cost dashboards (where relevant).

**Rollout Strategy**: feature flags; shadow and parallel runs; migration playbooks; enablement & training packs.

**Risks & Mitigations**: scale/cost spikes → tiering + budget guards; mapping drift → schema versioning + validations; offline conflicts → CRDT + conflict UI; partner schema changes → adapters + contract tests.

