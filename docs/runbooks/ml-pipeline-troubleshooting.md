# ML Pipeline Troubleshooting Guide

## Overview

This runbook addresses common issues in the ML Pipeline and Inference services. The system uses a microservices architecture for model serving.

## Common Issues

### 1. Inference Timeouts

**Symptoms:**
- API requests to `/api/inference` return 504 Gateway Timeout.
- Latency spikes in the `inference_latency_ms` metric.

**Diagnosis:**
1. Check the load on the inference service.
2. Verify if the model is loaded into memory (Cold Start).

**Resolution:**
- **Warmup:** Ensure models are warmed up before routing traffic.
- **Scaling:** Scale out the inference service if CPU usage is > 80%.

### 2. Model Loading Failures

**Symptoms:**
- Service fails to start or crashes repeatedly.
- Logs show `ModelNotFoundError` or OOM (Out of Memory) errors.

**Diagnosis:**
- Check the model registry/S3 bucket for the model artifacts.
- Check container memory limits.

**Resolution:**
- Verify the model path in the configuration.
- Increase the container memory limit (Request/Limit in K8s).

### 3. Data Drift / Low Accuracy

**Symptoms:**
- Model predictions are consistently poor or unexpected.

**Diagnosis:**
- Compare input data distribution with training data.
- Check for schema changes in the input features.

**Resolution:**
- Retrain the model with recent data.
- Rollback to the previous model version if a new deployment caused the regression.

## Maintenance

### Clearing Model Cache

To free up memory, unused models can be unloaded:
```bash
curl -X POST http://localhost:5000/admin/unload_models
```

### Health Checks

- Liveness: `/health/live`
- Readiness: `/health/ready` (checks if models are loaded)
