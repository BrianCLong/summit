# Maestro Conductor Operations Guide

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Monitoring](#monitoring)
- [Alerting](#alerting)
- [Troubleshooting](#troubleshooting)
- [Performance Tuning](#performance-tuning)
- [Backup & Recovery](#backup--recovery)
- [Security](#security)

## Overview

Maestro Conductor vNext is a distributed workflow orchestration platform designed for enterprise-scale operations. This guide covers operational aspects including monitoring, alerting, troubleshooting, and performance optimization.

### Key Components

- **API Gateway**: GraphQL and REST endpoints
- **Workflow Engine**: Core orchestration engine
- **Executor Pool**: Distributed task execution
- **Database**: PostgreSQL for persistence
- **Message Queue**: Redis for async operations
- **Monitoring Stack**: Prometheus, Grafana, Jaeger

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Load Balancer │    │   API Gateway   │    │  Web Dashboard  │
│   (HAProxy)     │◄──►│   (GraphQL)     │◄──►│   (React)       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
                                ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Auth Service  │◄──►│ Workflow Engine │◄──►│ Billing Service │
│   (OAuth2/JWT)  │    │   (Core)        │    │ (Usage Meter)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
                                ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Message Queue │◄──►│ Executor Pool   │◄──►│  File Storage   │
│   (Redis)       │    │ (Containers)    │    │  (S3/MinIO)     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
                                ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Database      │    │   Monitoring    │    │    Logging      │
│   (PostgreSQL)  │    │  (Prometheus)   │    │ (ELK/Fluentd)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Monitoring

### Key Metrics

#### System Metrics

```yaml
# CPU & Memory
- maestro_cpu_usage_percent
- maestro_memory_usage_bytes
- maestro_memory_usage_percent

# Disk & Network
- maestro_disk_usage_bytes
- maestro_disk_io_operations_total
- maestro_network_bytes_transmitted_total
- maestro_network_bytes_received_total
```

#### Application Metrics

```yaml
# Workflow Metrics
- maestro_workflows_total
- maestro_workflow_runs_total
- maestro_workflow_run_duration_seconds
- maestro_workflow_success_rate
- maestro_workflow_failure_rate

# Executor Metrics
- maestro_executor_pool_size
- maestro_executor_active_tasks
- maestro_executor_queue_length
- maestro_executor_task_duration_seconds

# API Metrics
- maestro_http_requests_total
- maestro_http_request_duration_seconds
- maestro_graphql_query_duration_seconds
- maestro_graphql_errors_total
```

#### Business Metrics

```yaml
# Usage Metrics
- maestro_api_calls_per_customer
- maestro_workflow_executions_per_customer
- maestro_storage_usage_per_customer
- maestro_compute_time_per_customer

# Billing Metrics
- maestro_revenue_per_customer
- maestro_cost_per_execution
- maestro_margin_per_customer
```

### Prometheus Configuration

```yaml
# prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  - 'maestro_alerts.yml'

scrape_configs:
  - job_name: 'maestro-api'
    static_configs:
      - targets: ['api:3000']
    metrics_path: '/metrics'
    scrape_interval: 30s

  - job_name: 'maestro-executors'
    kubernetes_sd_configs:
      - role: pod
    relabel_configs:
      - source_labels: [__meta_kubernetes_pod_label_app]
        action: keep
        regex: maestro-executor

  - job_name: 'postgres-exporter'
    static_configs:
      - targets: ['postgres-exporter:9187']

  - job_name: 'redis-exporter'
    static_configs:
      - targets: ['redis-exporter:9121']
```

### Grafana Dashboards

#### Main Dashboard Panels

1. **System Overview**
   - CPU usage across all nodes
   - Memory utilization
   - Network I/O
   - Disk usage

2. **Workflow Performance**
   - Workflow execution rate
   - Average execution time
   - Success/failure rates
   - Queue depth

3. **API Performance**
   - Request rate
   - Response times
   - Error rates
   - GraphQL query performance

4. **Resource Utilization**
   - Database connections
   - Redis memory usage
   - Executor pool utilization
   - Storage usage

## Alerting

### Critical Alerts

```yaml
# maestro_alerts.yml
groups:
  - name: maestro_critical
    rules:
      - alert: MaestroAPIDown
        expr: up{job="maestro-api"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: 'Maestro API is down'
          description: 'The Maestro API has been down for more than 1 minute'

      - alert: HighWorkflowFailureRate
        expr: rate(maestro_workflow_failures_total[5m]) / rate(maestro_workflow_runs_total[5m]) > 0.1
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: 'High workflow failure rate'
          description: 'Workflow failure rate is {{ $value | humanizePercentage }} over the last 5 minutes'

      - alert: DatabaseConnectionsExhausted
        expr: pg_stat_activity_count / pg_settings_max_connections > 0.9
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: 'Database connections nearly exhausted'
          description: 'Database is using {{ $value | humanizePercentage }} of available connections'

      - alert: ExecutorPoolSaturated
        expr: maestro_executor_queue_length > 1000
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: 'Executor pool is saturated'
          description: 'Executor queue length is {{ $value }}, indicating overload'
```

### Warning Alerts

```yaml
- name: maestro_warnings
  rules:
    - alert: HighAPILatency
      expr: histogram_quantile(0.95, rate(maestro_http_request_duration_seconds_bucket[5m])) > 2
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: 'High API latency'
        description: '95th percentile latency is {{ $value }}s'

    - alert: MemoryUsageHigh
      expr: maestro_memory_usage_percent > 80
      for: 10m
      labels:
        severity: warning
      annotations:
        summary: 'High memory usage'
        description: 'Memory usage is {{ $value }}% on {{ $labels.instance }}'

    - alert: DiskSpaceLow
      expr: (1 - maestro_disk_free_bytes / maestro_disk_total_bytes) > 0.85
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: 'Low disk space'
        description: 'Disk usage is {{ $value | humanizePercentage }} on {{ $labels.instance }}'
```

### PagerDuty Integration

```yaml
# alertmanager.yml
global:
  pagerduty_url: 'https://events.pagerduty.com/v2/enqueue'

route:
  group_by: ['alertname']
  group_wait: 10s
  group_interval: 10s
  repeat_interval: 1h
  receiver: 'pagerduty-critical'
  routes:
    - match:
        severity: warning
      receiver: 'slack-warnings'
    - match:
        severity: critical
      receiver: 'pagerduty-critical'

receivers:
  - name: 'pagerduty-critical'
    pagerduty_configs:
      - service_key: 'YOUR_PAGERDUTY_SERVICE_KEY'
        description: '{{ range .Alerts }}{{ .Annotations.summary }}{{ end }}'

  - name: 'slack-warnings'
    slack_configs:
      - api_url: 'YOUR_SLACK_WEBHOOK_URL'
        channel: '#maestro-alerts'
        title: 'Maestro Warning Alert'
        text: '{{ range .Alerts }}{{ .Annotations.description }}{{ end }}'
```

## Troubleshooting

### Common Issues

#### 1. High Workflow Failure Rate

**Symptoms:**

- Increased error rates in monitoring
- User reports of failed workflows
- Growing queue of retries

**Diagnosis:**

```bash
# Check recent workflow failures
kubectl logs -l app=maestro-api --since=1h | grep "workflow_failed"

# Check executor health
kubectl get pods -l app=maestro-executor
kubectl describe pod <failing-executor-pod>

# Check database for failed workflows
psql -h postgres -d maestro -c "
  SELECT w.name, wr.status, wr.error_message, wr.created_at
  FROM workflow_runs wr
  JOIN workflows w ON wr.workflow_id = w.id
  WHERE wr.status = 'failed'
  AND wr.created_at > NOW() - INTERVAL '1 hour'
  ORDER BY wr.created_at DESC
  LIMIT 20;
"
```

**Resolution:**

1. Scale up executor pool if resource constrained
2. Check for code issues in failing workflows
3. Verify external service dependencies
4. Review recent configuration changes

#### 2. API Performance Degradation

**Symptoms:**

- Increased response times
- Timeout errors
- High CPU usage on API servers

**Diagnosis:**

```bash
# Check API server logs
kubectl logs -l app=maestro-api --since=30m | grep -E "(slow|timeout|error)"

# Check database query performance
psql -h postgres -d maestro -c "
  SELECT query, mean_time, calls, total_time
  FROM pg_stat_statements
  ORDER BY mean_time DESC
  LIMIT 10;
"

# Check Redis performance
redis-cli --latency-history -h redis
```

**Resolution:**

1. Scale out API servers horizontally
2. Optimize slow database queries
3. Implement caching for frequent queries
4. Review recent code deployments

#### 3. Database Connection Issues

**Symptoms:**

- "Too many connections" errors
- Connection timeouts
- Application startup failures

**Diagnosis:**

```bash
# Check current connections
psql -h postgres -d maestro -c "
  SELECT count(*), state
  FROM pg_stat_activity
  WHERE datname = 'maestro'
  GROUP BY state;
"

# Check connection limits
psql -h postgres -d maestro -c "SHOW max_connections;"

# Check for connection leaks
kubectl logs -l app=maestro-api | grep -i "connection"
```

**Resolution:**

1. Increase PostgreSQL max_connections
2. Implement connection pooling (PgBouncer)
3. Fix connection leaks in application code
4. Monitor connection usage trends

### Debugging Tools

#### Log Analysis

```bash
# Centralized logging with ELK stack
curl -X GET "elasticsearch:9200/maestro-logs-*/_search" -H 'Content-Type: application/json' -d'
{
  "query": {
    "bool": {
      "must": [
        {"range": {"@timestamp": {"gte": "now-1h"}}},
        {"term": {"level": "error"}}
      ]
    }
  },
  "sort": [{"@timestamp": {"order": "desc"}}],
  "size": 100
}
'

# Application-specific logs
kubectl logs -l app=maestro-api --since=1h --tail=500 | grep ERROR
kubectl logs -l app=maestro-executor --since=1h --tail=500 | grep FATAL
```

#### Performance Profiling

```bash
# Enable Go pprof endpoint
curl http://api:3000/debug/pprof/profile?seconds=30 > cpu.prof
go tool pprof cpu.prof

# Memory profiling
curl http://api:3000/debug/pprof/heap > heap.prof
go tool pprof heap.prof

# Goroutine analysis
curl http://api:3000/debug/pprof/goroutine > goroutine.prof
go tool pprof goroutine.prof
```

#### Database Analysis

```sql
-- Check slow queries
SELECT query, mean_time, calls, total_time
FROM pg_stat_statements
WHERE mean_time > 1000  -- queries taking > 1 second
ORDER BY mean_time DESC;

-- Check table sizes
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Check index usage
SELECT
  schemaname,
  tablename,
  attname,
  n_distinct,
  correlation
FROM pg_stats
WHERE schemaname = 'public'
AND n_distinct > 0
ORDER BY n_distinct DESC;
```

## Performance Tuning

### Database Optimization

#### PostgreSQL Configuration

```ini
# postgresql.conf
shared_buffers = 4GB                    # 25% of system RAM
effective_cache_size = 12GB             # 75% of system RAM
work_mem = 256MB                        # Per-query memory
maintenance_work_mem = 2GB              # For maintenance operations
checkpoint_completion_target = 0.9      # Spread checkpoints
wal_buffers = 64MB                      # WAL buffer size
random_page_cost = 1.1                  # For SSD storage
effective_io_concurrency = 200          # For SSD storage

# Connection settings
max_connections = 400
shared_preload_libraries = 'pg_stat_statements'

# Monitoring
log_min_duration_statement = 1000       # Log slow queries
log_line_prefix = '%t [%p]: [%l-1] user=%u,db=%d,app=%a,client=%h '
log_checkpoints = on
log_connections = on
log_disconnections = on
```

#### Index Optimization

```sql
-- Create indexes for common queries
CREATE INDEX CONCURRENTLY idx_workflow_runs_status_created
ON workflow_runs (status, created_at);

CREATE INDEX CONCURRENTLY idx_workflow_runs_workflow_id_created
ON workflow_runs (workflow_id, created_at DESC);

CREATE INDEX CONCURRENTLY idx_task_executions_status_created
ON task_executions (status, created_at);

-- Partial indexes for active workflows
CREATE INDEX CONCURRENTLY idx_workflow_runs_active
ON workflow_runs (workflow_id, created_at)
WHERE status IN ('running', 'pending');

-- Composite indexes for dashboard queries
CREATE INDEX CONCURRENTLY idx_workflow_runs_dashboard
ON workflow_runs (user_id, status, created_at DESC);
```

### Application Performance

#### Connection Pooling

```yaml
# PgBouncer configuration
[databases]
maestro = host=postgres port=5432 dbname=maestro

[pgbouncer]
listen_addr = 0.0.0.0
listen_port = 6432
auth_type = md5
auth_file = /etc/pgbouncer/userlist.txt
admin_users = pgbouncer
pool_mode = transaction
max_client_conn = 1000
default_pool_size = 100
reserve_pool_size = 10
server_round_robin = 1
```

#### Redis Optimization

```yaml
# redis.conf
maxmemory 8gb
maxmemory-policy allkeys-lru
save 900 1
save 300 10
save 60 10000
tcp-keepalive 300
timeout 300

# Cluster configuration for high availability
cluster-enabled yes
cluster-config-file nodes.conf
cluster-node-timeout 15000
```

#### Caching Strategy

```typescript
// Application-level caching
import Redis from 'ioredis';

class CacheManager {
  private redis: Redis;

  constructor() {
    this.redis = new Redis({
      host: 'redis',
      port: 6379,
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
    });
  }

  async getWorkflow(id: string): Promise<Workflow | null> {
    const cached = await this.redis.get(`workflow:${id}`);
    if (cached) {
      return JSON.parse(cached);
    }

    const workflow = await this.database.getWorkflow(id);
    if (workflow) {
      await this.redis.setex(`workflow:${id}`, 300, JSON.stringify(workflow));
    }

    return workflow;
  }

  async invalidateWorkflow(id: string): Promise<void> {
    await this.redis.del(`workflow:${id}`);
  }
}
```

### Scaling Strategies

#### Horizontal Scaling

```yaml
# Kubernetes Horizontal Pod Autoscaler
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: maestro-api-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: maestro-api
  minReplicas: 3
  maxReplicas: 20
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: 80
  behavior:
    scaleUp:
      stabilizationWindowSeconds: 60
      policies:
        - type: Percent
          value: 100
          periodSeconds: 15
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
        - type: Percent
          value: 10
          periodSeconds: 60
```

#### Load Balancing

```yaml
# HAProxy configuration
global
daemon
maxconn 4096

defaults
mode http
timeout connect 5000ms
timeout client 50000ms
timeout server 50000ms
option httplog

frontend maestro_frontend
bind *:80
bind *:443 ssl crt /etc/ssl/certs/maestro.pem
redirect scheme https if !{ ssl_fc }
default_backend maestro_api

backend maestro_api
balance roundrobin
option httpchk GET /health
server api1 maestro-api-1:3000 check
server api2 maestro-api-2:3000 check
server api3 maestro-api-3:3000 check
```

## Backup & Recovery

### Database Backup Strategy

#### Automated Backups

```bash
#!/bin/bash
# backup-maestro.sh

DATE=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="/backups/maestro"
DB_HOST="postgres"
DB_NAME="maestro"
DB_USER="maestro"

# Create backup directory
mkdir -p $BACKUP_DIR

# Full database backup
pg_dump -h $DB_HOST -U $DB_USER -d $DB_NAME \
  --format=custom \
  --compress=9 \
  --file="$BACKUP_DIR/maestro_full_$DATE.backup"

# Schema-only backup
pg_dump -h $DB_HOST -U $DB_USER -d $DB_NAME \
  --schema-only \
  --file="$BACKUP_DIR/maestro_schema_$DATE.sql"

# Upload to S3
aws s3 cp "$BACKUP_DIR/maestro_full_$DATE.backup" \
  s3://maestro-backups/database/

# Cleanup old local backups (keep 7 days)
find $BACKUP_DIR -name "maestro_full_*.backup" -mtime +7 -delete

echo "Backup completed: maestro_full_$DATE.backup"
```

#### Point-in-Time Recovery

```bash
# Enable WAL archiving in PostgreSQL
archive_mode = on
archive_command = 'aws s3 cp %p s3://maestro-backups/wal/%f'
wal_level = replica

# Recovery script
#!/bin/bash
# restore-maestro.sh

BACKUP_FILE="$1"
RECOVERY_TARGET_TIME="$2"  # Format: 2023-12-01 12:00:00

if [ -z "$BACKUP_FILE" ] || [ -z "$RECOVERY_TARGET_TIME" ]; then
  echo "Usage: $0 <backup_file> <recovery_target_time>"
  exit 1
fi

# Stop PostgreSQL
systemctl stop postgresql

# Clear data directory
rm -rf /var/lib/postgresql/data/*

# Restore base backup
pg_restore -d maestro $BACKUP_FILE

# Create recovery configuration
cat > /var/lib/postgresql/data/recovery.conf << EOF
restore_command = 'aws s3 cp s3://maestro-backups/wal/%f %p'
recovery_target_time = '$RECOVERY_TARGET_TIME'
recovery_target_action = 'promote'
EOF

# Start PostgreSQL
systemctl start postgresql

echo "Recovery initiated to $RECOVERY_TARGET_TIME"
```

### Application State Backup

#### Workflow Definitions

```bash
#!/bin/bash
# backup-workflows.sh

API_URL="https://api.maestro.com"
API_KEY="your-api-key"
BACKUP_DIR="/backups/workflows"
DATE=$(date +"%Y%m%d_%H%M%S")

mkdir -p $BACKUP_DIR

# Export all workflows
npx ts-node tools/migration/export-manifest.ts \
  "$BACKUP_DIR" \
  "$API_URL" \
  "$API_KEY" \
  "json" \
  --include-secrets \
  --environment "production"

# Upload to S3
aws s3 cp "$BACKUP_DIR/maestro-export-*.json" \
  s3://maestro-backups/workflows/

echo "Workflow backup completed"
```

### Disaster Recovery Plan

#### RTO/RPO Targets

- **Recovery Time Objective (RTO)**: 4 hours
- **Recovery Point Objective (RPO)**: 15 minutes

#### Recovery Procedures

1. **Database Recovery**

   ```bash
   # Restore from latest backup
   ./restore-maestro.sh /backups/maestro_full_latest.backup

   # Apply any missing WAL files
   # PostgreSQL will automatically replay to recovery target
   ```

2. **Application Recovery**

   ```bash
   # Deploy application from last known good image
   kubectl set image deployment/maestro-api \
     maestro-api=maestro/api:v1.2.3

   # Restore workflow definitions
   npx ts-node tools/migration/import-manifest.ts \
     /backups/workflows/maestro-export-latest.json \
     $API_URL $API_KEY \
     --update-existing
   ```

3. **Verification**

   ```bash
   # Health checks
   curl -f http://api.maestro.com/health

   # Run smoke tests
   npm run test:smoke

   # Verify critical workflows
   npx ts-node tools/bench/run-suite.ts \
     --suite smoke-test \
     --endpoint $API_URL
   ```

## Security

### Security Monitoring

#### Failed Authentication Attempts

```bash
# Monitor auth failures
kubectl logs -l app=maestro-api | grep "authentication_failed" | \
  awk '{print $1, $2, $NF}' | sort | uniq -c | sort -nr
```

#### Unusual API Usage

```sql
-- Detect unusual API patterns
SELECT
  user_id,
  COUNT(*) as request_count,
  COUNT(DISTINCT endpoint) as unique_endpoints,
  COUNT(DISTINCT DATE_TRUNC('hour', created_at)) as active_hours
FROM api_requests
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY user_id
HAVING COUNT(*) > 10000  -- Threshold for investigation
ORDER BY request_count DESC;
```

#### Security Compliance

```yaml
# Security scanning with Trivy
apiVersion: batch/v1
kind: CronJob
metadata:
  name: security-scan
spec:
  schedule: '0 2 * * *' # Daily at 2 AM
  jobTemplate:
    spec:
      template:
        spec:
          containers:
            - name: trivy
              image: aquasec/trivy:latest
              command:
                - trivy
                - image
                - --exit-code
                - '1'
                - --severity
                - 'HIGH,CRITICAL'
                - maestro/api:latest
          restartPolicy: OnFailure
```

### Access Control

#### RBAC Configuration

```yaml
# Kubernetes RBAC
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: maestro-operator
rules:
  - apiGroups: ['']
    resources: ['pods', 'services', 'configmaps']
    verbs: ['get', 'list', 'watch', 'create', 'update', 'patch']
  - apiGroups: ['apps']
    resources: ['deployments', 'replicasets']
    verbs: ['get', 'list', 'watch', 'create', 'update', 'patch']

---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: maestro-operator-binding
subjects:
  - kind: ServiceAccount
    name: maestro-operator
    namespace: maestro
roleRef:
  kind: Role
  name: maestro-operator
  apiGroup: rbac.authorization.k8s.io
```

This comprehensive operations guide provides the foundation for running Maestro Conductor vNext in production environments with proper monitoring, alerting, and troubleshooting capabilities.
