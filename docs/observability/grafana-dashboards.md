# IntelGraph Grafana Dashboards

## Overview

This document provides links and descriptions for all IntelGraph observability dashboards in Grafana.

## Dashboard Links

### Production Environment

| Dashboard                   | URL                                                                                                                    | Description                                                    |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| **API Golden Signals**      | [https://grafana.intelgraph.com/d/intelgraph-api-golden](https://grafana.intelgraph.com/d/intelgraph-api-golden)       | Traffic, Errors, Latency, Saturation for API services          |
| **Worker Golden Signals**   | [https://grafana.intelgraph.com/d/intelgraph-worker-golden](https://grafana.intelgraph.com/d/intelgraph-worker-golden) | Job processing, error rates, queue depth, resource utilization |
| **Infrastructure Overview** | [https://grafana.intelgraph.com/d/kubernetes-overview](https://grafana.intelgraph.com/d/kubernetes-overview)           | Kubernetes cluster health and resource usage                   |
| **Security Monitoring**     | [https://grafana.intelgraph.com/d/security-overview](https://grafana.intelgraph.com/d/security-overview)               | Security events, vulnerability metrics, compliance status      |

### Staging Environment

| Dashboard                         | URL                                                                                                                                | Description             |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ----------------------- |
| **API Golden Signals (Stage)**    | [https://grafana-stage.intelgraph.com/d/intelgraph-api-golden](https://grafana-stage.intelgraph.com/d/intelgraph-api-golden)       | Stage API monitoring    |
| **Worker Golden Signals (Stage)** | [https://grafana-stage.intelgraph.com/d/intelgraph-worker-golden](https://grafana-stage.intelgraph.com/d/intelgraph-worker-golden) | Stage worker monitoring |

## Dashboard Descriptions

### API Golden Signals Dashboard

**Purpose**: Monitor the four golden signals for API services
**Panels**:

1. **Request Rate**: Total and successful requests per second
2. **Error Rate**: 5xx error percentage with SLO thresholds
3. **Response Time Latency**: P50, P95, P99 latencies with 1.5s SLO line
4. **Saturation/Throughput**: Requests per minute capacity utilization

**Key Metrics**:

- `http_requests_total` - HTTP request counter
- `http_request_duration_seconds` - Request latency histogram
- `http_request_duration_seconds_bucket` - Latency buckets for percentiles

**Alerting Thresholds**:

- Error Rate > 0.1% (warning), > 1% (critical)
- P95 Latency > 1.5s (warning per Phase 3 requirements)

### Worker Golden Signals Dashboard

**Purpose**: Monitor background job processing and worker health
**Panels**:

1. **Job Processing Rate**: Jobs processed per second by status
2. **Job Error Rate**: Failed job percentage
3. **Job Latency and Queue Depth**: Processing time and backlog
4. **Worker Saturation**: Active vs max workers
5. **Resource Utilization**: CPU and memory usage by container

**Key Metrics**:

- `worker_jobs_processed_total` - Job processing counter
- `worker_job_duration_seconds` - Job processing time
- `worker_queue_size` - Current queue depth
- `worker_active_workers` - Active worker count

## Alert Integration

All dashboards integrate with Prometheus alerting rules defined in:

- `infra/helm/intelgraph/templates/prometheusrule.yaml`

### Critical Alerts

| Alert                            | Threshold               | Action                     |
| -------------------------------- | ----------------------- | -------------------------- |
| **High Error Rate Burn**         | 14.4x error budget burn | Immediate page             |
| **High Latency Burn**            | P95 > 1.5s for 5m       | Page during business hours |
| **Low Availability**             | < 99% availability      | Immediate page             |
| **Pod Crash Looping**            | Restart rate > 0.1/5m   | Page                       |
| **Database Connection Failures** | > 0.1 errors/5m         | Immediate page             |

### Warning Alerts

| Alert                 | Threshold              | Action |
| --------------------- | ---------------------- | ------ |
| **High Memory Usage** | > 90% memory limit     | Ticket |
| **CPU Throttling**    | Throttle rate > 0.1/5m | Ticket |
| **Volume Space High** | > 85% disk usage       | Ticket |

## Runbook Links

Each alert includes a `runbook_url` annotation linking to:

- `https://docs.intelgraph.com/runbooks/high-error-rate`
- `https://docs.intelgraph.com/runbooks/high-latency`
- `https://docs.intelgraph.com/runbooks/low-availability`
- `https://docs.intelgraph.com/runbooks/pod-crash-loop`
- `https://docs.intelgraph.com/runbooks/database-connection-failures`
- `https://docs.intelgraph.com/runbooks/high-memory-usage`
- `https://docs.intelgraph.com/runbooks/cpu-throttling`
- `https://docs.intelgraph.com/runbooks/volume-space-high`

## Service Level Objectives (SLOs)

### API Services

- **Availability**: 99.9% uptime
- **Latency**: P95 < 1.5s (Phase 3 requirement)
- **Error Rate**: < 0.1% (99.9% success rate)

### Worker Services

- **Job Success Rate**: > 99% successful processing
- **Queue Depth**: < 1000 pending jobs during normal operations
- **Processing Latency**: P95 < 30s for standard jobs

## Dashboard Maintenance

### Monthly Review

- Verify all dashboard links are accessible
- Check alert thresholds align with current SLOs
- Update runbook URLs if documentation moves
- Review and optimize query performance

### Quarterly Updates

- Add new service metrics as features are deployed
- Remove deprecated metrics and panels
- Update SLO thresholds based on business requirements
- Performance tune dashboard queries

## Troubleshooting

### Dashboard Not Loading

1. Check Grafana service status
2. Verify Prometheus data source connectivity
3. Check dashboard JSON import/export
4. Review Grafana logs for errors

### Missing Metrics

1. Verify ServiceMonitor is deployed and targeting correct services
2. Check Prometheus targets are up and scraping
3. Validate metric names in application code
4. Review Prometheus configuration and rules

### Slow Dashboard Performance

1. Optimize PromQL queries (use recording rules)
2. Reduce time range for complex queries
3. Add caching to frequently accessed panels
4. Consider dashboard pagination for large metric sets

## Access Control

### Production Dashboards

- **View**: All engineering team members
- **Edit**: SRE team and dashboard maintainers
- **Admin**: Platform team leads

### Staging Dashboards

- **View**: All engineering team members
- **Edit**: All senior engineers
- **Admin**: SRE team

## Integration with External Tools

### Slack Integration

- Alert notifications sent to `#alerts-prod` and `#alerts-stage`
- Dashboard links included in alert messages
- Silent hours: 10 PM - 8 AM local time (non-critical alerts)

### PagerDuty Integration

- Critical alerts trigger PagerDuty incidents
- Dashboard links included in incident details
- Escalation policy: On-call SRE → Engineering Manager → CTO

### Ticket Integration

- Warning alerts create Jira tickets automatically
- Dashboard links included in ticket description
- Auto-assignment based on affected service ownership

**Last Updated**: September 2025
**Owner**: SRE Team
**Next Review**: December 2025
