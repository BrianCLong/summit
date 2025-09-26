# MLflow Model Versioning Workflow

This guide explains how the cognitive targeting engine now tracks Hugging Face
models and inference telemetry with MLflow, and how to manage deployments via
the Summit GraphQL API.

## Prerequisites

- Python 3.11+
- Access to the Summit repository
- Optional: access to a Kubernetes cluster for deployment jobs

## 1. Install Dependencies

```bash
pip install -r cognitive-targeting-engine/requirements.txt
```

The requirements file now includes MLflow so that experiments and model
registrations can be recorded locally or against a remote tracking server.

## 2. Bootstrap MLflow and Register a Model Version

Use the helper script to create a tracking store entry and model registry
version that corresponds to a Hugging Face snapshot.

```bash
python cognitive-targeting-engine/scripts/setup_mlflow.py \
  cognitive-targeting-engine \
  j-hartmann/emotion-english-distilroberta-base \
  --hf-revision main \
  --description "Baseline emotion classifier" \
  --tag stage=staging
```

The script will:

1. Initialise the tracking URI (defaults to a local `mlruns/` directory).
2. Log a run with the supplied metadata and export a `model-metadata.json`
   artifact.
3. Create or reuse the MLflow registered model and register a new version that
   points at the logged artifact.

Set `MLFLOW_TRACKING_URI` before running the script to register against a remote
tracking server.

## 3. Runtime Logging from the FastAPI Engine

Each `/analyze` request now records an MLflow run with the following details:

- Parameters: model identifier, resolved Hugging Face revision, pipeline task,
  and the detected dominant emotions.
- Metrics: total inference latency (milliseconds), the number of candidate
  emotions returned by the pipeline, and the count of dominant emotions above
  the decision threshold.
- Tags: engine identifier and deployment environment.

The API response includes `model_version` and `mlflow_run_id` fields so that a
specific inference can be traced back to its experiment run.

## 4. Inspect Model Versions via GraphQL

Query the model registry through the Summit GraphQL endpoint:

```graphql
query Versions {
  mlModelVersions(modelName: "cognitive-targeting-engine") {
    version
    status
    createdAt
    runId
    params
    metrics
  }
}
```

The resolver proxies the MLflow REST API, normalising parameters, metrics, and
tags so they can be consumed by the UI or automation.

## 5. Deploy a Model Version with Kubernetes Jobs

Trigger a deployment job from GraphQL once a version is ready:

```graphql
mutation Deploy {
  deployModelVersion(
    input: { modelName: "cognitive-targeting-engine", version: "1" }
  ) {
    jobName
    namespace
    status
    submittedAt
  }
}
```

- The resolver validates that the caller is authenticated and has an `ADMIN`,
  `OPERATOR`, or `ML_ENGINEER` role.
- A Kubernetes `Job` is created using `@kubernetes/client-node`, defaulting to
  the `mlflow/mlflow` container image (override with the `image` field if
  necessary).
- Environment variables include the model name, version, and tracking URI so
  the job can pull the correct artifact using `mlflow models serve`.

Set the following environment variables on the server to customise deployments:

- `MLFLOW_TRACKING_URI` – REST endpoint of the tracking server.
- `ML_MODEL_DEPLOY_NAMESPACE` – Kubernetes namespace for deployment jobs.
- `ML_MODEL_DEPLOY_IMAGE` – Container image that will execute the MLflow CLI.

## 6. Testing the Integration

Run the dedicated pytest suite to validate the tracking helpers:

```bash
pytest cognitive-targeting-engine/tests/test_mlflow_tracking.py
```

The tests create a temporary MLflow store, log an inference run, and register a
model version to ensure the workflow is reproducible.

---

This workflow keeps Summit's Hugging Face integrations compatible while adding
end-to-end observability for experiment tracking, registry management, and
Kubernetes-based deployment automation.
