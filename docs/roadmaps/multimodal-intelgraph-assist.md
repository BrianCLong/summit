# Multimodal IntelGraph Assist — Frontier Model Pilot (2025)

## Goal and Scope

- Validate that Summit can orchestrate fast triage models (Gemini 3 Flash–class) with slow "thinking" models (GPT-5.2/Claude-class) across web pages, PDFs, images/maps, and graph neighborhoods.
- Prove Summit as the model-agnostic intelligence layer that keeps shared context across modalities and latency tiers.
- Pilot success criteria: (1) SME-rated hypothesis quality uplift, (2) reduction in manual synthesis time, (3) ability to follow multi-step analytic tasks without context loss.

## Analyst Workflow (Happy Path)

1. **Ingest & triage (fast path):** Flash model summarizes newly ingested sources (web/PDF/image/map/graph neighborhood) and proposes relevance tags + routing cues.
2. **Context assembly:** Orchestrator pulls graph neighbors, prior findings, and triage notes into a structured briefing pack.
3. **Hypothesis generation (thinking path):** Thinking model produces candidate hypotheses, confidence bands, disconfirming evidence requests, and collection tasks.
4. **Corroboration loop:** Orchestrator fans out targeted retrieval (graph queries + document spans + image crops + map tiles) and re-summarizes via fast model; thinking model cross-checks sources and updates hypothesis ledger.
5. **Narrative drafting:** Thinking model composes an analyst narrative (sourced bullets, timelines, map callouts, attachments) and proposes next steps. Fast model keeps running lightweight delta summaries to avoid drift.
6. **Delivery:** Outputs are stored as provenance-linked artifacts (graph nodes/edges + narrative + prompts) for replay and audit.

## Architecture (Model-Agnostic Intelligence Layer)

- **Ingress adapters:** Web scrapers, PDF/OCR, image/map tilers, and graph neighborhood fetchers normalize inputs into envelope `{source, modality, embeddings, thumbnails, spans, graph_refs}`.
- **Triage lane (flash):** Low-latency model prompts: relevance, entity/relationship extraction, and query suggestions. Emits `triage_cards` with confidence + recommended follow-up queries.
- **Hypothesis lane (thinking):** High-deliberation model prompts: hypothesis lattice, corroboration plan, and narrative drafting with citation schema.
- **Model router:** Policy-driven selection using latency SLO, modality, and cost caps; falls back to cached triage cards when the thinking lane is saturated.
- **Context manager:** Maintains bounded working set (time-decayed) with modality-aware chunking (documents via semantic windows, images via region crops, graph via k-hop neighborhoods). Records lineage for audit.
- **Retrieval mesh:** Combines graph queries, vector search, BM25, and map tile similarity; feeds both lanes with normalized evidence.
- **Guardrails:** Safety, PII, and provenance checks; refusal policy for unsupported media; prompt registry alignment via `prompts/registry.yaml`.
- **Observability:** Traces tagged by `analysis_id`, `lane`, `modality`; counters for hypothesis quality signals; structured events for SME ratings and time-to-synthesis.

## Data Flow (Pilot)

1. **Source intake:** Drop web/PDF/image/map into staging; enqueue `analysis_id`.
2. **Flash triage:** Generate `triage_cards` (entities, relationships, open questions) + suggested graph queries.
3. **Context assembly:** Execute graph queries, fetch historical notes, and build `briefing_pack` with citations.
4. **Thinking pass:** Produce hypotheses (with pro/con evidence), collection tasks, and risks.
5. **Corroboration fan-out:** Execute targeted retrieval; flash model summarizes deltas; thinking model updates hypothesis scores.
6. **Narrative + actions:** Produce narrative draft, recommended decisions, and follow-on collection list; persist to graph + file store.

## Pilot Tracks & Deliverables

- **T1: Multimodal intake + triage lane (flash).** Adapters + fast prompts; delivery = triage cards + routing cues.
- **T2: Hypothesis & corroboration lane (thinking).** Prompt set + scoring rubric + corroboration loop; delivery = hypothesis ledger + confidence bands.
- **T3: Narrative + ops integration.** Narrative templates with citation schema; evidence attachments (maps/images/graphs) and shareable dossier export.
- **T4: Observability & guardrails.** Tracing, SME rating capture, latency/cost SLOs, refusal and PII checks.

## Evaluation & Success Metrics

- **Hypothesis quality (primary):** SME rubric (novelty, corroboration, actionability) scored per hypothesis. Target: ≥20% uplift vs. baseline manual workflow.
- **Time-to-synthesis:** Median analyst time from intake to draft narrative. Target: -25%.
- **Context fidelity:** No loss of critical constraints across ≥5-step tasks (audit via trace replay and prompt snapshots).
- **Latency tiers:** Flash P50 < 1.5s; thinking P50 < 18s with backpressure fallback to cached triage cards.
- **Cost guardrails:** Per-analysis budget caps with router-enforced ceilings; alert on breach.

## Rollout Plan

- **Week 0:** Enable adapters (web/PDF/image/map) + graph neighborhood fetch; ship flash triage prompt v1 and tracing spans.
- **Week 1:** Add hypothesis lane prompts + corroboration mesh; wire SME rating form; enable budget-aware router.
- **Week 2:** Ship narrative templates with citations + map/image callouts; export to dossier; finalize guardrails (PII/refusal) and SLO dashboards.

## Risks & Mitigations

- **Context drift across lanes:** Use shared `analysis_id` state store + prompt snapshots per turn; enforce max-context with decay.
- **Latency spikes in thinking lane:** Queue with circuit breaker; fallback to flash summary + TODOs; surface backlog to analyst.
- **Multimodal extraction errors:** Run OCR quality gates, image crop validation, and map tile coordinate checks; flag low-confidence spans for manual review.
- **Evaluation blind spots:** SME rubric stored with trace IDs; weekly calibration using held-out analytic tasks.

## Innovation Opportunities

- Adaptive routing that blends flash and thinking outputs via learned scorer (context fidelity + cost); promotes speculative hypotheses only when corroboration coverage exceeds threshold.
- Multimodal evidence graph linking embeddings, bounding boxes, and map tiles to hypotheses for replayable provenance and proactive drift detection.
