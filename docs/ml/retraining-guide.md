# Summit ML Retraining Guide

This guide explains how the automated retraining pipeline works across the
feed-processor, Python ML engine, Kubernetes, and MLflow.

## Overview

1. **Data ingestion** – the `feed-processor` service writes graph entities to
   Neo4j with an `ingestion_job` marker. The ML service monitors new jobs using
   the `FeedDataFetcher` abstraction.
2. **Retraining orchestration** – the FastAPI service exposes a
   `/models/{modelId}/retrain` endpoint backed by the `RetrainingManager`.
   Retraining is triggered automatically when enough unseen records are
   available, and can also be started manually via GraphQL.
3. **Kubernetes scheduling** – retraining runs execute as Kubernetes Jobs using
   the `KubernetesJobScheduler`. Job manifests embed the model ID, MLflow run ID
   and the time window of the training data.
4. **MLflow tracking** – every retraining job starts an MLflow run via the
   `MLflowTracker` wrapper. Metrics emitted when the job completes are logged to
   the configured MLflow experiment (`intelgraph-retraining`).
5. **Observability** – retraining job status and metadata are available through
   new GraphQL queries (`mlRetrainingJobs`, `mlRetrainingJob`) for dashboards and
   alerting.

## Triggering Retraining

You can schedule retraining in several ways:

- **Automatic** – when the ML service detects more than the configured minimum
  number of new feed records, it schedules a job and returns its status.
- **GraphQL Mutation** – call the `triggerMLRetraining` mutation with a model ID
  and optional reason string. The GraphQL API forwards the request to the Python
  service.
- **REST Endpoint** – send a POST request to
  `POST /models/{modelId}/retrain` on the ML FastAPI service with an optional
  JSON payload `{ "reason": "manual backfill" }`.

Each retraining job surfaces:

- Data window and record counts pulled from feed-processor outputs.
- Kubernetes job name and namespace.
- MLflow run identifier for lineage and artifact access.
- Status timestamps (scheduled, started, completed) and optional error context.

## Monitoring Jobs

- Use the REST endpoints `GET /retraining/jobs` and
  `GET /retraining/jobs/{jobId}` to inspect job metadata.
- For automation, workers can send progress updates to
  `POST /retraining/jobs/{jobId}/events` with status transitions and evaluation
  metrics.
- GraphQL consumers can query `mlRetrainingJobs` or `mlRetrainingJob(jobId)` to
  power dashboards.

## Configuration

- MLflow settings live in `ml/config/mlflow_retraining.yaml`. Override the
  `MLFLOW_TRACKING_URI` and `MLFLOW_ARTIFACT_URI` environment variables to point
  at your MLflow deployment.
- Kubernetes scheduling respects the optional environment variables
  `RETRAINING_NAMESPACE`, `RETRAINING_IMAGE`, and `RETRAINING_SERVICE_ACCOUNT`.
- Minimum records before retraining defaults to 50 but can be tuned when
  constructing the `RetrainingManager`.

## Local Testing

Run the new pytest suite to validate retraining orchestration logic:

```bash
pytest ml/tests/test_retraining_manager.py
```

The tests cover scheduling, data thresholds, and status updates, and rely on
stubbed dependencies so no external services are required.
