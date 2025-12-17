# IntelGraph Production ML Infrastructure

## Architecture Overview

The IntelGraph ML Infrastructure is designed to provide end-to-end capabilities for model training, management, serving, and monitoring. It follows a microservices architecture to ensure scalability and maintainability.

### Components

1.  **ML Control Plane (`packages/mlops-platform`)**:
    *   **Role**: Orchestrates the ML lifecycle.
    *   **Technology**: TypeScript (Node.js).
    *   **Functionality**: Manages feature stores, model registry metadata, and triggers training jobs.

2.  **Model Serving (`services/ml-serving`)**:
    *   **Role**: Serves ML models for real-time inference.
    *   **Technology**: Python, FastAPI.
    *   **Functionality**: Loads models from MLflow/S3, exposes REST API (`/predict`), auto-scaling ready.

3.  **Training Worker (`services/ml-training`)**:
    *   **Role**: Executes training jobs.
    *   **Technology**: Python, PyTorch, MLflow.
    *   **Functionality**: Runs training loops, logs metrics to MLflow, saves artifacts.

4.  **Feature Store**:
    *   **Role**: Manages features for training and serving.
    *   **Implementation**: `FeatureStore` class in `mlops-platform`, capable of online (Redis) and offline (Postgres/S3) storage.

5.  **Monitoring**:
    *   **Role**: Tracks model performance and drift.
    *   **Implementation**: Prometheus metrics exposed by services, Drift Detection modules.

## Workflows

### 1. Training Pipeline

1.  User or system submits a training request via the Control Plane.
2.  Control Plane validates request and triggers `services/ml-training`.
3.  Training Worker executes the job, logging metrics to MLflow.
4.  On completion, model artifacts are registered in the Model Registry.

### 2. Model Deployment

1.  Models are versioned in the Registry.
2.  `services/ml-serving` loads the specified model version.
3.  Traffic can be routed to different versions for A/B testing.

### 3. Inference

1.  Client sends `POST /api/v1/predict` to Model Serving.
2.  Service fetches features (if needed) and runs inference.
3.  Result is returned and latency metrics are logged.

## API Usage

### Model Serving

**Predict**
`POST /api/v1/predict`
```json
{
  "model_name": "sentiment-analysis",
  "version": "v1",
  "data": [{"text": "Great service!"}]
}
```

**List Models**
`GET /api/v1/models`

### Training

**Trigger Training**
`POST /train` (Internal)
```json
{
  "model_name": "sentiment-analysis",
  "params": {"epochs": 10, "lr": 0.01}
}
```

## CI/CD Integration

*   Automated retraining on data drift detection.
*   GitHub Actions workflows for testing and deployment.
