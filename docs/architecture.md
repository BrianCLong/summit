# Architecture

## High Level
[Client/UI] — [GraphQL API] — [IntelGraph Core] — [Neo4j] — [Object Storage]
                                  |            \
                                  |             +— [Connector SDK (OSINT, SIEM, OTel)]
                                  +— [Agent Runtime (Runbooks)]
                                  +— [GraphRAG Index]

## Components
- **Core**: entity/relationship services, temporal/confidence handling, provenance logger, ABAC engine.
- **Storage**: Neo4j primary; object storage for evidence blobs; optional Kafka for ingest.
- **API**: GraphQL; Cypher executed behind resolvers; auth via JWT + ABAC enforcement.
- **Agent Runtime**: DAG of steps (query → transform → score → persist → notify); replayable; audit trail.
- **GraphRAG**: subgraph retrieval + context packer; prompts include facts + path explanations.

## Data Flow (OSINT ingest)
Connector → Normalize (mapping) → Upsert Entities/Edges (with confidence, timestamps, source) → Provenance ledger → Alerts/Runbooks.

## GA-Insight Architecture Extensions

The system is organized as a set of services connected through message queues and shared databases.
- **Gateway**: Node.js GraphQL API that fronts clients and proxies analytics requests.
- **Analytics**: Python service performing feature extraction, embeddings, and scoring jobs.
- **Web**: React client served through the gateway with Socket.IO for real-time events.
- **Datastores**: Neo4j for graph data, PostgreSQL for relational records, and Redis for caching/queues.
- **Provenance Ledger**: Utilities that track hashes for analytics artifacts to support signed reports.
Each component runs locally via `docker-compose` for development.
