# Prompts #97–#104 Issue Carving Plan

This plan enumerates the eight scoped, feature-flagged tracks requested in Prompts #97–#104. Each entry supplies a canonical issue title, branch name, feature flag, deliverable summary, CI gates, and open tuning questions to resolve during refinement. All scopes are non-overlapping and advisory where noted.

## Global conventions
- Branch naming: `feat/<scope>/<short-desc>` (e.g., `feat/mdmb/drift-monitor`).
- Feature flags: ensure defaults are **disabled**; wire flags through API and UI entry points.
- CI gates: unit + contract tests, Playwright E2E per prompt, and lint/format in CI. No schema or prod mutations without explicit gates.
- Events are advisory-only unless noted; do not mutate production data; never log PII.

## Issue breakdown

### #97 — Model Drift Monitor & Backtester (MDMB)
- **Issue title:** "MDMB: drift detection + backtest champion/challenger"
- **Branch:** `feat/mdmb/drift-monitor`
- **Feature flag:** `MDMB_ENABLED` (default off)
- **Deliverables:** `/ai/mdmb` service (Python 3.12) providing population/feature drift (PSI/JS, KS), label drift, concept drift (ADWIN), backtest runner over snapshot-pinned inputs, champion–challenger compare, APIs `POST /backtest`, `GET /drift/:modelId`, `GET /report/:runId`, UI dashboards with feature-level jQuery expanders, promote/rollback advisories only. Events: `model.drift.detected|cleared`, `model.backtest.completed`.
- **CI gates:** synthetic drift corpora with stable thresholds; unit/contract on drift math; Playwright "select model→backtest→compare→promote (advisory)"; lint/format.
- **Tuning questions:** default drift thresholds per task (embeddings/summarization/link-pred); rolling windows (7/30/90 days).

### #98 — Edge AI Pack & Model Update Service (EAP)
- **Issue title:** "EAP: edge bundle signing + offline inference receipts"
- **Branch:** `feat/eap/edge-bundles`
- **Feature flag:** `EAP_ENABLED`
- **Deliverables:** `/edge/eap-service` (Node/TS) for signed WebAssembly/ONNX bundles, delta updates, integrity checks, rollout waves; PWA/extension client SDKs for offline OCR/ASR/summarize with redaction-first jQuery overlays; manifests for hashed/signed inference logs uploaded when online. Constraints: no biometric models; bundles signed/pinned; offline-only unless user consents; residency hints baked into bundle selection.
- **CI gates:** bundle integrity tests; throughput/latency baselines on mid-range devices; Playwright "install bundle→run offline→sync receipts"; lint/format.
- **Tuning questions:** first device targets (Chromebook, Android mid-tier); default bundle set (OCR+ASR only vs. add summarizer).

### #99 — Argumentation Graph & Claim Debate (AIF)
- **Issue title:** "AIF: argumentation semantics + debate view"
- **Branch:** `feat/aif/argumentation`
- **Feature flag:** `AIF_ENABLED`
- **Deliverables:** `/services/argumentation` (Node/TS) with AIF-like schema, grounded semantics (Dung/weighted), acceptance lab, explainers linking to evidence paths; APIs `POST /argument`, `GET /status/:claimId`, `GET /explain/:claimId`; UI debate overlay with jQuery toggles for supports/attacks and burden-of-proof meter. Constraints: no free-text without citations; block publication if critical claims lack acceptable status; LAC consulted for audience thresholds.
- **CI gates:** golden argument sets with reproducible acceptance; Playwright "add support→see status shift→export reasoning"; lint/format.
- **Tuning questions:** default semantics (grounded vs. preferred); criticality tiers mapping to acceptance thresholds.

### #100 — Storyboard & Time-Replay Player (REPLAY)
- **Issue title:** "REPLAY: timeline/graph/map player + diff/export"
- **Branch:** `feat/replay/time-player`
- **Feature flag:** `REPLAY_ENABLED`
- **Deliverables:** `/apps/web/replay` (React + Cytoscape + Mapbox; jQuery scrubber) with transport controls, speed, bookmarks, diff overlays, GIF/MP4 export with watermark; `/services/replay-index` (Node/TS) building replay tiles from snapshots/events with cost-aware caching; APIs `GET /replay/:caseId?from=…&to=…`, `GET /diff/:t1/:t2`. Constraints: read-only, no PII in tiles, watermark exports, respect LAC.
- **CI gates:** visual regression on key frames; p95 first frame ≤800ms for 10k-node views (LOD); Playwright "seek→diff→export"; lint/format.
- **Tuning questions:** default playback speeds/keyframe cadence; whether to include provenance popups in v1.

### #101 — Access Reachability & Blast-Radius Analyzer (ARBA)
- **Issue title:** "ARBA: reachability simulation + blast radius"
- **Branch:** `feat/arba/reachability`
- **Feature flag:** `ARBA_ENABLED`
- **Deliverables:** `/platform/reachability` (Go/Node) computing policy-aware reachability graph over GraphQL/Cypher fields with "what if" diff engine; UI blast-radius heatmap with path examples and deny reasons; jQuery sliders for scope knobs; APIs `POST /simulate`, `GET /radius/:policyId`. Constraints: advisory-only, no policy changes, structure-only (no payloads), integrates with Access Plane (#33) & LAC (#4).
- **CI gates:** corpus of policies with known radii; correctness tests; Playwright "edit policy→simulate→approve"; lint/format.
- **Tuning questions:** default promotion guard (max Δ nodes/fields); required evidence for exceptions.

### #102 — Honey Artifacts & Deception Traps (HADT)
- **Issue title:** "HADT: honey artifacts + trigger monitoring"
- **Branch:** `feat/hadt/deception`
- **Feature flag:** `HADT_ENABLED`
- **Deliverables:** `/security/deception` (Node/TS) honey artifact generator, planting planner, trigger listeners; signed seeds via KMS (#27); UI "Plant trap" wizard with jQuery sliders for stealth level; events `honey.triggered` with privacy-safe metadata and NHAI (#53) integration. Constraints: never pollute real analytics; artifacts tagged/excluded; no PII; legal/ethics checklist; auto-expiry with receipts.
- **CI gates:** E2E with synthetic triggers; false-positive guard; Playwright "plant→simulate→alert→retire"; lint/format.
- **Tuning questions:** default stealth profiles (obvious vs. subtle); trigger actions (view, copy, export) to monitor.

### #103 — Query Interop Bridge (Gremlin/SPARQL) (QIB)
- **Issue title:** "QIB: Gremlin/SPARQL translation to Cypher"
- **Branch:** `feat/qib/query-bridge`
- **Feature flag:** `QIB_ENABLED`
- **Deliverables:** `/services/qib` (Node/TS) translators Gremlin→Cypher and SPARQL→Cypher with planner hooks, persisted queries with hashes; gateway adapters with schema exposure and error messages showing cost & safe rewrites; tests with public corpora. Constraints: read-only v1; cost ceilings per tenant; LAC enforced; no raw schema leakage.
- **CI gates:** compatibility suites; documented latency SLOs; Playwright "paste SPARQL→preview→run sandbox"; lint/format.
- **Tuning questions:** prioritize dialect (Gremlin vs. SPARQL); max query complexity before block.

### #104 — Video Segmenter & Transcript Aligner (ViSTA)
- **Issue title:** "ViSTA: video segmentation + transcript alignment"
- **Branch:** `feat/vista/video-segmentation`
- **Feature flag:** `VISTA_ENABLED`
- **Deliverables:** `/services/vista` (Python workers) for shot detection, scene clustering, ASR alignment (from #24), frame OCR/logo detection, keyframe picker; manifests with time-codes; UI timeline with scene bars, jump-to-evidence, redact overlays with jQuery scrubbing/keyboard jumps; APIs `POST /analyze`, `GET /scenes/:id`, `GET /align/:id`. Constraints: no face recognition; originals untouched; export-only previews with watermark (#48); throughput backpressure via GWSP (#70); residency respected.
- **CI gates:** golden video corpus; alignment accuracy bounds; Playwright "analyze→navigate→export scenes"; lint/format.
- **Tuning questions:** default scene granularity target (avg seconds); supported codecs/containers for v1.

## Execution notes
- Each branch should include typed API contracts, golden fixtures, and Playwright journeys listed above. PRs must stay under their feature flag and avoid cross-DB coupling.
- Promotion hooks in MDMB emit advisories only; ARBA/HADT are advisory-only; QIB is read-path only in v1.
- Capture tuning-question decisions in issue comments before merging to avoid rework across teams.
