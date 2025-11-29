# Sprint Plan — Dec 15–26, 2025 (America/Denver)

> **Context:** Sprint 15. Holiday-adjusted cadence (8–9 biz days). Theme: make graph insights _visible and trustworthy_ by shipping tri-pane synchronization, ER MVP, explain overlays, and export provenance.

---

## 1) Sprint Goals (SMART)

- Deliver **tri-pane synchronization** (timeline • map • graph) with shared selection and time filtering; cross-pane updates ≤150ms and time slicing ≤300ms, URL-addressable state by **Dec 26**.
- Ship **Entity Resolution MVP** for people/orgs combining deterministic rules + ML rescoring + analyst merge/split workflow; achieve precision ≥0.95 and AUC ≥0.92 on gold pairs by **Dec 26**.
- Launch **Explain overlays** showing evidence, lineage, and feature-level reasons for edges/alerts; ≥95% edges with evidence coverage and explain query p95 ≤1.5s by **Dec 26**.
- Produce **provenance/manifest beta** for every export (JSON sidecar) capturing sources, transforms, licenses, reviewer; 100% exports include a valid manifest by **Dec 26**.
- Enforce **perf guardrails**: cached neighborhood queries, throttled live layouts, UI budget hints; 3× faster median 2-hop neighborhood and no layout jank on 1K-node gestures.

---

## 2) Success Metrics & Verification

- **Pane sync latency:** p95 ≤150ms for selection propagation; ≤300ms for time slicing. _Verify:_ telemetry + profiling on 1K-node fixtures.
- **ER quality:** precision ≥0.95; recall ≥0.85; AUC ≥0.92. _Verify:_ labeled gold pairs; ROC/AUC report; rule merge logs.
- **Explain coverage/perf:** ≥95% edges with ≥1 evidence item; explain p95 ≤1.5s on ≤250k edges. _Verify:_ coverage audit; cached shortest-path timings.
- **Export provenance:** 100% exports emit manifest with sources/transforms/license/reviewer and accurate redaction log. _Verify:_ export harness + schema validator.
- **Perf guardrails:** 3× faster cached 2-hop neighborhoods; layout throttling prevents FPS drops during pan/zoom on 1K nodes. _Verify:_ benchmark harness + UX telemetry.

---

## 3) Scope (Epics → Stories)

### Epic A — Tri-Pane Sync
- **A1. ViewState bus (Redux):** `{selection[], timeRange, filters, pin}` propagated to graph/map/timeline; URL encodes state. **DoD:** selection updates others ≤150ms.
- **A2. Cytoscape × jQuery interactions:** box/lasso select, hover summaries, debounced pane updates. **DoD:** 1K nodes @60fps on pan/zoom; selection round-trip clean.
- **A3. Time slicing:** brushes on timeline clip edges/nodes by interval. **DoD:** graph/metrics reflect brush ≤300ms on cached data.

### Epic B — Entity Resolution (ER) MVP
- **B1. Rule engine (Node):** email/phone exact, name+dob fuzzy (Jaro-Winkler), address block-key. **DoD:** precision ≥0.95; deterministic merges logged.
- **B2. ML rescoring microservice (Python/FastAPI):** gradient boosting over features (name sim, geo dist, co-occurrence). **DoD:** AUC ≥0.92; model + feature schema versioned.
- **B3. Analyst controls:** merge/split with reason; undo; audit trail. **DoD:** every merge logs user, reason, feature snapshot.

### Epic C — Explainability Overlays
- **C1. Edge evidence chips:** hover → popover with source docs, transform chain, confidence. **DoD:** ≥95% displayed edges link to evidence.
- **C2. “Why is this connected?” path explainer:** shortest-path + top-k supporting facts with caching. **DoD:** ≤1.5s on ≤250k edges with cache warm.

### Epic D — Provenance & Export Manifest
- **D1. Manifest generator:** JSON sidecar with dataset IDs, license, transforms, filters, approvals; auto-downloads alongside CSV/PDF. **DoD:** referentially complete manifests for all exports.
- **D2. License echo/redaction log:** embed license/contact summary; list blocked/removed fields. **DoD:** redaction list accurate on 100% test exports.

### Epic E — Performance & Cost
- **E1. Neighborhood cache (Redis):** key `(seed, radius, filters, timeRange)`; invalidation on ingest. **DoD:** 3× faster median 2-hop queries.
- **E2. Layout throttle:** pause force layout during selection/drag; resume on idle. **DoD:** no layout jank during continuous pan/zoom on 1K nodes.

---

## 4) Engineering Plan

**Frontend (React 18 + MUI + Cytoscape.js; jQuery bridge)**
- ViewState reducer + URL sync; timeline brush emits `{start,end}` and dispatches to Redux.
- jQuery handlers: `boxselect/lasso/hover` → debounced dispatch; capped DOM updates to avoid thrash.
- Evidence popovers (MUI `Popover`) fed by `/edge/:id/evidence`; explain button opens path/facts overlay.

**Graph/Backend (Node/Apollo + Neo4j)**
- Cypher slices by `eventTime`; graph cache for 2-hop neighborhoods keyed by time/filter tuple.
- ER rule service + feature extractor; forwards candidates to ML rescoring service; audit trail on merges/splits.
- Export manifest builder hooks into existing export endpoints; attaches redaction log and license echo.

**ML Service (Python/FastAPI)**
- Features: `jw_name`, `soundex_name`, `geo_km`, `email_exact`, `phone_e164`, `cooccur_cnt` (+ cache hits).
- CatBoost/LightGBM baseline; joblib model artifacts; Pydantic schemas for input/output; OTEL spans + Prom metrics.

**Observability & Guardrails**
- Telemetry for pane-sync latency, cache hit rates, layout throttle events, explain query timings.
- OTEL spans around ER scoring; immutable audit entries for merges/splits and manifests.

---

## 5) Interfaces (target examples)

**GraphQL additions**
```graphql
extend type Query {
  neighborhood(seed: ID!, radius: Int!, timeStart: String, timeEnd: String, filters: [String!]): GraphSlice!
  edgeEvidence(edgeId: ID!): [Evidence!]!
  explainConnection(a: ID!, b: ID!, k: Int = 3): EdgeExplain!
}
```

**Cypher slice (cache key awareness)**
```cypher
MATCH (s {id:$seed})-[r*1..$radius]-(n)
WHERE ($timeStart IS NULL OR ALL(rel IN r WHERE rel.eventTime >= datetime($timeStart)))
  AND ($timeEnd   IS NULL OR ALL(rel IN r WHERE rel.eventTime <= datetime($timeEnd)))
RETURN nodes(r) AS nodes, relationships(r) AS rels
LIMIT 2000;
```

**jQuery event bridge**
```javascript
function emitSelectionDebounced(cy) {
  let debounceId;
  return function () {
    clearTimeout(debounceId);
    debounceId = setTimeout(() => {
      const ids = cy.$(':selected').map((_, ele) => ele.id());
      window.store.dispatch({ type: 'view/selectionSet', payload: ids });
    }, 80);
  };
}
```

---

## 6) Acceptance & Demo Checklist

1. Brush timeline → map and graph clip to interval in <300ms; selection sync is snappy.
2. Run ER on sample people/orgs: auto-suggested merges with score; accept/undo; audit shows reason + feature vector.
3. Hover an edge: evidence popover shows source + transform + confidence; click “Why?” to see path + supporting facts.
4. Export filtered subgraph: data + `manifest.json` download; manifest references sources, transforms, license, reviewer, and redactions.

---

## 7) Risks & Mitigations

- **False merges in ER:** conservative thresholds; require human confirmation near decision boundary; full undo path; capture feature snapshot for audit.
- **UI jank on large selections:** debounce pane updates; throttle layout during drag/zoom; cap batch sizes; use cache for neighborhoods.
- **Cache staleness:** TTL + ingest-triggered invalidation; cache key includes time/filter params; fall back to live query on cache miss.
- **Holiday bandwidth:** slim ceremonies; pre-plan coverage; prioritize acceptance checklist early.

---

## 8) Timeline & Ceremonies (MT)

- **Mon Dec 15** — Kickoff + perf budget review; cache key/URL encoding plan.
- **Fri Dec 19** — Mid-sprint demo: pane sync and ER rule engine; adjust thresholds.
- **Tue Dec 23** — Grooming for next sprint; explain overlay usability review.
- **Fri Dec 26** — Demo + Retro + Release cut; export manifest verification.

---

## 9) Open Questions

1. Do we have a labeled ER gold set ready (how many pairs, domains)?
2. Any priority evidence types to highlight first (docs, images, chain-of-custody)?
3. Should we block auto-merge this sprint, or allow only at very high scores with audit?
