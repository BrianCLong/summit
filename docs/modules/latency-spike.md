# Latency Spike Scenario

## Purpose

Simulate a latency spike in the search service to test system resilience and alerting.

## Steps

1. Apply `k8s/chaos/search-latency.yaml` to the cluster.
2. Monitor search latency metrics in Grafana.
3. Verify alerts are triggered.
4. Observe system behavior under increased latency.

## Rollback

1. Delete `k8s/chaos/search-latency.yaml` from the cluster.
2. Confirm search latency returns to normal.

## Metrics to Watch

- `route:latency:p95{path="/search"}`
- `route:error_rate:ratio5m{path="/search"}`
