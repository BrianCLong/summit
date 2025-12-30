---
title: "Concepts"
summary: "Core Summit concepts and navigation pointers for MVP-4."
version: "MVP-4-GA"
lastUpdated: "2025-12-30"
owner: "docs"
---

# Concepts

- **Golden path**: `make bootstrap && make up && make smoke` to guarantee a healthy local stack.
- **Runbook**: Graph-defined automation executed through the GraphQL schema (`Runbook`, `Run`, `RunState`).
- **Data plane**: Neo4j for graph traversal, Postgres for structured data, Redis for cache/rate limiting.
- **Observability**: OpenTelemetry exporters driven by `OTEL_EXPORTER_OTLP_TRACES_ENDPOINT` and `OTEL_EXPORTER_OTLP_METRICS_ENDPOINT`.

## Next steps

- Apply the concepts in the [first runbook tutorial](../tutorials/first-runbook.md).
- Refresh terminology in the [glossary](../glossary.md).
