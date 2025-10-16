# Sprint Prompt — Operation **PROBABLE CAUSE** (Wishlist Sprint 04)

**Window:** 2 weeks — Monday start, Friday 1500 demo.
**Theme:** Ship **probabilistic entity resolution + community insights** with **explainability, human‑in‑the‑loop, and strict policy gates**.
**Rallying cry:** Suggest boldly, merge carefully, explain everything.

---

## 1) Mission (Non‑Negotiable)

Deliver a shippable slice that adds **probabilistic ER (record linkage)**, **similarity search (vector + rules)**, and **community/ego‑network insights**, all **reversible**, **audited**, and **policy‑guarded**. Every suggestion carries a **why** and a **risk score**.

---

## 2) Scope (In)

1. **Probabilistic ER v1.0 (with Review Queue)**
   - Candidate generation: blocking keys + phonetic + n‑gram + vector ANN.
   - Classifier: logistic/GBM baseline (no deep net) using engineered features (name/geo/comm overlap, doc hash matches, co‑occurrence windows).
   - **Explain panel**: feature importances, matching fields, provenance trails; **Undo/Redo** for decisions.
   - **Review queue**: pairs with scores + triage (approve/deny/defer) + 4‑eyes option.

2. **Vector Search v0.9**
   - Embeddings for names, orgs, free‑text bios, document snippets; vector store per tenant; ANN index (HNSW/IVF) with filters by ABAC/policy.
   - Hybrid retrieval: (rules ∪ vector) → candidate set for ER and for analyst “Find similar” actions.

3. **Community & Pattern Insights v0.8**
   - Ego network summary (k‑hop neighborhood stats), shared resource/contact counts, simple community detection (Louvain/Leiden) on **read‑only** copy.
   - Event motifs: star/hub, triads, corridor convoys (reuse geo ops from Sprint‑02); outputs feed Report Studio.

4. **Bias/Calibration & Guardrails v0.9**
   - Score calibration plots; decision thresholds per class; policy rules to block auto‑merge on **protected attributes** or weak provenance.
   - Dataset cards + model card (sources, licenses, limits, eval).
   - **No auto‑merge by default**; suggestions require review unless whitelisted rule fires (exact keys).

5. **Disclosure & Manifest Extensions v0.9**
   - Export includes **ER decision logs**, model version, features used, thresholds, and calibration snapshot.
   - Verifier checks hashes for model/version and feature schema.

6. **Perf & SRE v0.8**
   - Candidate gen p95 < 400ms @ 1M entities (fixture); queue ops idempotent; ANN warm‑start on deploy.

---

## 3) Scope (Out)

- Deep neural ER; end‑to‑end learned blocking; cross‑tenant vector sharing.
- Real‑time auto‑merging; graph embeddings (node2vec) beyond basic ANN text vectors this sprint.

---

## 4) Deliverables

- **ER Service** with candidate gen, scoring, and review API + UI.
- **Vector store module** with tenancy + ABAC filters.
- **Community insights** job and summary panes.
- **Explainability**: feature importance view, per‑pair provenance drilldown.
- **Calibration report** + model card + dataset card.
- **Manifest** additions + offline verifier updates.

---

## 5) Acceptance Criteria (Definition of Done)

### Probabilistic ER

- On fixtures: **Precision ≥ 0.98, Recall ≥ 0.85** at chosen threshold; **0 irrecoverable overwrites**; 100% of merges reversible.
- Review queue supports approve/deny/defer; 4‑eyes toggle enforces reviewer requirement; audit logs who/what/why with score + features.

### Vector Search

- “Find similar” returns hybrids (rules + vector) with **latency p95 < 400ms** on 1M entity index; results respect ABAC/policy filters.
- ANN index warm‑starts; rebuild job completes within maintenance window.

### Community Insights

- Ego summary shows degree, shared contacts/resources, top motifs; simple community labels populate a **read‑only** overlay; Report Studio can reference them with citations to evidence.
- No policy‑restricted fields leak into derived labels.

### Bias/Calibration & Guardrails

- Calibration plot and threshold documented; protected attribute checks block auto decisions; rationale rendered on block page.
- Model/dataset cards generated and exported; licenses honored.

### Manifest & Verifier

- Disclosure bundle contains ER decision logs, model+feature schema hashes; **verifier PASS** confirms integrity and reproducibility pointers.

---

## 6) Work Breakdown (By Workstream)

### Graph / DB

- Schema: `MergeSuggestion`, `ReviewDecision`, `SimilarityEdge`, `CommunityLabel`.
- Stored procs/txns: write suggestions, commit merges → create `MERGED_INTO` + `EQUIVALENCE_ASSERTION`; maintain **undo ledger**.

### Backend / Services

- **er‑svc** (`services/er/`): blocking + ANN + classifier; score + explain; review API; threshold & calibration endpoints.
- **vector‑svc** (`services/vector/` or `packages/vector/`): embed text fields; build/search ANN; ABAC filters.
- **community‑job** (`jobs/community/`): run Louvain/Leiden on read‑replica; write labels/metrics.
- **policy‑gateway**: extend OPA for protected‑attribute rules; reason‑for‑merge gate.

### Frontend / Apps

- **Review Queue UI**: sortable by score/recency; pair diff view; feature importances; provenance drilldown; **Approve/Deny/Defer** + 4‑eyes.
- **Find Similar** action on entity/document; results list with labels + scores; ABAC badges.
- **Community Overlay**: toggle on graph; ego panel with stats/motifs; export snippets to Report Studio.
- Block page for policy‑denied merges with human‑readable clause and appeal link.

### AI/ML

- Feature engineering: token Jaro‑Winkler, Soundex/Metaphone, n‑gram Jaccard, geo haversine buckets, contact overlap, document hash matches, co‑presence windows.
- Classifier baseline (logistic/GBM); calibration (Platt/Isotonic).
- Evaluation harness + golden pairs; drift monitor hooks (population stability index).

### Governance

- Model card + dataset card; license registry integration for embeddings; fairness probes; retention labels on features.

### DevEx / SRE

- CI: golden pair tests + calibration snapshot diff; ANN build job; canary on er‑svc; autoscaling smoke.
- Observability: per‑stage timings, queue depth, false‑positive feedback loop.

---

## 7) Test Plan

- **Unit:** blocking functions; ANN search; feature calc; classifier; calibration; OPA decisions.
- **E2E:** ingest → candidate gen → review decisions → merges → community labels → disclosure export with manifest → **verifier PASS**.
- **Load:** 1M entities, candidate gen p95 < 400ms; review ops 50/s; ANN rebuild within window.
- **Chaos:** kill er‑svc mid‑review; ensure idempotent retries; verify no duplicate merges.

---

## 8) Demo Script (15 min)

1. Open a messy entity; click **Find Similar**; show hybrid results.
2. Approve a high‑confidence suggestion; show **Explain** (features + provenance) and **Undo**.
3. Attempt merge with protected attribute conflict → **Denied** with clause; add legal basis + reviewer → **Allowed**.
4. Show ego network + community overlay; export Report Studio section with citations.
5. Export disclosure bundle; run **verifier**; display model/version hashes and calibration snapshot.

---

## 9) Metrics (Exit)

- ER: Precision ≥ 0.98, Recall ≥ 0.85; 100% reversibility.
- Vector: p95 < 400ms @ 1M; warm‑start success 100%.
- Community job completes < 15m on fixture; overlay toggles < 200ms.
- 100% disclosure **verifier PASS** with model+feature hashes.

---

## 10) Risks & Mitigations

- **Drift & bias:** calibration snapshots; PSI monitors; protected‑attribute blocks; reviewer required.
- **PII in embeddings:** field‑level allowlist; per‑field hashing; license checks; tenant‑local vector stores.
- **Merge mistakes:** reversible ledger; 4‑eyes; aggressive diff preview.
- **Latency spikes:** precompute blocks; ANN warm cache; backpressure and fallbacks to rules‑only.

---

## 11) Dependencies

- Sprints 01–03 running: provenance ledger, deterministic ER, OPA gates, disclosure bundles, tri‑pane, geo ops, federation basics.
- Read‑replica for community job; vector runtime available.

---

## 12) Stretch (only if green by Day 7)

- Graph embeddings (node2vec/DeepWalk) for improved community hints.
- Pairwise **active learning** loop to prioritize uncertain suggestions.
- Offline/edge vector search for field ops.

---

## 13) Operating Rules

- **Provenance Before Prediction.**
- **Human‑in‑the‑loop by default.**
- **Policy by default; reasons mandatory.**
- **Reversible automation** with verifiable manifests.

---

## 14) User Stories

- _As an analyst,_ I get ranked merge suggestions with clear explanations and can approve/deny with one click.
- _As a reviewer,_ I can require 4‑eyes for risky merges and see the full rationale.
- _As a junior,_ I can find similar entities/documents quickly within policy bounds.
- _As an ombudsman,_ I can export ER decision logs and model info and verify integrity offline.

> **Orders:** Generate smart suggestions. Never guess in silence. Every merge leaves a trail.
