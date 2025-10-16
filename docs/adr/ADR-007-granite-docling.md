# ADR-007: Granite Docling 258M for Build Artifact Intelligence

## Status

Accepted – 2025-09-02

## Context

Build logs, SBOMs, and compliance artifacts were previously parsed with ad-hoc regex pipelines. Summaries and license extraction were inconsistent, resulting in slow triage, patchy evidence, and manual compliance escalations.

We evaluated:

- **Granite Docling 258M** – purpose-built for document parsing with strong PDF/log handling and deterministic token costs.
- **Open-source OCR + heuristics** – predictable but poor on mixed artifacts.
- **General LLMs (GPT-4o mini, Claude 3 Sonnet)** – high quality summaries but cost prohibitive for CI volumes and lacked PDF-native parsing.

Granite Docling offered a balance of accuracy, cost (< $0.10/1k artifacts), and deployment control (self-hostable via OCI image). Benchmarks on 50 golden artifacts showed:

- +14% failure root-cause precision
- +18% actionable fix recall
- +12% license extraction F1 vs baseline

## Decision

Adopt Granite Docling 258M behind a dedicated `docling-svc` microservice with:

- mTLS + OPA enforcement for purpose/retention.
- OTEL + Prometheus telemetry for latency, throughput, and cost per tenant.
- Provenance ledger entries for every inference.
- Integration into Maestro pipelines for build failure triage, compliance extraction, and release-note drafting.

## Consequences

- **Positive**: Faster triage, automated compliance evidence, reliable release summaries, single observability surface.
- **Negative**: Additional service to operate (cost and on-call), need to maintain model updates and drift checks.
- **Mitigation**: Blue/green Argo rollout, canary dataset regression tests, cost budgets wired to TenantCostService.

## Follow-up

- Evaluate fine-tuning prompts for SARIF-heavy repositories.
- Expand to handle long-context PDF stitching once RAG iteration begins.
