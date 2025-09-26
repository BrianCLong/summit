# Federated Learning Support in Summit ML Engine

## Overview

Summit now supports privacy-preserving model training across tenant boundaries by orchestrating [TensorFlow Federated](https://www.tensorflow.org/federated) jobs inside the ML engine. Each tenant keeps its data local while contributing model updates that are aggregated into a single global model. The workflow is exposed via new GraphQL operations, and operational metrics are exported for Prometheus scraping.

## Architecture

1. **GraphQL layer** – The `startFederatedTraining` mutation calls the ML engine through the existing service mesh. A companion query (`federatedTrainingJob`) retrieves job status and metrics.
2. **ML engine API** – `/api/federated/train` writes federated job payloads to disk, launches the Python training runner, and tracks job metadata in-memory. `/api/federated/jobs/:jobId` provides job inspection.
3. **Python runner** – `federated_training.py` loads the client datasets, constructs a TensorFlow Federated weighted FedAvg process, runs the requested number of rounds, evaluates the resulting model, saves it to disk, and emits JSON metrics.
4. **Observability** – Prometheus metrics (duration, rounds, in-flight jobs, failures, processed examples) are exposed on `/metrics` when metrics are enabled.

![Federated learning data flow](https://tensorflow.org/site-assets/images/tff/federated-learning.svg)

## Configuration

| Setting | Environment Variable | Default | Description |
| --- | --- | --- | --- |
| Python script path | `PYTHON_SCRIPT_PATH` | `./src/python` | Location of ML engine Python utilities |
| Python executable | `PYTHON_EXECUTABLE` | `python3` | Interpreter used to launch training scripts |
| Federated rounds | `FEDERATED_ROUNDS` | `5` | Number of FedAvg rounds per job |
| Federated batch size | `FEDERATED_BATCH_SIZE` | `16` | Mini-batch size per client |
| Learning rate | `FEDERATED_LEARNING_RATE` | `0.01` | Optimizer learning rate |
| Model workspace | `FEDERATED_WORKSPACE` | `./models/federated` | Directory for global models & metrics |
| Metrics endpoint | `METRICS_ENABLED` | `true` | Enables `/metrics` endpoint |

## GraphQL Workflow

```graphql
mutation TrainFederated($input: FederatedTrainingInput!) {
  startFederatedTraining(input: $input) {
    jobId
    status
    metrics {
      roundsCompleted
      globalMetrics
      clientExampleCounts
    }
  }
}
```

Example variables:

```json
{
  "input": {
    "rounds": 3,
    "batchSize": 8,
    "clients": [
      {
        "tenantId": "tenant-a",
        "examples": [
          { "features": [0.0, 1.0, 0.2], "label": 1 },
          { "features": [0.1, 0.3, 0.8], "label": 0 }
        ]
      },
      {
        "tenantId": "tenant-b",
        "examples": [
          { "features": [0.9, 0.1, 0.4], "label": 1 },
          { "features": [0.5, 0.6, 0.7], "label": 0 }
        ]
      }
    ]
  }
}
```

Polling for job status:

```graphql
query FederatedJob($jobId: ID!) {
  federatedTrainingJob(jobId: $jobId) {
    status
    completedAt
    metrics {
      globalMetrics
      trainingLossHistory
    }
  }
}
```

## Metrics Reference

Prometheus metrics exported from the ML engine:

- `ml_engine_federated_training_duration_seconds` – Histogram of job durations.
- `ml_engine_federated_training_rounds_total` – Counter of completed rounds.
- `ml_engine_federated_training_examples_total` – Counter of processed examples.
- `ml_engine_federated_training_failures_total` – Counter of failed jobs.
- `ml_engine_federated_training_in_flight` – Gauge of currently running jobs.

## Operational Tips

- The Python runner requires `tensorflow` and `tensorflow-federated`; install via `pip install -r apps/ml-engine/src/python/requirements.txt`.
- For large datasets, consider provisioning a shared filesystem for the federated workspace to persist global models across restarts.
- Configure Prometheus to scrape the ML engine on the port defined by `METRICS_PORT` (defaults to 9093).
