# Product Requirements Document (PRD)

**Working title:** Evidence‑First Retrieval → GraphRAG → DAG Runbooks → Multimodal v1  
**Doc owner:** Elara Voss (PM/SM)  
**Decision date:** 22 Sep 2025  
**Status:** Draft (v0.1)

---

## 1) Problem & Goals

**Problem.** Analysts need explainable, cited answers over heterogeneous evidence (docs, audio, images, telemetry) and the knowledge graph, plus repeatable tradecraft flows. Current workflows are slow, non‑auditable, and non‑repeatable.

**Goals (OKRs).**

- **O1 (Trust):** Deliver cited answers with verifiable provenance and graph path rationale.
- **O2 (Speed):** Cut time‑to‑first‑answer (TTFA) by **≥50%** for top 5 queries.
- **O3 (Repeatability):** Orchestrate 2–3 high‑value runbooks as audited DAGs.
- **O4 (Coverage):** Ingest and synthesize text + speech (OCR/STT) now; prepare rails for broader multimodal.

**Non‑Goals (v1).** Gen‑summaries without citations, image generation, fine‑tuned LLM training, geo‑simulators.

---

## 2) Users & Jobs‑to‑be‑Done

- **Investigator/Analyst:** Ask natural‑language questions and receive cited, explainable answers. Save/share briefs.
- **Case Lead:** Run/monitor prescribed analytic flows (DAG runbooks) with auditable outputs.
- **Reviewer/Compliance:** Verify provenance, redactions, and graph paths during export.

---

## 3) Scope (v1)

**In‑Scope**

1. **Evidence‑First RAG:** Index case corpus with redaction awareness; return snippets + inline citations; export provenance manifest.
2. **GraphRAG (NL→Cypher):** NL query → Cypher preview → execution over subgraph; return answer with **path rationale**.
3. **DAG Runbooks:** Orchestrate 2–3 flows (e.g., Rapid Attribution, Entity Resolution). Replayable logs, step KPIs, acceptance checks.
4. **Multimodal v1:** OCR + STT at ingest; attach derived text to graph Evidence nodes; show in tri‑pane (timeline/map/graph).

**Out‑of‑Scope**

- Real‑time sensor fusion, video analytics, LLM agents that autonomously act, write‑back mutations via NL (write remains gated).

---

## 4) Requirements

**Functional**

- R1: NL Q&A returns ranked answers with **inline citations** and snippet previews.
- R2: Graph answers include **path(s) used** and time/geo constraints applied.
- R3: Runbooks execute as **DAGs** with per‑step retries, guardrails, and artifacts.
- R4: OCR/STT outputs stored as first‑class, linkable evidence with provenance and redaction metadata.
- R5: Exports bundle a **provenance manifest** (sources, timestamps, graph paths).

**Non‑Functional**

- N1: P95 TTFA ≤ **5s** for top 5 canned queries on a 100k‑doc corpus.
- N2: Deterministic re‑run of a DAG yields identical artifacts (version‑pinned).
- N3: All user‑visible answers cite at least one source.

---

## 5) Milestones & Target Dates

- **M1 — Evidence‑First RAG MVP:** 22 Sep → **10 Oct 2025**
  - Indexer + citations, redaction‑aware ingest, provenance on export.
- **M2 — Graph Bridge (NL→Cypher + GraphRAG):** **11–24 Oct 2025**
  - Cypher preview, sandbox exec (read‑only), path rationale in answers.
- **M3 — DAG Runbooks (2–3 flows):** **25 Oct – 07 Nov 2025**
  - Orchestration, logs, KPIs, acceptance gates, replay.
- **M4 — Multimodal v1 (OCR/STT):** **08–21 Nov 2025**
  - Batch OCR/STT, attach to graph, UI surfacing in tri‑pane.

**Cutline:** If risk spikes, defer M4; ship M1–M3 as GA.

---

## 6) Acceptance Tests (per milestone)

**M1 — RAG**

- AT‑1.1: Given a query, system returns top answer with ≥1 inline citation; clicking shows snippet with highlighted spans.
- AT‑1.2: Exported brief includes machine‑readable provenance manifest listing sources, timestamps, and redaction flags.
- AT‑1.3: P95 TTFA ≤ 5s on reference corpus.

**M2 — GraphRAG**

- AT‑2.1: NL query produces human‑readable **Cypher preview**; user approves before execution.
- AT‑2.2: Answer panel shows **graph path(s)** used with entities, relations, and temporal bounds.
- AT‑2.3: Filters by time range and geo constrain the result set correctly (spot‑checked).

**M3 — DAG Runbooks**

- AT‑3.1: Operator can start/stop/retry steps; all artifacts versioned and downloadable.
- AT‑3.2: Re‑running same inputs yields byte‑identical outputs.
- AT‑3.3: Runbook dashboard shows step duration, success rate, and SLA badges.

**M4 — Multimodal v1**

- AT‑4.1: PDFs/images/audio ingest create derived text linked to Evidence nodes.
- AT‑4.2: Redactions persist from source to derived text.
- AT‑4.3: Tri‑pane UI surfaces derived text on timeline; clicking jumps to map/graph context.

---

## 7) Metrics & Telemetry

- **Trust:** % answers with ≥1 citation; reviewer rejection rate.
- **Speed:** TTFA (p50/p95); runbook wall‑clock.
- **Repeatability:** DAG re‑run determinism rate; failed‑step MTTR.
- **Adoption:** Weekly active analysts; runbooks per week; saved briefs per analyst.

---

## 8) Risks & Mitigations

- **Index drift / hallucinations:** Pin model versions; require citations for render; add guardrail tests.
- **Graph sprawl:** Subgraph scoping + TTL; query cost caps.
- **PII handling:** Redaction at ingest; audit logs; least‑privilege exports.
- **Latency:** Hybrid retrieval, caching, pre‑computed embeddings.

---

## 9) Dependencies

- Vector store + graph DB; OCR/STT service; redaction service; identity/roles; UI tri‑pane; observability (logs, traces, metrics).

---

## 10) Rollout & Comms

- Private preview (5 analysts) → Beta (20) → GA.
- Changelog + playbook + 15‑min enablement video; weekly office hours.

**Appendix:** Detailed schema, exemplar Cypher, runbook YAMLs to follow in v0.2.
