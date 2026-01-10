# Roadmap Pressure Forecast

## Purpose

Anticipate how Year-1/Year-2 capabilities stress core subsystems so we can pre-allocate capacity and budgets, avoiding late-cycle regressions.

## Method

1. Map roadmap epics to subsystems and demand drivers (QPS, token volume, storage growth, policy evaluation rate).
2. Estimate multipliers vs the current baseline using expected adoption scenarios (low/base/high).
3. Flag capacity or cost risks and pair each with mitigations and owners.

## Epic-to-Subsystem Mapping

| Roadmap Epic                | Subsystems                                 | Demand Driver                 | Multiplier (Base)                | Risk Level | Mitigation                                              |
| --------------------------- | ------------------------------------------ | ----------------------------- | -------------------------------- | ---------- | ------------------------------------------------------- |
| A1 Local Vector Store       | Retrieval, storage, embeddings service     | Embedding writes/reads        | 1.6x storage, 1.3x read QPS      | Medium     | Tiered storage, batch upserts, recall-aware compaction  |
| A2 RAG Ingestion Pipeline   | Ingestion mesh, connectors, queue          | Ingestion QPS and parsing CPU | 2.0x ingestion QPS               | High       | Batching + backpressure via queue depth alerts          |
| B1 Connector SDK & Registry | Registry API, policy engine                | Connector metadata CRUD       | 1.2x registry writes             | Low        | Cache metadata reads, rate-limit connector registration |
| B2 RSS/Atom Connector       | Ingestion mesh, parser workers             | Scheduled fetches + parsing   | 1.4x ingestion QPS               | Medium     | Adaptive polling intervals, per-feed quotas             |
| B3 STIX/TAXII Connector     | Ingestion mesh, storage, schema validation | Bulk structured ingest        | 1.8x ingestion QPS, 1.5x storage | High       | Pre-validate batches, schema-aware compression          |
| C2 Immutable Audit Log      | Storage, provenance ledger, policy engine  | Write amplification           | 1.3x write IOPS                  | Medium     | Append-only log with checkpointed compaction            |
| D1 KTOON Core Libraries     | Copilot inference                          | Token throughput              | 1.2x tokens per request          | Medium     | Prompt compaction + adaptive truncation                 |

## Capacity Risk Register

- **Ingestion Mesh:** High risk once RSS/Atom and STIX/TAXII land. Actions: enforce bounded batch size, autoscale parsers on queue depth, add retry jitter.
- **LLM Inference Costs:** Token growth due to richer prompts and tool metadata. Actions: enable prompt compaction, cap tool outputs, cache deterministic tool results.
- **Storage Footprint:** Vector store + immutable audit logs. Actions: compression, TTL for cold data, and scoped retention policies per tenant.
- **Policy Engine Load:** More connectors increase policy evaluations. Actions: cache policy decisions for short TTL where safe; ensure OPA bundles are pre-warmed.

## Forecasted Guardrails (to feed budgets)

- `cost_per_1k_tokens` must remain <= 0.0035 at base load; allow 10% headroom for roadmap-induced growth.
- `latency_p95_ms` must stay <= 1500ms under base scenario and <= 1800ms under high scenario.
- `error_rate` must remain <1% with same or improved SLA headroom.

## Owners & Review Cadence

- Forecast review every sprint with `governance` + `devops`.
- Owners: Ingestion (Amp), LLM Efficiency (Jules), Policy/Compliance (Security Council rep), Storage (Data Engineering).
