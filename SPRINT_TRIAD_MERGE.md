# Sprint Prompt — Operation **TRIAD MERGE** (Wishlist Sprint 02)

**Window:** 2 weeks — start Monday, end Friday 1500 demo.
**Theme:** Convert the wishlist’s “Bitemporal + GeoTemporal + Deterministic ER + Collaborate” into a shippable slice on top of Sprint‑01.
**Rallying cry:** Tighten truth. Merge cleanly. Track time. Show your work.

---

## 1) Mission (Non‑Negotiable)

Ship an end‑to‑end path that demonstrates: **Bitemporal graph + deterministic entity merge + geo‑temporal colocation detection + case collaboration**, all **policy‑guarded** with provenance intact.

---

## 2) Scope (In)

1. **Bitemporal Graph Core v1.0**
   - Add `validFrom/validTo` and `observedAt/recordedAt` across canonical entities/edges; implement _snapshot‑at‑time_ queries.
   - Gateway exposes `asOf` and `observedRange` parameters; NL→Cypher generator supports time predicates.

2. **Deterministic ER (Explainable) v0.9**
   - Rules: exact keys (email, phone E.164, doc hash), normalized names, org domain → person/org merges.
   - **Explain pane**: why merged/not merged (+ provenance trail and rule hits).
   - **No clustering** this sprint; strictly deterministic merges with reversible `MERGED_INTO` edges.

3. **GeoTemporal Ops v0.9**
   - Stay‑point detection (radius/time), **co‑location windows**, convoy/rendezvous detection (basic).
   - Map overlays for corridors; tri‑pane brush sync with timeline.

4. **Case Collaboration v0.8**
   - Case Spaces: tasks, @mentions, immutable comments with audit; 4‑eyes toggle for sensitive actions.
   - Disclosure bundle includes comment/audit extracts bound in manifest.

5. **Policy & Audit Extensions v0.9**
   - OPA adds _purpose limitation_ + _retention class_; GraphQL gateway enforces **reason‑for‑access** on time‑travel or ER merges.
   - ABAC obligations surfaced to UI.

6. **Connector & Ingest Enhancements v0.8**
   - TAXII/STIX ingest hardened; add RSS/Pastebin samples; lineage persists through ER and geo enrichers.
   - License registry checked before export.

---

## 3) Scope (Out)

- Probabilistic/ML ER; community detection; embeddings.
- Federated search, cross‑tenant stitching.
- Advanced XAI beyond importances/paths already in Graph‑XAI.

---

## 4) Deliverables

- **Running demo** on fresh env with seeded geo+comm fixtures.
- **Schema migration** for bitemporal fields (versions + rollback plan).
- **ER Ruleset** and **Explain Pane** with samples.
- **GeoTemporal library** with unit tests (stay‑point, colocation).
- **OPA bundle** (purpose/retention) + tests.
- **Updated disclosure bundle** including case comments/audit, **verifier PASS** against `ledger/MANIFEST_SPEC.md`.

---

## 5) Acceptance Criteria (Definition of Done)

### Bitemporal Core

- API supports `asOf: ISO8601` and `observedRange: [start,end]`.
- Time‑travel query returns a **consistent neighborhood snapshot**; tri‑pane reflects it in graph+timeline+map.

### Deterministic ER

- For fixtures: ≥98% precision on merges; **0 irrecoverable overwrites** (all merges reversible).
- Explain pane shows rule hits (e.g., email exact, E.164, doc hash) and provenance chain; **Undo** restores originals.

### GeoTemporal Ops

- On labeled AIS/ADS‑B/OSINT sample: **colocation P/R ≥ 0.8**; convoy/rendezvous events populate timeline.
- Corridor overlays render and filter results; brushing syncs all panes.

### Case Collaboration

- @mention notifies; comments immutable; **4‑eyes** gate blocks sensitive merge unless a reviewer approves; audit logs reason + approver.

### Policy & Audit

- OPA denies ER merges or time‑travel without **legal basis** + **reason**; block page shows human‑readable clause.
- Obligations returned by OPA are surfaced to UI and stored with the action record.

### Ingest & License

- STIX/TAXII, RSS, Pastebin samples ingest end‑to‑end; lineage survives ER + geo enrichers; export blocks on missing license metadata.

---

## 6) Work Breakdown (By Workstream)

### Graph / DB

- Migrations add bitemporal fields; write‑paths stamp both temporalities.
- Deterministic ER merge procedure (stored procs/transactions) creates `MERGED_INTO` + `EQUIVALENCE_ASSERTION` with checksums.

### Backend / Services

- **Gateway (GraphQL)**: extend context with `asOf`/`observedRange`; enforce OPA obligations; request plugin adds `x-legal-basis`/`x-reason` passthrough.
- **NLQ service**: extend compiler to emit time predicates; add cost chips for time‑bounded scans.
- **GeoTemporal lib**: module for stay‑points and colocation; export events to timeline.
- **Ledger**: manifest includes case comments + ER decisions with hashes.

### Frontend / Apps

- Tri‑pane sync for time/geo; **Explain Merge** drawer (rules, evidence, undo).
- Reason‑for‑access modal prior to time‑travel/merge; block page w/ appeal link.
- Corridor overlays on map; colocation events on timeline.
- Case Space: tasks, @mentions, comment audit view; disclosure builder pulls comment extracts.

### Policy / Governance

- Rego: purpose limitation + retention classes; tests for allow/deny/obligations.
- Policy simulation tool in dev mode; canned scenarios.

### Data / Fixtures

- Synthetic persons/orgs/accounts with duplicate keys; geo tracks to label colocation; STIX/TAXII sample feed; RSS/Pastebin samples.
- Golden ER decisions; golden colocation windows.

### DevEx / SRE

- CI gate: migrations + ER undo/redo tests + geo unit tests.
- Perf target: p95 time‑bounded neighborhood < 1.7s @50k nodes.

---

## 7) Code Anchors (repo reality → tasks)

- **Ingestors:** `ingestion/ingestors/stix_taxii.py`, `.../rss.py`, `.../pastebin.py` → harden, add lineage fields.
- **NLQ:** `services/nlq/src/index.ts`, `packages/sdk/nlq-js/src/index.ts` → add time predicates + cost.
- **Gateway + OPA:** `gateway/src/context.ts`, `gateway/src/plugins/abac.ts`, `infrastructure/opa/policies/*.rego` → reason‑for‑access, obligations, purpose/retention.
- **Graph‑XAI:** `graph-xai/app/api.py` → keep importances/paths; add hooks for merge explanations (non‑ML).
- **Tri‑pane:** `frontend/src/App.tsx` (+ timeline/map components) → brush sync + overlays.
- **Manifest:** `ledger/MANIFEST_SPEC.md` → extend to include comments + ER decisions.

---

## 8) Test Plan

- **Unit:** ER rules; undo/redo; stay‑point & colocation math; OPA allow/deny/obligation; NLQ time predicate generation.
- **E2E:** ingest → ER → time‑travel query → geo events → disclosure export; verifier `PASS`.
- **Load:** 10k geo points; p95 colocation detect < 10s; time‑bounded neighborhood p95 < 1.7s.
- **Chaos:** kill NLQ service mid‑demo; gateway continues read with cached plan; ER actions remain reversible.

---

## 9) Demo Script (15 min)

1. Ingest STIX + RSS/Pastebin; show lineage.
2. Merge a duplicated Person (email + E.164); open **Explain Merge**; **Undo**.
3. Time‑travel neighborhood **as of** last month; run NL prompt → preview Cypher with time predicate; execute sandbox.
4. Map shows corridor overlay; select window → see colocation events on timeline.
5. Attempt merge without legal basis → **Denied** with reasons; add legal basis + reviewer (4‑eyes) → **Allowed**; audit shown.
6. Export disclosure; verifier passes; manifest lists comments + ER decisions.

---

## 10) Metrics (Exit)

- ER precision ≥98% on fixtures; 100% reversible.
- Colocation P/R ≥0.8; time‑bounded query p95 <1.7s.
- 100% disclosure verifier PASS; OPA obligation surfaced in 100% of gated actions.

---

## 11) Risks & Mitigations

- **Merge mistakes:** reversible edges only; dry‑run + diff preview.
- **Temporal query blow‑ups:** mandatory time bounds on NLQ; cost chips warn if unsafe.
- **Policy fatigue:** cache obligations; short reason presets; strict logging.
- **License gaps:** export blocks hard; manifest lists missing licenses.

---

## 12) Dependencies

- Sprint‑01 artifacts running (provenance ledger, NLQ preview/sandbox, initial tri‑pane).
- OPA sidecar reachable from gateway; Neo4j/PG migrations ready.

---

## 13) Stretch (only if green by Day 7)

- Deterministic **Record Linkage** UI (pairwise review queue).
- Basic convoy clustering visualization.
- Offline/edge: signed sync logs for disclosure bundles.

---

## 14) Operating Rules

- **Provenance Before Prediction.**
- **Reversible automation.**
- **Policy by default** with readable reasons.

---

## 15) User Stories

- _As an analyst,_ I can time‑travel the graph and see a consistent snapshot across all panes.
- _As a reviewer,_ I can require a second approver for merges and see the reasons logged.
- _As a junior,_ I can ask time‑bounded natural‑language questions and preview the Cypher with cost.
- _As an ombudsman,_ I can export a disclosure bundle that includes comments and ER decisions bound by manifest.

> **Orders:** Merge precisely. Track time. Prove it on export.
