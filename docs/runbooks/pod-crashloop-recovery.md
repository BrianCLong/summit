# 🔄 Pod CrashLoopBackOff Recovery Runbook

**Severity:** High
**MTTR Target:** < 15 minutes
**Escalation:** After 10 minutes

## 🔍 Symptoms

- Pods stuck in `CrashLoopBackOff` state
- Grafana alert: `SaturationHigh` or `ThroughputDrop`
- Application metrics dropping to zero
- Kubernetes events showing repeated container restarts

## ⚡ Immediate Triage (0-5 minutes)

### 1. Identify Affected Pods

```bash
# List crashlooping pods
kubectl get pods -n intelgraph-prod | grep -E "(CrashLoopBackOff|Error|Pending)"

# Get detailed pod status
kubectl describe pod -n intelgraph-prod $(kubectl get pods -n intelgraph-prod -o name | grep intelgraph | head -1)
```

### 2. Check Recent Changes

```bash
# Recent deployments
kubectl rollout history deployment/intelgraph -n intelgraph-prod

# Recent configmap/secret changes
kubectl get events -n intelgraph-prod --sort-by='.lastTimestamp' | head -20
```

### 3. Extract Container Logs

```bash
# Current container logs
kubectl logs -n intelgraph-prod deployment/intelgraph --tail=50

# Previous container logs (if crashed)
kubectl logs -n intelgraph-prod deployment/intelgraph --previous --tail=50
```

## 🔧 Diagnostic Categories

### Application Startup Issues

**Common Patterns:**

- Database connection failures
- Missing environment variables
- Configuration parsing errors
- Memory allocation failures

```bash
# Check environment variables
kubectl exec -n intelgraph-prod deployment/intelgraph -- env | grep -E "(DATABASE|REDIS|NEO4J)"

# Validate configuration
kubectl get configmap -n intelgraph-prod intelgraph-config -o yaml
kubectl get secret -n intelgraph-prod intelgraph-secrets -o yaml
```

### Resource Constraints

**OOMKilled Pattern:**

```bash
# Check resource limits
kubectl describe pod -n intelgraph-prod $(kubectl get pods -n intelgraph-prod -o name | grep intelgraph | head -1) | grep -A10 "Containers:"

# Node memory pressure
kubectl describe nodes | grep -A5 "MemoryPressure"
```

### Dependency Failures

**Database Issues:**

```bash
# PostgreSQL connectivity
kubectl exec -n intelgraph-prod deployment/postgres -- pg_isready

# Neo4j status
kubectl exec -n intelgraph-prod deployment/neo4j -- cypher-shell "RETURN 1" || echo "Neo4j unreachable"

# Redis connectivity
kubectl exec -n intelgraph-prod deployment/redis -- redis-cli ping || echo "Redis unreachable"
```

## 🛠️ Resolution Strategies

### Quick Fixes (5-10 minutes)

#### 1. Rollback to Previous Version

```bash
# Rollback to last stable deployment
kubectl rollout undo deployment/intelgraph -n intelgraph-prod

# Monitor rollback progress
kubectl rollout status deployment/intelgraph -n intelgraph-prod --timeout=300s
```

#### 2. Resource Scaling

```bash
# Increase memory limits for OOMKilled pods
kubectl patch deployment intelgraph -n intelgraph-prod --patch='
{
  "spec": {
    "template": {
      "spec": {
        "containers": [{
          "name": "intelgraph",
          "resources": {
            "limits": {"memory": "4Gi", "cpu": "2000m"},
            "requests": {"memory": "2Gi", "cpu": "1000m"}
          }
        }]
      }
    }
  }
}'
```

#### 3. Configuration Fixes

```bash
# Reset to known-good configuration
kubectl apply -f k8s/overlays/production/configmap.yml
kubectl apply -f k8s/overlays/production/secrets.yml

# Restart deployment to pick up changes
kubectl rollout restart deployment/intelgraph -n intelgraph-prod
```

### Advanced Recovery (10-15 minutes)

#### 1. Dependency Service Recovery

```bash
# Restart database services
kubectl rollout restart deployment/postgres -n intelgraph-prod
kubectl rollout restart deployment/neo4j -n intelgraph-prod
kubectl rollout restart deployment/redis -n intelgraph-prod

# Wait for services to be ready
kubectl wait --for=condition=available --timeout=300s deployment/postgres -n intelgraph-prod
```

#### 2. Network Policy Reset

```bash
# Temporarily disable network policies for debugging
kubectl delete networkpolicy --all -n intelgraph-prod

# Test connectivity
kubectl exec -n intelgraph-prod deployment/intelgraph -- nslookup postgres.intelgraph-prod.svc.cluster.local
```

#### 3. Image Pull Issues

```bash
# Check image pull status
kubectl describe pod -n intelgraph-prod $(kubectl get pods -n intelgraph-prod -o name | grep intelgraph | head -1) | grep -A5 "Events:"

# Force re-pull latest image
kubectl patch deployment intelgraph -n intelgraph-prod -p='
{
  "spec": {
    "template": {
      "metadata": {
        "annotations": {
          "kubectl.kubernetes.io/restartedAt": "'$(date +%Y-%m-%dT%H:%M:%S%z)'"
        }
      }
    }
  }
}'
```

## 📊 Verification Steps

```bash
# Verify pods are running
kubectl get pods -n intelgraph-prod -l app=intelgraph

# Check readiness probes
kubectl get pods -n intelgraph-prod -l app=intelgraph -o wide

# Test application endpoints
curl -f https://api.intelgraph.ai/health
curl -f https://api.intelgraph.ai/metrics

# Monitor for sustained recovery
watch -n 5 'kubectl get pods -n intelgraph-prod -l app=intelgraph'
```

## 🚨 Escalation Path

### 5 minutes: No pods running

- Scale down to 1 replica for faster troubleshooting
- Page on-call engineer

### 10 minutes: Still failing

- Escalate to senior SRE
- Consider activating backup environment

### 15 minutes: Critical outage

- Engage incident commander
- Activate disaster recovery procedures

## 🔍 Common Root Causes

1. **Memory Leaks** → Increase limits + schedule restart
2. **Database Migration Failures** → Rollback migration
3. **Config Drift** → Apply infrastructure as code
4. **Dependency Version Conflicts** → Pin versions in Dockerfile
5. **Resource Exhaustion** → Node scaling + resource optimization

## 📈 Prevention

1. **Resource Monitoring** → Set up memory usage alerts at 80%
2. **Deployment Gates** → Require health checks before rollout
3. **Canary Deployments** → Deploy to 10% of pods first
4. **Chaos Engineering** → Regular pod failure testing

**Runbook Owner:** Platform Team
**Last Updated:** September 23, 2025
