# Sprint Plan — Apr 20–May 1, 2026 (America/Denver)

> **Context:** Sprint 23 focuses on shipping graph-grounded RAG, Investigations Studio, multilingual search v1, and evidence quality gates while keeping privacy/licensing intact and costs predictable.

---

## 1) Sprint Goal (SMART)

Deliver **Graph-Grounded RAG v1**, **Investigations Studio (MVP)** with live citations and export, **Multilingual Search v1** with license-aware snippets, and **Evidence Quality Gates** with dedupe and claim checks to achieve **top-5 recall ≥0.9** and **citation coverage ≥95%** by **May 1, 2026** with **retrieval p95 ≤600 ms** and **zero blocked-content leaks**.

**Key outcomes**

- Hybrid graph+text retrieval with graph priors reaches target recall/latency and enforces license/redaction policies.
- Grounded answers include inline citations/evidence chips and refuse when evidence is insufficient.
- Investigations Studio supports narrative drafting with live citations, autosave, undo/redo, and exportable manifests.
- Multilingual search returns translated snippets with cross-language embeddings while respecting original license scopes.
- Quality gates dedupe near-duplicates, block unverifiable claims, and prevent leakage of private/blocked content.
- Ops controls add caching, token budgets, and per-workspace model choices without overruns.

---

## 2) Success Metrics & Verification

- **Retrieval performance:** **Top-5 recall ≥0.9**, **p95 ≤600 ms** (warm).  
  _Verify:_ Eval harness with gold Q/A; latency dashboards.
- **Citation quality:** **≥95%** sentence-level coverage; **0** un-cited named facts.  
  _Verify:_ Citation coverage test; broken-citation detector.
- **Studio reliability:** Autosave p95 **<700 ms**; **0** broken citations on publish; a11y checks pass.  
  _Verify:_ Telemetry, a11y suite, publish flow tests.
- **Multilingual efficacy:** Cross-language top-5 recall **≥0.85**; language auto-detect **≥0.95**; snippet translation quality **≥4/5**.  
  _Verify:_ Multilingual recall suite; dogfood ratings; language-detect fixtures.
- **Quality gates:** **≥90%** near-duplicate collapse; **0** unverifiable sentences allowed in publish mode; **0** license leaks.  
  _Verify:_ Dedupe tests; publish-blocker tests; compliance fixtures.
- **Ops/cost:** Cache hit-rate **≥60%** on repeats; **0** budget overruns; refusal copy on breach verified.  
  _Verify:_ Cache metrics; budget audit logs; simulated overages.

---

## 3) Scope

**Must-have (commit):**

- **Graph-Grounded RAG (v1):** hybrid retriever (graph neighborhoods + BM25/vector + graph-prior rerank), grounded answerer with citations/claims, guardrails for license/redaction/refusal paths.
- **Investigations Studio (MVP):** narrative canvas (Findings/Timeline/Entities/Evidence) with autosave, undo/redo, keyboard-first/a11y, live citations with evidence chips, broken-citation detector, export manifest bridge.
- **Multilingual Search (v1):** server-side language detect/translation, cross-lingual embeddings for top 10 languages, snippet translation with original-language view, license-aware filtering.
- **Evidence Quality Gates:** near-duplicate dedupe (simhash/perceptual hash), claim check + unverifiable sentence blocker, bias/leak checks to prevent private/blocked content.
- **Ops & Cost:** retrieval chain cache with TTL/invalidation, token budgets and per-workspace model controls with refusal copy and audit.

**Stretch:**

- Additional reranker tuning (freshness, domain priors) with learned weights. 
- Expanded export templates for Report Builder beyond default.
- UI transliteration enhancements for additional entity scripts.

**Out-of-scope:**

- Cross-tenant publishing; destructive automation; external-facing policy editor; new data connectors.

---

## 4) Team & Capacity

- 10 business days; focus factor **0.8** → **commit ~40 pts** with ~10% buffer for interrupts.
- Roles unchanged; shared graph/infra support aligned for caching and compliance.

---

## 5) Backlog (Ready for Sprint)

### Epic A — Graph-Grounded Retrieval — **14 pts**

- **A1 — Hybrid Retriever** (5 pts)  
  _AC:_ graph fan-out with radius/time filters; BM25+vector fusion; graph-prior rerank; license filter; p95 ≤600 ms warm.
- **A2 — Grounded Answerer** (5 pts)  
  _AC:_ answers composed only from retrieved snippets; inline citations mapped to evidence chips; JSON `claims[]`; ≥95% citation coverage.
- **A3 — Guardrails** (4 pts)  
  _AC:_ block restricted snippets; redact per policy; “can’t answer” fallback when insufficient evidence; refusal copy tested.

### Epic B — Investigations Studio — **10 pts**

- **B1 — Narrative Canvas** (4 pts)  
  _AC:_ sections (Findings/Timeline/Entities/Evidence); drag-in graph snapshots; autosave; undo/redo; keyboard-first a11y.
- **B2 — Live Citations** (3 pts)  
  _AC:_ hover shows evidence chip + provenance chain; broken-citation detector flags stale; zero broken citations in demo docs.
- **B3 — Export Bridge** (3 pts)  
  _AC:_ one-click export to Report Builder template; manifest carries cited items; manifest validation passes.

### Epic C — Multilingual Search (v1) — **8 pts**

- **C1 — Multilingual embeddings + translation** (3 pts)  
  _AC:_ cross-lingual vectors stored per doc; query-time detect/translate; recall ≥0.85; auto-detect ≥0.95.
- **C2 — UI language toggle + transliteration** (3 pts)  
  _AC:_ toggling updates search/snippets; transliteration for CJK/Arabic names; original-language view.
- **C3 — License-aware snippets** (2 pts)  
  _AC:_ restricted text never shown across languages; policy reason displayed; 100% compliance on fixtures.

### Epic D — Evidence Quality Gates — **8 pts**

- **D1 — Near-duplicate dedupe** (3 pts)  
  _AC:_ simhash/minhash for text; perceptual hash for images; ≥90% duplicate collapse without losing uniques.
- **D2 — Claim check** (3 pts)  
  _AC:_ regex/NER claim extraction; every claim cited; unverifiable sentences blocked from publish.
- **D3 — Bias/leak checks** (2 pts)  
  _AC:_ private notes blocked from citations; secrets masked; audit reasons recorded; leakage rate 0 on fixtures.

### Epic E — Ops & Cost Controls — **6 pts**

- **E1 — Chain cache** (3 pts)  
  _AC:_ memoize `(seed, query, filters)` retrieval; TTL/invalidation; ≥2× latency improvement on repeats.
- **E2 — Token budgets & model switcher** (3 pts)  
  _AC:_ per-workspace model policy; ceilings enforced; breach yields friendly refusal; admin override logged.

---

## 6) Interfaces & Exemplars

- **GraphQL (RAG & Studio):** `groundedAnswer`, `searchMultilingual`, `studioCreate/update/publish` returning answers with citations/claims and Studio docs with manifests.
- **Hybrid retrieval service:** graph neighborhood + BM25/vector, rerank with graph priors and freshness, policy filter, top 50 cap.
- **Reranker (Python/NumPy):** weighted features `[bm25, vec, graph_prior, -freshness_days]` with adjustable weights emphasizing graph proximity.
- **Claim checker:** sentence/claim extraction with citation overlap checks; flags unverifiable claims before publish.
- **Studio Canvas:** autosave on input (debounced), hover-to-chip citations, broken-citation detector on save.
- **Multilingual path:** language detect, translate query to canonical, retrieve, translate snippets back with original view and license filtering.
- **Dedupe:** simhash/minhash for text; perceptual hash for images; cluster+collapse in retrieval stage.

---

## 7) Acceptance Scenarios

1. **Grounded Q/A:** Ask “Summarize Acme’s links to Org X in 2025 with dates.” → answer shows `[1][2][3]` citations; clicking reveals evidence chips (source, transform, license); no un-cited facts.
2. **Narrative Build:** Draft an “Investigation Summary” in Studio; drag a graph snapshot and timeline; citations live-update; publish to Report Builder — manifest lists all sources.
3. **Multilingual:** Search in Spanish for an English doc; top results appear with translated snippets; opening evidence respects original license/redaction rules.
4. **Quality Gates:** Add an unverifiable sentence → publish blocked with “needs citation”; dedupe merges repeated docs; leakage checks show zero blocked content.

---

## 8) Risks & Mitigations

- **Latency spikes in retrieval chains:** cap fan-out, async rerank service, chain cache, monitor p95; fallback to cached results on spikes.
- **Citation drift after edits:** run broken-citation detector on save; stale citations highlighted until refreshed; manifest validation on export.
- **Translation inaccuracies:** show original snippet inline on hover; allow “view source language”; manual override for sensitive outputs.
- **Over-filtering by license:** prefer “insufficient evidence” response vs partial answers; log policy decisions for audit.
- **Dedupe false positives:** threshold tuning with holdout set; allow manual “unmerge” in retrieval logs; keep cluster provenance.
- **Budget overruns:** enforce ceilings with refusal copy; alert admins; cache retrieval to lower spend.

---

## 9) Tracking & Compliance

- **Branches:** `feature/graph-grounded-rag`, `feature/investigations-studio`, `feature/multilingual-search`, `feature/evidence-gates`, `chore/rag-cost-ops`.
- **Labels:** `area:copilot`, `area:search`, `area:ux`, `area:compliance`, `needs:perf-bench`, `needs:a11y`.
- **CI/CD gates:** retrieval eval harness (gold Q/A), citation coverage test, multilingual recall suite, dedupe precision tests, publish-blocker unit tests.
- **Privacy/licensing:** enforce policy filter and redaction in retrieval and display; audit reasons for blocked content.

---

## 10) Open Questions

1. Which domains/languages seed the multilingual eval set (top 3 to start)?
2. Preference for on-prem models vs hosted (with redaction) for translation/embedding in v1?
3. Any mandatory citation style or report template constraints (numeric vs author-year, report formats)?

