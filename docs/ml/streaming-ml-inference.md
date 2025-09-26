# Streaming ML Inference Pipeline

This guide explains how Summit's ML engine processes real-time data from Kafka, publishes low-latency predictions, and exposes them to clients through GraphQL subscriptions. It also covers Prometheus instrumentation and local testing tips.

## Architecture Overview

1. **Kafka ingestion** – `StreamingInferenceEngine` consumes JSON messages from the `ml.inference` topic (configurable via `KAFKA_INFERENCE_TOPIC`). Each message should contain a `model_id`, `features`, and optional metadata.
2. **Model execution** – Messages are scored using either PyTorch or TensorFlow adapters. The engine supports TorchScript models, SavedModels, or an identity fallback for rapid prototyping.
3. **Redis fan-out** – Prediction payloads are pushed to a Redis Pub/Sub channel (`ml:stream:inference` by default). This decouples Python inference from the Node GraphQL tier and provides simple horizontal scalability.
4. **GraphQL subscriptions** – The `MLStreamingMonitor` listens to Redis, normalizes payloads, and forwards them to the `mlInferenceStream` subscription. Clients receive structured updates with prediction data, latency, and metadata.
5. **Observability** – Prometheus counters and histograms expose throughput and latency. Grafana panels can alert when latency breaches SLOs or throughput drops unexpectedly.

```
Kafka ─▶ StreamingInferenceEngine (PyTorch/TensorFlow)
       └─▶ Redis Channel ─▶ MLStreamingMonitor ─▶ GraphQL Subscription
```

## Python Streaming Service

The streaming loop lives in [`apps/ml-engine/src/python/streaming_inference.py`](../../apps/ml-engine/src/python/streaming_inference.py). Key environment variables:

| Variable | Description | Default |
| --- | --- | --- |
| `KAFKA_BOOTSTRAP_SERVERS` | Kafka brokers list | `localhost:9092` |
| `KAFKA_INFERENCE_TOPIC` | Topic to consume | `ml.inference` |
| `KAFKA_CONSUMER_GROUP` | Consumer group id | `ml-streaming` |
| `REDIS_URL` | Redis connection string | `redis://localhost:6379/0` |
| `ML_STREAM_REDIS_CHANNEL` | Pub/Sub channel for predictions | `ml:stream:inference` |
| `ML_MODEL_FRAMEWORK` | `torch` or `tensorflow` | `torch` |
| `ML_MODEL_PATH` | Optional path to model artifact | _unset_ |
| `ML_PROMETHEUS_PORT` | Port to expose metrics | _unset_ (disabled) |

Run the service locally after installing dependencies:

```bash
pip install -r apps/ml-engine/src/python/requirements.txt
python apps/ml-engine/src/python/streaming_inference.py
```

Messages published to Kafka must be JSON, for example:

```json
{
  "model_id": "threat-detector-v1",
  "input_id": "event-42",
  "features": [[0.12, 0.04, 0.98]],
  "metadata": {"tenant": "blue-team", "source": "threat.clusters"}
}
```

## GraphQL API

The GraphQL schema exposes streaming predictions and status insights:

- `subscription mlInferenceStream(modelId: String!): MLStreamingPrediction!`
- `query mlStreamingStatus(modelId: String!): MLStreamingStatus!`

Example subscription (Apollo Sandbox or any WebSocket GraphQL client):

```graphql
subscription WatchPredictions($modelId: String!) {
  mlInferenceStream(modelId: $modelId) {
    inferenceId
    latencyMs
    receivedAt
    predictions
    metadata
  }
}
```

To monitor connection health, poll the status query:

```graphql
query Status($modelId: String!) {
  mlStreamingStatus(modelId: $modelId) {
    connected
    lastHeartbeatAt
    averageLatencyMs
  }
}
```

Behind the scenes, [`MLStreamingMonitor`](../../server/src/services/MLStreamingMonitor.ts) subscribes to Redis, keeps a sliding latency window, and fans out updates through the GraphQL `PubSub` layer.

## Prometheus Metrics

`MetricsRecorder` emits the following series (labels keyed by `model_id`):

- `ml_stream_inference_latency_seconds` (histogram)
- `ml_stream_inference_predictions_total`
- `ml_stream_inference_errors_total`

Expose them by setting `ML_PROMETHEUS_PORT`, then scrape `http://<ml-engine-host>:<port>/metrics`. Recommended alerts:

- Latency p95 > 250 ms for 5 minutes.
- Error rate > 1% of total predictions.

## Testing

Pytest coverage for the streaming loop lives in [`apps/ml-engine/tests/test_streaming_inference.py`](../../apps/ml-engine/tests/test_streaming_inference.py). The tests mock Kafka, Redis, and the model adapter to validate:

- Successful publishes increment Prometheus counters/histograms.
- Failures increment error counters without crashing the loop.
- Default model IDs are respected when missing from payloads.

Run the suite with:

```bash
pytest apps/ml-engine/tests/test_streaming_inference.py
```

With these pieces wired together, Summit can score streaming events in milliseconds and deliver results to analysts, dashboards, or downstream automations with full observability.
