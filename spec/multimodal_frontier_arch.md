# Summit Multimodal Frontier Stack v0.1

## Overview and Goals
- Expand Summit to handle images, PDFs/slides, structured tables, and UI screenshots.
- Wire multimodal signals into RAG, IntelGraph, and tool orchestration for graph-native reasoning.
- Provide a training and fine-tuning recipe aligned with the existing frontier stack.
- Deliver telemetry-driven curricula and commercialization hooks for document and UI understanding.

## Key Principles
- **Graph-native multimodality:** Convert visual and document structures into IntelGraph-compatible graphs for reasoning and traceability.
- **Tool-native reasoning:** Promote tool calls (OCR, chart parsers, table extractors, UI actioners) as first-class tokens and train heads for them.
- **Telemetry-driven curricula:** Continuously reweight modality/task exposure based on live failure telemetry (chart misreads, UI misclicks, table errors).
- **Long-context resilience:** Efficient chunking, layout-aware packing, and reference caching to handle long PDFs and multi-screen UI flows.
- **Governance and privacy:** Redact sensitive regions in images/docs, enforce tenancy boundaries, and log knowledge traces.

## Architecture
### Model
- **Backbone:** Decoder-only 1.3B LM extended with a ViT-like vision encoder and a document layout encoder (shared backbone with layout heads).
- **Tokenization:** Visual/doc tokens interleaved with text tokens; optional cross-attention blocks for modality fusion.
- **Heads:**
  - Graph head predicting region/entity/relation edges for IntelGraph.
  - Tool-call head specialized for multimodal tools (crop, OCR, table parser, UI-action executor).
  - Alignment head for redaction/PII flags on visual spans.

### Data Engine Integration
- **Modalities:** image+caption, doc+QA (PDF, slide), chart+QA, table QA, UI+instruction.
- **Schemas:** JSON Schemas under `impl/multimodal/schemas/` for images, docs, layout, and UI graphs.
- **Telemetry:** Per-modality loss, failure types (chart misread, UI misclick), latency per tool, and coverage of graph supervision.
- **Mixing:** Curriculum scheduler that upweights tasks with highest failure deltas; supports capped token budgets.

### Runtime & Tooling
- **Ingress:** File uploads (images, PDFs), external storage references, and structured UI events.
- **Pre-process DAG nodes:**
  - Detectors (layout regions, objects, tables, charts, UI elements).
  - OCR/table parsers/chart parsers producing layout-aware text and graph features.
  - Region cropping & captioning for salient snippets.
- **Graph Builder:** Transforms detector outputs into IntelGraph subgraphs (pages → blocks → lines → tokens; UI screens → elements → actions).
- **Reasoning Loop:**
  - Prompts include interleaved multimodal tokens and retrieved graph snippets.
  - Tool routing policy predicts when to OCR, parse tables, or execute UI actions.
  - Knowledge traces log which visual regions and graph nodes were used per answer.

### RAG & Knowledge Store
- **Storage:** Persist multimodal chunks (text+visual embeddings) and graph projections; index by modality, page, region, and semantic tags.
- **Retrieval:** Hybrid search over text embeddings, visual embeddings, and graph neighborhoods; supports region-level retrieval for diagrams/tables.
- **Traces:** Store provenance (region IDs, page references, detector versions) to supervise future fine-tunes.

### Training & Finetuning Recipe
- **Pretraining warm-start:** Initialize LM from text checkpoint; initialize vision/layout encoder from public ViT/LayoutLM weights; add projection to token space.
- **Finetune phases:**
  1. **Static mix:** Balanced multimodal tasks with tool-call supervision.
  2. **Graph-aware:** Add graph head losses and IntelGraph supervision on tables/diagrams/UI layouts.
  3. **Telemetry-adaptive:** Reweight tasks/tools using failure telemetry; schedule extra chart/UI batches where errors spike.
- **Optimization:** QK rotary for long context, fused attention kernels, activation checkpointing; mixed precision (bf16) with clipping.
- **Evaluation:** VQA, DocQA, ChartQA, UI QA; ablations for graph head vs none, tools vs model-only.

### Security, Safety, and Compliance
- Redaction filters for images/docs before storage; optional on-the-fly blur for PII regions.
- Tenant-aware isolation for graph storage and retrieval.
- Safety classifier for unsafe visual content; UI action guardrails (allowlist of actions, sandboxed execution).
- Audit logs for tool invocations and region-level provenance.

### Observability
- Metrics: per-modality loss, tool latency/success, retrieval hit-rate by modality, graph edge F1, UI action success.
- Traces: multimodal request spans with tool DAG timing.
- Logs: structured JSON with document/page IDs, region hashes, and tool versions.

### Deployment & Ops
- **Serving:**
  - Multimodal inference workers with GPU; attach OCR/chart/table microservices.
  - Caching of extracted layouts and embeddings; CDN for static snippets.
- **Artifacts:**
  - Model checkpoints tagged by modality mix and tool-policy version.
  - Detector/processor docker images versioned alongside.
- **Rollout:** canary multimodal endpoints; automatic fallback to text-only with OCR when vision stack degraded.

## Milestones (v0.1)
- Day 1–2: Spec + prior art logged.
- Day 3–4: `impl/multimodal` skeleton, schemas, config validation.
- Day 5–6: Runtime ingestion path with OCR/table/chart detectors; demo Q&A flow.
- Day 7–8: Small finetune; experiments for graph/tool ablations.
- Day 9–10: IP filings, commercialization briefs, sprint report.

## Open Risks and Mitigations
- Scope creep: limit to images/docs/simple UIs for v0.1; audio/video deferred.
- Tool latency: cache OCR/layout; async heavy tools; track SLOs.
- Data sparsity for UI tasks: leverage synthetic flows and templated app screens.
- Graph complexity: start with minimal layout/table/UI schemas; expand iteratively.
