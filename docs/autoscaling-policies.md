# Autoscaling Policies Documentation

## Overview

This document describes the autoscaling policies for the IntelGraph platform, ensuring optimal resource utilization while meeting performance SLOs.

**Performance Targets:**
- **P95 query latency**: < 1.5s
- **CPU utilization**: 60-80% (target 70%)
- **Memory utilization**: < 85%
- **Response time**: < 500ms for 95% of requests

---

## Table of Contents

1. [Horizontal Pod Autoscaling (HPA)](#horizontal-pod-autoscaling-hpa)
2. [Vertical Pod Autoscaling (VPA)](#vertical-pod-autoscaling-vpa)
3. [Cluster Autoscaling](#cluster-autoscaling)
4. [KEDA Event-Driven Autoscaling](#keda-event-driven-autoscaling)
5. [Database Connection Pool Scaling](#database-connection-pool-scaling)
6. [Monitoring and Alerts](#monitoring-and-alerts)

---

## Horizontal Pod Autoscaling (HPA)

### API Server HPA

**Target**: Scale based on CPU, memory, and custom metrics (query latency)

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: intelgraph-server
  namespace: default
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: intelgraph-server
  minReplicas: 3
  maxReplicas: 20
  metrics:
    # CPU-based scaling
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70  # Target 70% CPU
    
    # Memory-based scaling
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: 80  # Target 80% memory
    
    # Custom metric: Query latency
    - type: Pods
      pods:
        metric:
          name: intelgraph_query_latency_p95
        target:
          type: AverageValue
          averageValue: "1200m"  # 1.2s (buffer before 1.5s SLO)
    
    # Custom metric: HTTP request rate
    - type: Pods
      pods:
        metric:
          name: http_requests_per_second
        target:
          type: AverageValue
          averageValue: "100"  # 100 req/s per pod
  
  behavior:
    scaleUp:
      stabilizationWindowSeconds: 60  # Wait 60s before scaling up
      policies:
        - type: Percent
          value: 50  # Scale up by 50% of current replicas
          periodSeconds: 60
        - type: Pods
          value: 2  # Or add 2 pods
          periodSeconds: 60
      selectPolicy: Max  # Use whichever adds more pods
    
    scaleDown:
      stabilizationWindowSeconds: 300  # Wait 5 minutes before scaling down
      policies:
        - type: Percent
          value: 25  # Scale down by 25% of current replicas
          periodSeconds: 60
        - type: Pods
          value: 1  # Or remove 1 pod
          periodSeconds: 60
      selectPolicy: Min  # Use whichever removes fewer pods
```

**Rationale:**
- **Min replicas: 3** - Ensures high availability (survives 1 node failure)
- **Max replicas: 20** - Caps costs while handling peak load
- **CPU target: 70%** - Leaves headroom for spikes
- **Memory target: 80%** - Prevents OOM kills
- **Query latency target: 1.2s** - Triggers scaling before hitting 1.5s SLO
- **Scale-up: Fast (60s)** - Responds quickly to load increases
- **Scale-down: Slow (300s)** - Avoids thrashing during traffic fluctuations

### Worker Pods HPA

**Target**: Scale based on job queue length

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: intelgraph-worker
  namespace: default
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: intelgraph-worker
  minReplicas: 2
  maxReplicas: 10
  metrics:
    - type: External
      external:
        metric:
          name: redis_queue_length
          selector:
            matchLabels:
              queue: "default"
        target:
          type: AverageValue
          averageValue: "10"  # 10 jobs per worker
  
  behavior:
    scaleUp:
      stabilizationWindowSeconds: 30
      policies:
        - type: Pods
          value: 2
          periodSeconds: 30
    scaleDown:
      stabilizationWindowSeconds: 180
      policies:
        - type: Pods
          value: 1
          periodSeconds: 60
```

**Rationale:**
- Scales based on actual work (queue length) rather than resource usage
- Fast scale-up to clear backlogs
- Moderate scale-down to avoid killing in-progress jobs

---

## Vertical Pod Autoscaling (VPA)

### API Server VPA

**Target**: Automatically adjust CPU/memory requests and limits

```yaml
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: intelgraph-server-vpa
  namespace: default
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: intelgraph-server
  updatePolicy:
    updateMode: "Auto"  # Automatically apply recommendations
  resourcePolicy:
    containerPolicies:
      - containerName: intelgraph-server
        minAllowed:
          cpu: "500m"
          memory: "512Mi"
        maxAllowed:
          cpu: "4000m"
          memory: "8Gi"
        controlledResources:
          - cpu
          - memory
```

**Rationale:**
- Optimizes resource requests over time based on actual usage
- Prevents over-provisioning (wasted resources)
- Prevents under-provisioning (OOMKilled, CPU throttling)

**Note**: VPA and HPA can conflict. Use VPA for batch jobs, HPA for user-facing services.

---

## Cluster Autoscaling

### Node Autoscaling (AWS EKS)

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: cluster-autoscaler-config
  namespace: kube-system
data:
  # Cluster Autoscaler configuration
  scale-down-enabled: "true"
  scale-down-delay-after-add: "10m"
  scale-down-unneeded-time: "10m"
  scale-down-utilization-threshold: "0.5"  # Scale down if node < 50% utilized
  max-node-provision-time: "15m"
  
  # Node group limits
  min-nodes: "3"
  max-nodes: "20"
  
  # Instance types
  instance-types: "m5.xlarge,m5.2xlarge,c5.xlarge,c5.2xlarge"
```

**Scaling Triggers:**
- **Scale up**: When pods cannot be scheduled due to insufficient resources
- **Scale down**: When node utilization < 50% for 10 minutes
- **Protection**: Don't scale down if it would violate pod disruption budgets

### Pod Disruption Budget (PDB)

```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: intelgraph-server-pdb
  namespace: default
spec:
  minAvailable: 2  # Always keep at least 2 pods running
  selector:
    matchLabels:
      app: intelgraph-server
```

---

## KEDA Event-Driven Autoscaling

### Redis Queue Scaler

```yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: worker-scaler
  namespace: default
spec:
  scaleTargetRef:
    name: intelgraph-worker
  minReplicaCount: 2
  maxReplicaCount: 20
  pollingInterval: 15  # Check every 15 seconds
  cooldownPeriod: 120  # Wait 2 minutes before scaling down
  triggers:
    # Redis list length trigger
    - type: redis
      metadata:
        address: redis:6379
        listName: bull:queue:default
        listLength: "10"  # Scale up if queue > 10
        
    # Prometheus metric trigger (query latency)
    - type: prometheus
      metadata:
        serverAddress: http://prometheus:9090
        metricName: query_latency_p95
        query: |
          histogram_quantile(0.95, 
            rate(intelgraph_query_latency_seconds_bucket[2m])
          )
        threshold: "1.2"  # Scale if P95 > 1.2s
```

**Advantages of KEDA:**
- Scales to zero when idle (cost savings)
- Faster response to external events than HPA
- Supports multiple trigger sources

---

## Database Connection Pool Scaling

### Dynamic Pool Sizing

Connection pool sizes scale automatically based on pod count:

```typescript
// server/src/db/postgres.ts
const POOL_SIZE_PER_POD = {
  write: 20,
  read: 40,
};

// Automatically adjust based on pod count
const podCount = await getActivePodCount();
const writePoolSize = podCount * POOL_SIZE_PER_POD.write;
const readPoolSize = podCount * POOL_SIZE_PER_POD.read;

const pool = new Pool({
  max: writePoolSize,
  min: Math.floor(writePoolSize * 0.25),
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});
```

**Rationale:**
- Total connections scale with workload
- Prevents connection exhaustion on database
- Maintains optimal pool size per pod

### Database Scaling (RDS)

```yaml
# RDS Aurora Auto Scaling
resource "aws_appautoscaling_target" "replicas" {
  service_namespace  = "rds"
  scalable_dimension = "rds:cluster:ReadReplicaCount"
  resource_id        = "cluster:intelgraph-prod"
  min_capacity       = 2
  max_capacity       = 15
}

resource "aws_appautoscaling_policy" "replicas" {
  name               = "cpu-auto-scaling"
  service_namespace  = "rds"
  scalable_dimension = "rds:cluster:ReadReplicaCount"
  resource_id        = "cluster:intelgraph-prod"
  policy_type        = "TargetTrackingScaling"

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "RDSReaderAverageCPUUtilization"
    }
    target_value = 70.0  # Target 70% CPU on read replicas
  }
}
```

---

## Monitoring and Alerts

### Key Metrics to Monitor

```promql
# HPA Scale Events
rate(kube_hpa_status_current_replicas[5m])

# Pod CPU/Memory Usage
container_cpu_usage_seconds_total
container_memory_working_set_bytes

# Query Latency (triggers scaling)
histogram_quantile(0.95, 
  rate(intelgraph_query_latency_seconds_bucket[5m])
)

# Queue Length (triggers KEDA scaling)
redis_list_length{list="bull:queue:default"}

# Node Autoscaler Status
cluster_autoscaler_scaled_up_nodes_total
cluster_autoscaler_scaled_down_nodes_total
```

### Alerts

```yaml
groups:
  - name: autoscaling
    rules:
      # HPA at max replicas
      - alert: HPAMaxedOut
        expr: kube_hpa_status_current_replicas == kube_hpa_spec_max_replicas
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "HPA {{ $labels.hpa }} is at max replicas"
          description: "Consider increasing max replicas or optimizing performance"
      
      # Frequent scaling events (thrashing)
      - alert: HPAThrashing
        expr: changes(kube_hpa_status_current_replicas[15m]) > 5
        labels:
          severity: warning
        annotations:
          summary: "HPA {{ $labels.hpa }} is thrashing"
          description: "Too many scale events, consider adjusting stabilization windows"
      
      # Query latency approaching SLO
      - alert: QueryLatencyHigh
        expr: |
          histogram_quantile(0.95, 
            rate(intelgraph_query_latency_seconds_bucket[5m])
          ) > 1.3
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "P95 query latency is approaching SLO (1.5s)"
          description: "Current: {{ $value }}s, SLO: 1.5s"
```

---

## Scaling Decision Matrix

| Metric | Threshold | Action | Reasoning |
|--------|-----------|--------|-----------|
| CPU > 70% | For 60s | Scale up 50% | Prevent CPU throttling |
| Memory > 80% | For 60s | Scale up 50% | Prevent OOM kills |
| P95 latency > 1.2s | For 60s | Scale up 2 pods | Approaching 1.5s SLO |
| Queue length > 100 | Immediate | Scale up 2 workers | Clear backlog quickly |
| CPU < 40% | For 300s | Scale down 25% | Reduce costs |
| Queue length = 0 | For 120s | Scale to min | KEDA scale to zero |

---

## Cost Optimization

### Right-sizing Strategy

1. **Use VPA to determine actual resource needs**
2. **Set requests = 80% of typical usage**
3. **Set limits = 150% of typical usage**
4. **Monitor waste with Kubecost or similar tools**

### Example: Cost-Optimized Configuration

```yaml
resources:
  requests:
    cpu: "800m"      # 80% of observed usage (1 CPU)
    memory: "1.6Gi"  # 80% of observed usage (2Gi)
  limits:
    cpu: "1500m"     # 150% headroom for spikes
    memory: "3Gi"    # 150% headroom
```

### Savings Estimate

- **Before optimization**: 20 pods × 2 CPU × $0.04/hr = $38/day
- **After optimization**: 10 pods × 1 CPU × $0.04/hr = $10/day
- **Savings**: **73% reduction** ($10k/year)

---

## Testing Autoscaling

### Load Testing Script

```bash
#!/bin/bash
# Simulate traffic to test autoscaling

echo "Starting load test..."

# Gradually increase load
for i in {1..10}; do
    echo "Ramping to $((i * 100)) req/s..."
    wrk -t4 -c$((i * 25)) -d60s http://api.example.com/health
    sleep 30
done

# Monitor scaling
kubectl get hpa -w
```

### Validation Checklist

- [ ] Pods scale up when CPU > 70%
- [ ] Pods scale up when latency > 1.2s
- [ ] Pods scale down after load decreases
- [ ] P95 latency stays < 1.5s during load test
- [ ] No OOMKilled pods during scaling
- [ ] Cluster autoscaler adds nodes when needed
- [ ] PDB is respected during scale-down
- [ ] Total cost stays within budget

---

## Runbook: Autoscaling Issues

### Issue: HPA Not Scaling

**Symptoms**: Load increases but replicas stay at min

**Diagnosis**:
```bash
kubectl describe hpa intelgraph-server
kubectl get --raw /apis/custom.metrics.k8s.io/v1beta1 | jq .
```

**Common Causes**:
- Metrics server not installed: `kubectl top nodes`
- Custom metrics not available
- HPA min/max misconfigured
- Insufficient cluster resources

### Issue: Pods Keep Restarting During Scale

**Symptoms**: Pods OOMKilled or CrashLoopBackOff after scale-up

**Diagnosis**:
```bash
kubectl get pods | grep -E 'OOMKilled|CrashLoop'
kubectl logs <pod> --previous
```

**Solution**:
- Increase memory limits
- Check for memory leaks
- Adjust VPA min/max bounds

---

## References

- [Kubernetes HPA Documentation](https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale/)
- [KEDA Documentation](https://keda.sh/)
- [AWS EKS Autoscaling](https://docs.aws.amazon.com/eks/latest/userguide/autoscaling.html)

