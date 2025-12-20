# Multi-Cloud Monitoring Dashboards

Grafana dashboards for comprehensive multi-cloud observability.

## Dashboards

### 1. Multi-Cloud Infrastructure Overview
- **File**: `grafana-multi-cloud.json`
- **Metrics**:
  - Total cloud costs across all providers
  - Cost breakdown by provider
  - Cluster health status (AWS EKS, Azure AKS, GCP GKE)
  - Resource utilization (CPU, memory, storage)
  - Cross-cloud network traffic
  - Service mesh metrics (request rate, error rate, latency)
  - Backup status
  - RTO/RPO metrics

### 2. Cost Optimization Dashboard
- **File**: `cost-dashboard.json`
- **Metrics**:
  - Current month spend
  - Budget vs actual
  - Cost trends
  - Cost by service/region
  - Rightsizing opportunities
  - Idle resources
  - Potential savings
  - Untagged resources

### 3. Disaster Recovery Dashboard
- **Metrics**:
  - Backup completion status
  - Replication lag
  - RTO/RPO compliance
  - DR test results
  - Failover readiness

## Setup

### Prerequisites

1. Prometheus for metrics collection
2. Grafana for visualization
3. Exporters for cloud metrics:
   - AWS CloudWatch Exporter
   - Azure Monitor Exporter
   - GCP Stackdriver Exporter

### Installation

```bash
# Install Prometheus
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm install prometheus prometheus-community/kube-prometheus-stack

# Install Grafana (included in kube-prometheus-stack)
# Access Grafana
kubectl port-forward svc/prometheus-grafana 3000:80

# Default credentials: admin/prom-operator
```

### Import Dashboards

```bash
# Using Grafana UI
1. Navigate to Dashboards > Import
2. Upload JSON file or paste JSON content
3. Select Prometheus datasource
4. Click Import

# Using API
curl -X POST http://admin:prom-operator@localhost:3000/api/dashboards/db \
  -H "Content-Type: application/json" \
  -d @grafana-multi-cloud.json
```

## Metrics Collection

### Prometheus Configuration

```yaml
# prometheus-config.yaml
global:
  scrape_interval: 30s
  evaluation_interval: 30s

scrape_configs:
  # Kubernetes clusters
  - job_name: 'kubernetes-nodes'
    kubernetes_sd_configs:
      - role: node

  # AWS CloudWatch
  - job_name: 'cloudwatch'
    static_configs:
      - targets: ['cloudwatch-exporter:9106']

  # Azure Monitor
  - job_name: 'azure-monitor'
    static_configs:
      - targets: ['azure-exporter:9107']

  # GCP Stackdriver
  - job_name: 'stackdriver'
    static_configs:
      - targets: ['stackdriver-exporter:9255']

  # Istio service mesh
  - job_name: 'istio-mesh'
    kubernetes_sd_configs:
      - role: endpoints
    relabel_configs:
      - source_labels: [__meta_kubernetes_service_name]
        regex: 'istio-telemetry'
        action: keep

  # Cost optimization service
  - job_name: 'cost-optimization'
    static_configs:
      - targets: ['cost-optimization:3000']

  # Disaster recovery service
  - job_name: 'disaster-recovery'
    static_configs:
      - targets: ['disaster-recovery:3002']
```

## Alerting Rules

```yaml
# alerts.yaml
groups:
  - name: cost_alerts
    interval: 1h
    rules:
      - alert: BudgetExceeded
        expr: cloud_costs_current_month > cloud_budget_amount
        for: 1h
        annotations:
          summary: "Cloud budget exceeded"

      - alert: HighCostAnomaly
        expr: rate(cloud_costs_daily[1d]) > 1.5 * avg_over_time(cloud_costs_daily[7d])
        for: 30m
        annotations:
          summary: "Unusual cost spike detected"

  - name: dr_alerts
    interval: 15m
    rules:
      - alert: BackupFailed
        expr: backup_last_success_timestamp < time() - 86400
        for: 30m
        annotations:
          summary: "Backup has not succeeded in 24 hours"

      - alert: ReplicationLag
        expr: replication_lag_seconds > 300
        for: 15m
        annotations:
          summary: "Replication lag exceeded 5 minutes"
```

## Custom Metrics

### Exporting Custom Metrics

```typescript
import { register, Counter, Gauge, Histogram } from 'prom-client';

// Cost metrics
const costGauge = new Gauge({
  name: 'cloud_costs_monthly',
  help: 'Monthly cloud costs',
  labelNames: ['provider', 'service']
});

// Backup metrics
const backupTimestamp = new Gauge({
  name: 'backup_last_success_timestamp',
  help: 'Timestamp of last successful backup',
  labelNames: ['resource', 'provider']
});

// DR metrics
const rtoGauge = new Gauge({
  name: 'disaster_recovery_rto_minutes',
  help: 'Recovery Time Objective in minutes'
});
```

## Troubleshooting

### No Data Appearing

1. Check Prometheus targets: `http://localhost:9090/targets`
2. Verify exporters are running: `kubectl get pods -n monitoring`
3. Check Prometheus logs: `kubectl logs -n monitoring prometheus-server-xxx`

### High Cardinality

If dashboards are slow:
1. Reduce scrape interval
2. Add metric relabeling to drop unused labels
3. Use recording rules for expensive queries

## Resources

- [Prometheus Documentation](https://prometheus.io/docs/)
- [Grafana Documentation](https://grafana.com/docs/)
- [Istio Metrics](https://istio.io/latest/docs/reference/config/metrics/)
