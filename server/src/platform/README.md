# IntelGraph Platform Phase 2 - Deep Systems

This directory contains the core platform components evolved for Phase 2.

## Components

### Maestro Core (`maestro-core`)
Distributed task execution engine.
- **Queue**: Abstraction for InMemory and Persistent (e.g. Postgres/Redis) queues.
- **Scheduler**: Priority-aware scheduling with SLA tracking.
- **API**: Stateless API for task management.

### IntelGraph Core (`intelgraph-core`)
Persistent graph storage.
- **Backend**: Abstraction for Graph storage.
- **PostgresBackend**: Persistent implementation using PostgreSQL JSONB.
- **API**: Multi-tenant graph access.

### LLM Core (`llm-core`)
Routing and Embeddings.
- **Router**: Selects LLM models based on Governance, Cost, and Task Category.
- **Embeddings**: Service for text embeddings.

### MaaS Billing (`maas/billing`)
Billing engine for multi-tenant usage.
- **Engine**: Generates invoices from usage records.
- **Collector**: Aggregates usage from system components.

### Governance Kernel (`governance-kernel`)
Data protection and redaction.
- **Redaction**: Utilities for PII masking based on sensitivity levels.

### Summitsight (`summitsight`)
Observability and SLOs.
- **SLOs**: Definitions and evaluation types.
