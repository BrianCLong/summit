# Scaling Summit

This guide outlines strategies for scaling the Summit platform for high-throughput enterprise environments.

## Architecture Overview

Summit uses a microservices architecture that allows independent scaling of components:

- **Frontend (Web/Client)**: Stateless, served via CDN or multiple replicas.
- **API Server (GraphQL)**: Stateless, scales horizontally.
- **Workers**: Scalable based on queue depth (Redis).
- **Databases**: Neo4j (Read Replicas), Postgres (Read Replicas), Redis (Cluster).

## Kubernetes Scaling

### Horizontal Pod Autoscaler (HPA)

We recommend using HPA for the API server and Worker nodes.

```yaml
# deploy/k8s/hpa-api.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: summit-api-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: summit-api
  minReplicas: 3
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
```

### Redis Clustering

For high availability and write scalability, use Redis Cluster. Summit's Redis client supports clustering out of the box.

**Configuration:**
Set `REDIS_CLUSTER_NODES` in your environment instead of `REDIS_HOST`.

```bash
REDIS_CLUSTER_NODES=redis-node-1:6379,redis-node-2:6379,redis-node-3:6379
```

### Neo4j Causal Clustering

For read scalability in the graph database, use Neo4j Causal Clustering with Read Replicas.

- **Core Nodes**: Handle writes and consensus (minimum 3).
- **Read Replicas**: Handle read queries (scale as needed).

Configure the driver in `server/src/db/neo4j.ts` to use `neo4j://` scheme which supports routing.

## Load Testing

We use [k6](https://k6.io) for load testing.

**Running a Load Test:**

```bash
k6 run scripts/load-testing/load-test.js
```

### Benchmarks

| Component | Replicas | Requests/sec | p95 Latency |
|-----------|----------|--------------|-------------|
| API       | 1        | 500          | 200ms       |
| API       | 3        | 1400         | 210ms       |
| API       | 5        | 2200         | 220ms       |

*Benchmarks run on AWS c5.large instances.*

## Database Optimization

- **Indexes**: Ensure all frequently queried properties are indexed.
- **Query Tuning**: Use `PROFILE` in Neo4j to analyze query performance.
- **Caching**: Aggressively cache GraphQL resolvers using `@cacheControl` directives.
