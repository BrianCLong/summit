# Hugging Face Sentiment Integration for the ML Engine

This document explains how the new Hugging Face powered sentiment analysis pipeline is wired into the IntelGraph ML engine, how it interacts with the ingest wizard, and how to query results through GraphQL.

## Overview

The integration introduces a Python FastAPI microservice that loads a pre-trained Hugging Face model (default: `cardiffnlp/twitter-roberta-base-sentiment-latest`) with support for both PyTorch and TensorFlow backends. The Node.js ML engine communicates with the Python service over HTTP and exposes a `/graphql` endpoint for clients. Predictions pulled from PostgreSQL ingestion batches are persisted to Neo4j for downstream analytics.

## Components

- **Python service (`apps/ml-engine/src/python/model_integration_service.py`)** – FastAPI server responsible for loading Hugging Face models, running inference, fetching unprocessed records from PostgreSQL, and writing predictions to Neo4j.
- **Entity resolution service (`apps/ml-engine/src/services/EntityResolutionService.ts`)** – Updated to call the Python service for direct text sentiment analysis or for full ingest wizard jobs.
- **GraphQL endpoint (`/graphql`)** – New schema that provides `sentiment` and `sentimentBatch` queries, enabling UI clients and the ingest wizard to request predictions using GraphQL.
- **Helm configuration** – Adds environment variables so Kubernetes deployments can configure Postgres/Neo4j access and Python service routing.
- **Pytest suite** – Validates the Python integration points with lightweight fakes for the pipeline, PostgreSQL, and Neo4j layers.

## Running Locally

1. **Install Node dependencies** (from repository root):

   ```bash
   pnpm install --filter @intelgraph/ml-engine
   pnpm --filter @intelgraph/ml-engine run build
   ```

2. **Install Python dependencies**:

   ```bash
   cd apps/ml-engine/src/python
   python3 -m venv .venv
   source .venv/bin/activate
   pip install -r requirements.txt
   ```

3. **Start the Python service**:

   ```bash
   uvicorn model_integration_service:app --host 0.0.0.0 --port 8001
   ```

4. **Start the Node.js ML engine**:

   ```bash
   cd ../../..
   pnpm --filter @intelgraph/ml-engine run dev
   ```

   By default, the Node service expects the Python service at `http://localhost:8001` and exposes GraphQL at `http://localhost:4003/graphql`.

## GraphQL Usage

Example query for a single text:

```graphql
query SentimentForText($text: String!) {
  sentiment(text: $text) {
    label
    score
    framework
    modelName
  }
}
```

Example query for an ingest job:

```graphql
query SentimentForJob($jobId: ID!) {
  sentimentBatch(jobId: $jobId, options: { limit: 50 }) {
    jobId
    processedCount
    predictions {
      text
      label
      score
      sourceId
      neo4jNodeId
    }
  }
}
```

## Ingest Wizard Flow

1. The ingest wizard writes normalized records to PostgreSQL (default table: `ingest_records`).
2. The ML engine invokes the Python service via `/ingest-wizard/run` with a `job_id`.
3. `PostgresIngestor` pulls the records, the Hugging Face model scores each text, and `Neo4jGraphWriter` persists the results.
4. The GraphQL `sentimentBatch` resolver returns the processed count along with the Neo4j batch identifier for traceability.

## Environment Variables

| Variable | Purpose | Default |
| --- | --- | --- |
| `PYTHON_SERVICE_URL` | Base URL used by the Node ML engine to reach the Python service | `http://localhost:8001` |
| `PYTHON_SERVICE_PREDICT_PATH` | Path for ad-hoc predictions | `/predict` |
| `PYTHON_SERVICE_INGEST_PATH` | Path for ingest wizard jobs | `/ingest-wizard/run` |
| `INGEST_WIZARD_DEFAULT_LIMIT` | Default number of records fetched per job | `100` |
| `POSTGRES_HOST`/`PORT`/`DB`/`USER`/`PASSWORD` | Connection details for ingestion data | `localhost` / `5432` / `intelgraph` / `intelgraph` / `password` |
| `NEO4J_URI`/`USERNAME`/`PASSWORD` | Target Neo4j database credentials | `bolt://localhost:7687` / `neo4j` / `password` |
| `HUGGINGFACE_MODEL` | Override the default Hugging Face model | `cardiffnlp/twitter-roberta-base-sentiment-latest` |
| `ML_PYTHON_DEFAULT_FRAMEWORK` | Backend (`auto`, `torch`, `tensorflow`) for the Python service | `auto` |

## Testing

Run the Python unit tests with pytest:

```bash
pytest apps/ml-engine/src/python/tests
```

The suite uses lightweight doubles so it runs quickly and does not require live PostgreSQL or Neo4j instances.

## Deployment Notes

- Helm values now include defaults for the Python service URL and database credentials so the ML engine can communicate with the ingest wizard and Neo4j in Kubernetes environments.
- The Python service can be deployed as a sidecar or as a standalone deployment; configure `PYTHON_SERVICE_URL` accordingly.
- Use persistent volumes or remote caches if you expect to download large Hugging Face models in production.

## Next Steps

- Add telemetry for sentiment inference latency and Neo4j persistence health checks.
- Extend the GraphQL schema with mutation support for manual reprocessing or feedback submission.
- Evaluate GPU-backed nodes for high-throughput inference workloads.
