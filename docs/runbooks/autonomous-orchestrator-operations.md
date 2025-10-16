# Autonomous Orchestrator Operations Runbook

## Overview

This runbook provides operational procedures for managing the IntelGraph Autonomous Orchestrator, including monitoring, troubleshooting, maintenance, and emergency response procedures.

## System Components

### Core Services

- **Orchestration Service**: Main orchestration engine
- **Premium Model Router**: Thompson sampling-based model selection
- **Compliance Gate**: Policy enforcement and validation
- **Web Orchestrator**: Multi-source web intelligence synthesis
- **Rate Limiter**: Distributed rate limiting with Redis
- **Audit Logger**: Comprehensive compliance logging

### Dependencies

- **Redis**: Session storage, rate limiting, pub/sub
- **Neo4j**: Graph database for knowledge storage
- **PostgreSQL**: User management, audit logs, job scheduling
- **Prometheus**: Metrics collection and monitoring
- **Jaeger**: Distributed tracing

## Monitoring and Alerting

### Key Metrics to Monitor

#### System Health Metrics

```prometheus
# Orchestration success rate
maestro_orchestration_success_rate{tenant_id="*"}

# Average orchestration latency
maestro_orchestration_latency{tenant_id="*"}

# Premium model router performance
maestro_premium_router_model_selection_time{model="*"}

# Compliance gate validation rate
maestro_compliance_validation_success_rate{policy="*"}

# Rate limiting metrics
maestro_rate_limit_rejections{tenant_id="*"}
```

#### Business Metrics

```prometheus
# Cost optimization effectiveness
maestro_cost_savings_percentage{optimization_type="*"}

# Quality threshold adherence
maestro_quality_threshold_adherence{threshold="*"}

# User satisfaction scores
maestro_user_satisfaction_score{purpose="*"}
```

### Alert Definitions

#### Critical Alerts

**Orchestration Failure Rate High**

```yaml
alert: MaestroOrchestrationFailureRateHigh
expr: rate(maestro_orchestration_error[5m]) > 0.1
for: 2m
severity: critical
description: 'Maestro orchestration failure rate is above 10% for 2 minutes'
runbook: 'https://docs.intelgraph.ai/runbooks/orchestration-failures'
```

**Premium Router Unavailable**

```yaml
alert: MaestroPremiumRouterDown
expr: up{job="maestro-premium-router"} == 0
for: 1m
severity: critical
description: 'Premium model router is unavailable'
runbook: 'https://docs.intelgraph.ai/runbooks/premium-router-down'
```

**Compliance Gate Failures**

```yaml
alert: MaestroComplianceGateFailures
expr: rate(maestro_compliance_validation_failures[5m]) > 0.05
for: 3m
severity: critical
description: 'Compliance gate validation failures above 5% for 3 minutes'
runbook: 'https://docs.intelgraph.ai/runbooks/compliance-failures'
```

#### Warning Alerts

**High Orchestration Latency**

```yaml
alert: MaestroHighLatency
expr: histogram_quantile(0.95, maestro_orchestration_latency_bucket) > 30000
for: 5m
severity: warning
description: '95th percentile orchestration latency above 30 seconds'
runbook: 'https://docs.intelgraph.ai/runbooks/performance-degradation'
```

**Budget Overrun Risk**

```yaml
alert: MaestroBudgetOverrunRisk
expr: maestro_daily_cost_burn_rate > maestro_daily_budget_limit * 0.8
for: 10m
severity: warning
description: 'Daily cost burn rate approaching budget limit'
runbook: 'https://docs.intelgraph.ai/runbooks/budget-management'
```

## Operational Procedures

### Daily Operations

#### Morning Health Check

```bash
#!/bin/bash
# Daily health check script

echo "=== Maestro Daily Health Check ==="
date

# Check service status
echo "1. Checking service health..."
curl -s http://localhost:4001/v1/health | jq '.status'

# Check key metrics
echo "2. Checking orchestration success rate (last 24h)..."
curl -s "http://prometheus:9090/api/v1/query?query=rate(maestro_orchestration_success[24h])" | jq -r '.data.result[0].value[1]'

# Check premium router performance
echo "3. Checking premium router model availability..."
curl -s http://localhost:4001/v1/router/models | jq '.[] | select(.availability > 0.95) | .name'

# Check compliance status
echo "4. Checking compliance validation rate..."
curl -s "http://prometheus:9090/api/v1/query?query=rate(maestro_compliance_validation_success[24h])" | jq -r '.data.result[0].value[1]'

# Check budget utilization
echo "5. Checking budget utilization..."
curl -s "http://prometheus:9090/api/v1/query?query=maestro_daily_cost_spent" | jq -r '.data.result[0].value[1]'

echo "=== Health Check Complete ==="
```

#### Capacity Planning Check

```bash
#!/bin/bash
# Weekly capacity planning review

echo "=== Weekly Capacity Planning Review ==="

# Check orchestration volume trends
echo "1. Orchestration volume (7-day trend)..."
curl -s "http://prometheus:9090/api/v1/query_range?query=rate(maestro_orchestration_requests[1h])&start=$(date -d '7 days ago' +%s)&end=$(date +%s)&step=3600" | jq '.data.result[0].values[-1][1]'

# Check premium model usage distribution
echo "2. Premium model usage distribution..."
curl -s "http://prometheus:9090/api/v1/query?query=topk(5, sum by (model) (maestro_premium_model_usage[7d]))" | jq -r '.data.result[] | "\(.metric.model): \(.value[1])"'

# Check compliance policy effectiveness
echo "3. Compliance policy effectiveness..."
curl -s "http://prometheus:9090/api/v1/query?query=sum by (policy) (maestro_compliance_violations[7d])" | jq -r '.data.result[] | "\(.metric.policy): \(.value[1])"'

echo "=== Capacity Planning Review Complete ==="
```

### Incident Response Procedures

#### High Orchestration Failure Rate

**Symptoms:**

- Orchestration success rate drops below 90%
- User complaints about failed requests
- Error rate alerts firing

**Investigation Steps:**

1. **Check System Components**

   ```bash
   # Check all service health
   kubectl get pods -n intelgraph-maestro
   kubectl logs -n intelgraph-maestro deployment/maestro-orchestrator --tail=100

   # Check dependencies
   kubectl get pods -n intelgraph-core | grep -E "(redis|neo4j|postgres)"
   ```

2. **Examine Recent Orchestrations**

   ```bash
   # Get recent failed orchestrations
   curl -s "http://localhost:4001/v1/orchestrations?status=failed&limit=10" | jq '.data[] | {id: .orchestrationId, error: .error, timestamp: .createdAt}'
   ```

3. **Check Resource Utilization**

   ```bash
   # Check CPU and memory usage
   kubectl top pods -n intelgraph-maestro

   # Check Redis memory usage
   kubectl exec -n intelgraph-core redis-0 -- redis-cli info memory | grep used_memory_human
   ```

**Mitigation Steps:**

1. **Scale Up Services** (if resource constrained)

   ```bash
   kubectl scale deployment maestro-orchestrator --replicas=5 -n intelgraph-maestro
   kubectl scale deployment maestro-premium-router --replicas=3 -n intelgraph-maestro
   ```

2. **Enable Circuit Breaker** (if external dependencies failing)

   ```bash
   # Update configuration to enable circuit breaker
   kubectl patch configmap maestro-config -n intelgraph-maestro --patch '{"data":{"CIRCUIT_BREAKER_ENABLED":"true"}}'
   kubectl rollout restart deployment/maestro-orchestrator -n intelgraph-maestro
   ```

3. **Fallback to Basic Mode** (emergency procedure)
   ```bash
   # Disable premium routing temporarily
   kubectl patch configmap maestro-config -n intelgraph-maestro --patch '{"data":{"PREMIUM_ROUTING_ENABLED":"false"}}'
   kubectl rollout restart deployment/maestro-orchestrator -n intelgraph-maestro
   ```

#### Premium Router Unavailability

**Symptoms:**

- All orchestrations falling back to basic models
- Premium router health check failures
- High cost optimization alerts

**Investigation Steps:**

1. **Check Router Service Status**

   ```bash
   kubectl get pods -n intelgraph-maestro -l app=maestro-premium-router
   kubectl logs -n intelgraph-maestro deployment/maestro-premium-router --tail=50
   ```

2. **Verify Model Availability**

   ```bash
   # Test external model APIs
   curl -H "Authorization: Bearer ${OPENAI_API_KEY}" "https://api.openai.com/v1/models" | jq '.data[0].id'
   curl -H "Authorization: Bearer ${ANTHROPIC_API_KEY}" "https://api.anthropic.com/v1/messages" -X POST --data '{"model":"claude-3-opus-20240229","messages":[{"role":"user","content":"test"}],"max_tokens":1}'
   ```

3. **Check Thompson Sampling Database**
   ```bash
   # Verify model performance data
   kubectl exec -n intelgraph-core postgres-0 -- psql -U maestro -d maestro -c "SELECT model_id, avg_latency, success_rate FROM model_performance ORDER BY last_updated DESC LIMIT 10;"
   ```

**Mitigation Steps:**

1. **Restart Router Service**

   ```bash
   kubectl rollout restart deployment/maestro-premium-router -n intelgraph-maestro
   ```

2. **Reset Model Performance Data** (if corrupted)
   ```bash
   kubectl exec -n intelgraph-core postgres-0 -- psql -U maestro -d maestro -c "TRUNCATE TABLE model_performance; INSERT INTO model_performance (model_id, avg_latency, success_rate) VALUES ('gpt-4-turbo', 2000, 0.95), ('claude-3-opus', 1800, 0.97);"
   ```

#### Compliance Violations

**Symptoms:**

- Compliance gate rejection rate increases
- Audit alerts firing
- Regulatory compliance dashboard shows violations

**Investigation Steps:**

1. **Review Recent Violations**

   ```bash
   curl -s "http://localhost:4001/v1/audit/logs?action=compliance_violation&limit=20" | jq '.data[] | {timestamp: .timestamp, policy: .details.policy, resource: .resource}'
   ```

2. **Check Policy Configuration**

   ```bash
   kubectl get configmap maestro-compliance-policies -n intelgraph-maestro -o yaml
   ```

3. **Verify External Policy Engine**
   ```bash
   # Test OPA policy engine
   curl -X POST http://opa:8181/v1/data/maestro/allow -H "Content-Type: application/json" -d '{"input": {"user": "test", "action": "orchestrate", "resource": "test"}}'
   ```

**Mitigation Steps:**

1. **Update Policy Configuration**

   ```bash
   # Update compliance policies if needed
   kubectl apply -f ./config/compliance/updated-policies.yaml
   ```

2. **Temporary Policy Override** (emergency only)
   ```bash
   # Enable emergency override mode
   kubectl patch configmap maestro-config -n intelgraph-maestro --patch '{"data":{"COMPLIANCE_EMERGENCY_OVERRIDE":"true"}}'
   ```

### Maintenance Procedures

#### Weekly Maintenance

**Performance Optimization**

```bash
#!/bin/bash
# Weekly performance optimization

echo "=== Weekly Performance Optimization ==="

# Update Thompson sampling model weights
echo "1. Updating model performance weights..."
curl -X POST http://localhost:4001/v1/router/optimize/update-weights

# Clean up old orchestration logs
echo "2. Cleaning up old orchestration data..."
kubectl exec -n intelgraph-core postgres-0 -- psql -U maestro -d maestro -c "DELETE FROM orchestration_logs WHERE created_at < NOW() - INTERVAL '30 days';"

# Update compliance policies
echo "3. Refreshing compliance policies..."
kubectl apply -f ./config/compliance/policies.yaml

# Optimize database performance
echo "4. Running database maintenance..."
kubectl exec -n intelgraph-core postgres-0 -- psql -U maestro -d maestro -c "VACUUM ANALYZE;"

echo "=== Weekly Maintenance Complete ==="
```

#### Monthly Maintenance

**Model Performance Review**

```bash
#!/bin/bash
# Monthly model performance analysis

echo "=== Monthly Model Performance Review ==="

# Generate performance report
echo "1. Generating model performance report..."
curl -s "http://localhost:4001/v1/router/models" | jq '.[] | {model: .name, quality: .qualityScore, cost: .costPerToken, latency: .averageLatency, availability: .availability}' > monthly_model_report.json

# Update model configurations based on performance
echo "2. Updating model configurations..."
# This would typically involve updating model priorities, cost limits, etc.

# Review and update budget allocations
echo "3. Reviewing budget allocations..."
curl -s "http://prometheus:9090/api/v1/query?query=sum by (tenant_id) (maestro_monthly_cost[30d])" | jq -r '.data.result[] | "\(.metric.tenant_id): $\(.value[1])"'

echo "=== Monthly Review Complete ==="
```

### Emergency Procedures

#### System-Wide Failure

**If complete system failure occurs:**

1. **Activate Emergency Response Team**

   ```bash
   # Page on-call engineers
   pagerduty trigger --service-key=MAESTRO_SERVICE_KEY --incident-key=maestro-system-down --description="Maestro system-wide failure"
   ```

2. **Implement Emergency Failover**

   ```bash
   # Switch to disaster recovery cluster
   kubectl config use-context dr-cluster
   kubectl apply -f ./deploy/emergency/

   # Update DNS to point to DR cluster
   aws route53 change-resource-record-sets --hosted-zone-id Z123456789 --change-batch file://dns-failover.json
   ```

3. **Communication Plan**

   ```bash
   # Send status page update
   curl -X POST https://api.statuspage.io/v1/pages/PAGE_ID/incidents \
     -H "Authorization: OAuth TOKEN" \
     -d "incident[name]=System Maintenance" \
     -d "incident[status]=investigating"

   # Notify customers via email
   python scripts/send_maintenance_notification.py
   ```

#### Data Loss Recovery

**If data corruption or loss occurs:**

1. **Stop All Services**

   ```bash
   kubectl scale deployment --all --replicas=0 -n intelgraph-maestro
   ```

2. **Restore from Backup**

   ```bash
   # Restore PostgreSQL from backup
   kubectl exec -n intelgraph-core postgres-0 -- pg_restore -U maestro -d maestro /backups/maestro_$(date +%Y%m%d).sql

   # Restore Redis state
   kubectl exec -n intelgraph-core redis-0 -- redis-cli --rdb /backups/redis_$(date +%Y%m%d).rdb

   # Restore Neo4j graph data
   kubectl exec -n intelgraph-core neo4j-0 -- neo4j-admin load --from=/backups/neo4j_$(date +%Y%m%d).dump
   ```

3. **Restart Services**
   ```bash
   kubectl scale deployment --all --replicas=3 -n intelgraph-maestro
   ```

## Performance Tuning

### Orchestration Optimization

**Configuration Parameters:**

```yaml
# maestro-config.yaml
orchestration:
  maxConcurrentRequests: 100
  defaultTimeout: 30000
  retryAttempts: 3
  circuitBreakerThreshold: 0.5

premiumRouter:
  thompsonSamplingBeta: 1.0
  explorationRate: 0.1
  modelCacheTimeout: 300

compliance:
  validationTimeout: 5000
  policyRefreshInterval: 3600
  auditLogRetention: 2592000 # 30 days

rateLimiting:
  globalRateLimit: 1000 # per hour
  tenantRateLimit: 100 # per hour
  burstAllowance: 10
```

**Database Optimization:**

```sql
-- PostgreSQL performance tuning
ALTER TABLE orchestration_logs SET (autovacuum_vacuum_scale_factor = 0.1);
CREATE INDEX CONCURRENTLY idx_orchestration_logs_tenant_created
  ON orchestration_logs(tenant_id, created_at DESC);
CREATE INDEX CONCURRENTLY idx_model_performance_updated
  ON model_performance(last_updated DESC);

-- Redis configuration
CONFIG SET maxmemory-policy allkeys-lru
CONFIG SET maxmemory 2gb
CONFIG SET save "900 1 300 10 60 10000"
```

### Monitoring Query Optimization

**Efficient Prometheus Queries:**

```prometheus
# Use recording rules for frequently queried metrics
groups:
  - name: maestro_recording_rules
    rules:
    - record: maestro:orchestration_success_rate_5m
      expr: rate(maestro_orchestration_success[5m]) / rate(maestro_orchestration_requests[5m])
    - record: maestro:avg_orchestration_latency_5m
      expr: rate(maestro_orchestration_latency_sum[5m]) / rate(maestro_orchestration_latency_count[5m])
    - record: maestro:premium_router_efficiency_5m
      expr: (maestro_cost_optimized_total / maestro_total_cost) * 100
```

## Security Considerations

### Access Control

**Service Account Permissions:**

```yaml
# maestro-rbac.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: maestro-operator
  namespace: intelgraph-maestro
rules:
  - apiGroups: ['']
    resources: ['configmaps', 'secrets']
    verbs: ['get', 'list', 'watch']
  - apiGroups: ['apps']
    resources: ['deployments']
    verbs: ['get', 'list', 'patch']
```

### Audit Logging

**Required Audit Events:**

- All orchestration requests and responses
- Premium model routing decisions
- Compliance policy evaluations
- Administrative actions
- Authentication events
- Configuration changes

### Data Protection

**Encryption Requirements:**

- All API communications use TLS 1.3
- Database connections encrypted with SSL
- Sensitive configuration stored in sealed secrets
- Audit logs encrypted at rest

## Backup and Recovery

### Backup Schedule

**Daily Backups:**

```bash
#!/bin/bash
# Daily backup script

DATE=$(date +%Y%m%d)

# PostgreSQL backup
kubectl exec -n intelgraph-core postgres-0 -- pg_dump -U maestro maestro | gzip > /backups/maestro_${DATE}.sql.gz

# Redis backup
kubectl exec -n intelgraph-core redis-0 -- redis-cli bgsave
kubectl cp intelgraph-core/redis-0:/data/dump.rdb /backups/redis_${DATE}.rdb

# Configuration backup
kubectl get configmaps,secrets -n intelgraph-maestro -o yaml > /backups/maestro_config_${DATE}.yaml

# Upload to cloud storage
aws s3 cp /backups/ s3://intelgraph-backups/maestro/ --recursive --include "*${DATE}*"
```

### Recovery Testing

**Monthly Recovery Test:**

```bash
#!/bin/bash
# Monthly disaster recovery test

echo "=== Disaster Recovery Test ==="

# Create test cluster
kubectl create namespace maestro-dr-test

# Restore from backup
kubectl apply -f /backups/maestro_config_$(date -d '1 day ago' +%Y%m%d).yaml -n maestro-dr-test

# Verify functionality
curl -H "Authorization: Bearer ${TEST_TOKEN}" http://test-maestro/v1/health

# Cleanup
kubectl delete namespace maestro-dr-test

echo "=== Recovery Test Complete ==="
```

## Contact Information

### Escalation Matrix

**Level 1: On-Call Engineer**

- Response Time: 15 minutes
- Responsible for initial triage and basic troubleshooting

**Level 2: Senior Platform Engineer**

- Response Time: 30 minutes
- Complex system issues and architecture decisions

**Level 3: Principal Architect**

- Response Time: 1 hour
- System design issues and major incidents

### Emergency Contacts

- **Primary On-Call**: +1-555-MAESTRO (pager)
- **Secondary On-Call**: +1-555-BACKUP (pager)
- **Engineering Manager**: engineering-manager@intelgraph.ai
- **VP Engineering**: vp-engineering@intelgraph.ai

### External Dependencies

- **Cloud Provider Support**: AWS Enterprise Support
- **Model Provider Support**: OpenAI Enterprise, Anthropic Business
- **Monitoring Vendor**: Datadog Premium Support

---

**Document Version**: 1.0  
**Last Updated**: $(date)  
**Next Review Date**: $(date -d '+3 months')  
**Approved By**: VP Engineering
