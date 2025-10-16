# 🚨 502 Storm Response Runbook

**Severity:** Critical
**MTTR Target:** < 10 minutes
**Escalation:** Immediate

## 🔍 Symptoms

- Multiple 502 Bad Gateway errors across API endpoints
- Grafana alerts: `ErrorRateSpike > 10%`
- User reports of service unavailability
- Load balancer health checks failing

## ⚡ Immediate Actions (0-3 minutes)

### 1. Acknowledge & Assess

```bash
# Check current error rate
kubectl get pods -n intelgraph-prod -l app=intelgraph --no-headers | grep -v Running

# Check ingress controller
kubectl get pods -n ingress-nginx
kubectl logs -n ingress-nginx deployment/ingress-nginx-controller --tail=50
```

### 2. Quick Mitigation

```bash
# Restart unhealthy pods
kubectl rollout restart deployment/intelgraph -n intelgraph-prod

# Scale up immediately
kubectl scale deployment intelgraph --replicas=10 -n intelgraph-prod
```

### 3. Check Upstream Dependencies

```bash
# Database connectivity
kubectl exec -n intelgraph-prod deployment/postgres -- pg_isready

# Neo4j status
kubectl exec -n intelgraph-prod deployment/neo4j -- cypher-shell "RETURN 1"

# Redis connectivity
kubectl exec -n intelgraph-prod deployment/redis -- redis-cli ping
```

## 🔧 Diagnostic Steps (3-7 minutes)

### Application Logs

```bash
# Check application errors
kubectl logs -n intelgraph-prod deployment/intelgraph --tail=100 | grep -i error

# Memory/CPU issues
kubectl top pods -n intelgraph-prod --containers
```

### Infrastructure Issues

```bash
# Node resource pressure
kubectl describe nodes | grep -A5 "Conditions:"

# Network policies blocking
kubectl get networkpolicies -n intelgraph-prod
```

### Load Balancer Status

```bash
# AWS ALB target health
aws elbv2 describe-target-health --target-group-arn $(aws elbv2 describe-target-groups --names intelgraph-prod --query 'TargetGroups[0].TargetGroupArn' --output text)
```

## 🛠️ Resolution Actions (7-10 minutes)

### Memory/CPU Issues

```bash
# Increase resource limits
kubectl patch deployment intelgraph -n intelgraph-prod -p='
{
  "spec": {
    "template": {
      "spec": {
        "containers": [{
          "name": "intelgraph",
          "resources": {
            "limits": {"memory": "2Gi", "cpu": "1000m"},
            "requests": {"memory": "1Gi", "cpu": "500m"}
          }
        }]
      }
    }
  }
}'
```

### Database Connection Pool

```bash
# Reset connection pools
kubectl exec -n intelgraph-prod deployment/intelgraph -- curl -X POST http://localhost:3000/admin/reset-pools
```

### Circuit Breaker Reset

```bash
# Reset circuit breakers
kubectl exec -n intelgraph-prod deployment/intelgraph -- curl -X POST http://localhost:3000/admin/reset-circuit-breakers
```

## 📊 Verification (Final 2 minutes)

```bash
# Check error rate dropped
curl -s "http://prometheus.intelgraph-prod.svc.cluster.local:9090/api/v1/query?query=rate(http_requests_total{status=~\"5..\"}[2m])"

# Verify healthy pods
kubectl get pods -n intelgraph-prod -l app=intelgraph

# Test critical endpoints
curl -f https://api.intelgraph.ai/health
curl -f https://api.intelgraph.ai/graphql -d '{"query": "{ entities { id } }"}'
```

## 🚨 Escalation Triggers

- **5 minutes:** No improvement → Page SRE lead
- **8 minutes:** Still failing → Engage incident commander
- **15 minutes:** Prolonged outage → Activate disaster recovery

## 📈 Post-Incident

1. **Monitoring:** Set up enhanced monitoring for 24h
2. **Root Cause:** Schedule RCA within 48h
3. **Prevention:** Update alerting thresholds if needed

**Runbook Owner:** SRE Team
**Last Updated:** September 23, 2025
