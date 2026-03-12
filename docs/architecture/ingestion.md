# Data Ingestion Architecture

Summit uses a real-time event-driven ingestion pipeline called Switchboard. Switchboard acts as the wedge, normalizing, deduplicating, enriching, and routing events into the platform’s core services.

## Core Components
- **Connectors**: Fetch or receive data from various sources (REST APIs, Webhooks, CSV/S3, Database replication).
- **Normalization Engine**: Standardizes incoming data into the core IntelGraph entity model.
- **Debezium Lineage**: Tracks CDC (Change Data Capture) events from source databases to maintain a rigorous provenance ledger.
- **Routing Layer**: Dispatches normalized events to downstream consumers, such as the GraphRAG pipeline and Maestro agents.

## Workflow
1. Data arrives via a connector.
2. The payload is normalized and validated against schemas.
3. Switchboard logs the ingestion event to the Provenance Ledger.
4. The data is routed to the Knowledge Graph (Neo4j) and Vector Store for semantic chunking.
