# Federated Learning Deployment Guide

This guide describes how to deploy the Summit federated learning runtime on Kubernetes clusters. It covers dependency preparation, configuration of the new GraphQL mutation, and the operational patterns required to satisfy GDPR-aligned differential privacy guarantees.

## 1. Prerequisites

1. **Container image** – Build an image from the `python/` directory with TensorFlow and TensorFlow Federated:
   ```bash
   docker build -t summit-ml-federated -f python/Dockerfile .
   ```
   Add the following extras to the runtime image:
   ```bash
   pip install tensorflow==2.16.1 tensorflow_federated==0.71.0
   ```
2. **Kubernetes secrets** – Store Postgres credentials, Celery broker URL, and optional S3 client secrets as Kubernetes secrets. The Celery worker requires the same environment variables as the API pod (`DATABASE_URL`, `CELERY_BROKER_URL`, `CELERY_RESULT_BACKEND`).
3. **Persistent volumes** – Provision a `ReadWriteMany` volume if you plan to mount static datasets that will be referenced by clients through file paths.

## 2. Deploying the Celery Worker

The Celery worker executes the `run_federated_training_job` task and must run in an environment with TensorFlow Federated available.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: summit-federated-worker
spec:
  replicas: 2
  selector:
    matchLabels:
      app: summit-federated-worker
  template:
    metadata:
      labels:
        app: summit-federated-worker
    spec:
      containers:
        - name: worker
          image: summit-ml-federated:latest
          command: ["celery", "-A", "intelgraph_py.tasks", "worker", "-Q", "federated"]
          env:
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: summit-database
                  key: url
            - name: CELERY_BROKER_URL
              valueFrom:
                secretKeyRef:
                  name: summit-celery
                  key: broker
            - name: CELERY_RESULT_BACKEND
              valueFrom:
                secretKeyRef:
                  name: summit-celery
                  key: backend
          volumeMounts:
            - mountPath: /data/federated
              name: federated-datasets
      volumes:
        - name: federated-datasets
          persistentVolumeClaim:
            claimName: federated-datasets-pvc
```

*Route federated tasks to a dedicated queue (`federated`) to avoid interfering with other analytics workers.*

## 3. API / GraphQL Service Configuration

1. **Environment variables** – Ensure the API pod exposes the same database DSN.
2. **Queue routing** – Update the application settings (e.g., `CELERY_TASK_ROUTES`) so that `run_federated_training_job` is sent to the federated queue.
3. **Network policy** – Grant outbound access only to object storage or on-premise dataset endpoints used by each tenant. All other egress should remain blocked to respect data residency.

## 4. Launching Federated Jobs

1. Upload tenant-specific datasets to their respective storage locations (S3, Azure Blob, or an NFS mount). Each dataset should contain JSON records in the `{"features": [...], "label": ...}` structure.
2. Call the GraphQL mutation from an automation client or the Summit console:
   ```graphql
   mutation StartFederatedJob($config: FederatedTrainingConfigInput!, $clients: [FederatedClientInput!]!) {
     startFederatedTrainingJob(jobName: "tenant-a-link-prediction", config: $config, clients: $clients) {
       id
       status
       privacyBudget
     }
   }
   ```
3. Poll `getFederatedTrainingJob(id)` until the status transitions to `SUCCEEDED`.

## 5. Differential Privacy & GDPR Controls

- **Noise multiplier** – The new configuration supports Gaussian noise with custom multipliers. Use the internal privacy calculator (`gaussian_dp_epsilon`) to verify that `epsilon` and `delta` satisfy local compliance policies (e.g., `ε ≤ 3`, `δ ≤ 1e-5`).
- **Client sampling** – Configure `clientsPerRound` to honour contractual data minimisation agreements. Lower sampling improves privacy but increases convergence time.
- **Audit logging** – Persist the `privacy_budget` JSON returned by the GraphQL queries to your compliance datastore to build an evidence trail for GDPR Article 30 records.

## 6. Observability

1. **Metrics** – Scrape Celery worker metrics (process CPU, GPU utilisation if enabled, and task duration). Expose a Prometheus endpoint using the existing Summit metrics sidecar.
2. **Tracing** – Inject job IDs into OpenTelemetry traces by extending the Celery `task_prerun` signal. This ties federated rounds to user-initiated GraphQL calls.
3. **Alerts** – Configure alerts for:
   - Task failures (`job.status == FAILED`)
   - Privacy budget overshoot (epsilon greater than allowed threshold)
   - Queue backlog greater than `federated_queue_backlog_threshold`

## 7. Rolling Updates

1. Drain the queue by setting the worker deployment replicas to zero and waiting for `celery inspect active` to return no jobs.
2. Deploy the new image, run database migrations if the federated job table changed, and scale workers back up.
3. Use the `getFederatedTrainingJob` query to verify in-progress jobs resumed without error.

Following these steps allows Summit operators to launch distributed, privacy-preserving training workloads without centralising sensitive data while remaining compliant with GDPR obligations.
