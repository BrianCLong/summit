# Summit Scaling Guide

This guide documents how to operate Summit in multi-node Kubernetes clusters with production-grade autoscaling, caching, and performance testing. The examples assume `kubectl`, `helm`, and `kustomize` are available along with access to a container registry.

## Architecture Overview

- **Stateless app layer**: `api`, `web`, and background workers run as independent Deployments with PodDisruptionBudgets and readiness probes identical to `make up` health checks.
- **Datastores**: PostgreSQL (primary + async replicas), Neo4j Enterprise causal cluster, Redis Cluster (3 masters + 3 replicas) for cache and task queues.
- **Ingress**: NGINX Ingress Controller with gzip + HTTP/2 enabled. Cert-manager issues TLS certificates.
- **Observability**: Prometheus Operator + Grafana dashboards from `observability/grafana`. Alertmanager routes to PagerDuty/Slack.

## Horizontal Pod Autoscaler (HPA)

Use HPAs to keep latency under 200ms for GraphQL queries and to prevent worker backlogs. The example assumes metrics-server is installed.

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: summit-api
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: summit-api
  minReplicas: 3
  maxReplicas: 12
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 65
    - type: Pods
      pods:
        metric:
          name: http_requests_per_second
        target:
          type: AverageValue
          averageValue: 20
```

Repeat the pattern for `summit-web` (based on CPU + RPS) and for worker pools (based on queue depth exported via Prometheus).

## Redis Clustering

Redis should run in cluster mode for resiliency and predictable latency under load:

```yaml
apiVersion: redis.redis.opstreelabs.in/v1beta1
kind: RedisCluster
metadata:
  name: summit-redis
spec:
  clusterSize: 3
  master:
    replicas: 3
  replication:
    replicas: 1
  storage:
    volumeClaimTemplate:
      spec:
        accessModes: [ "ReadWriteOnce" ]
        resources:
          requests:
            storage: 20Gi
  redisExporter: true
  securityContext:
    runAsNonRoot: true
    fsGroup: 999
```

Use `redis.conf` tuned for `maxmemory-policy allkeys-lru` and enable TLS via cert-manager secrets mounted into Pods.

## Example Kustomize Overlay

Place cluster-wide defaults in `infra/k8s/overlays/production/` to wrap base manifests in `infra/k8s/base/`.

```yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - ../../base
patches:
  - target:
      kind: Deployment
      name: summit-api
    patch: |
      - op: replace
        path: /spec/template/spec/containers/0/resources
        value:
          requests:
            cpu: 500m
            memory: 1Gi
          limits:
            cpu: 2
            memory: 4Gi
  - target:
      kind: Ingress
      name: summit-ingress
    patch: |
      - op: add
        path: /metadata/annotations
        value:
          nginx.ingress.kubernetes.io/proxy-read-timeout: "120"
          nginx.ingress.kubernetes.io/enable-brotli: "true"
```

## Load Testing with Locust

Benchmark before every major release.

```bash
pip install locust
locust -f tests/perf/locustfile.py --headless -u 400 -r 40 -t 10m --host https://api.summit.example.com
```

Sample `locustfile.py` outline (placed in `tests/perf/`):

```python
from locust import HttpUser, task, between

class SummitUser(HttpUser):
  wait_time = between(1, 3)

  @task(3)
  def query_graph(self):
    self.client.post("/graphql", json={"query": "{ investigations { id name } }"})

  @task(1)
  def ingest_event(self):
    self.client.post("/api/events", json={"type": "heartbeat", "source": "locust"})
```

Capture p95 latency, error rate, and saturation metrics from Prometheus during each run. Commit reports to `tests/perf/reports/` and trend them in Grafana.

## Benchmark Targets

- **API**: p95 GraphQL latency < 200ms at 1k RPS sustained for 10 minutes.
- **Workers**: Queue depth < 1000 with 0 dead-letter messages during peak.
- **Neo4j**: < 250ms for 3-hop path queries with 50 concurrent users.
- **Redis**: < 5ms GET/SET latency at 30k ops/sec.

## Day-2 Operations

- Rotate secrets quarterly via `ExternalSecrets` or sealed-secrets.
- Run `helm upgrade` with `--atomic --timeout 10m` and verify readiness gates.
- Enable cluster autoscaler with buffer nodes for GPU pools.
- Schedule weekly `kubectl run redis-cli` smoke tests to verify cluster slots and replication health.

## Disaster Recovery

- Configure scheduled backups for PostgreSQL and Neo4j using `velero` or provider snapshots.
- Keep `make smoke` parity via synthetic checks in `synthetics/` hitting `/health/ready` and `/metrics` endpoints.
- Document restore playbooks in `docs/ONBOARDING.md` and validate quarterly.
