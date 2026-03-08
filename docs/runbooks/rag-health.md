# RAG System Health Runbook

## Overview
The RAG Health Dashboard (`/admin/rag-health`) provides real-time visibility into the Retrieval-Augmented Generation pipeline, covering both Vector RAG and Graph RAG components.

## Metrics
- **Retrieval Latency**: Time taken to retrieve context from Vector DB (Chroma) and Graph DB (Neo4j).
- **Query Volume**: Number of queries processed.
- **Collection Size**: Number of documents indexed in ChromaDB.
- **GraphRAG Uptime**: Uptime of the GraphRAG service.
- **Component Health**: Connectivity status of Redis, Postgres, Neo4j, and OpenAI.

## Alerts
- **High Latency**: If p95 latency exceeds 2s.
- **Component Down**: If any dependency (Redis/Neo4j) is unreachable.

## Troubleshooting

### High Latency
1. Check `rag` and `graphrag` service logs.
2. Verify Redis latency.
3. Check OpenAI API status.

### Component Failure
1. If `rag` status is unhealthy, restart the service: `docker restart rag`.
2. Check database connectivity.

## Dashboard Access
Navigate to `/admin/rag-health` in the IntelGraph web application.
