# IntelGraph Monitoring & Observability

This directory contains the monitoring and observability stack for the IntelGraph platform, built around Prometheus, Grafana, and Alertmanager.

## Overview

The monitoring stack provides:

- **Metrics Collection**: Prometheus scrapes metrics from all services
- **Visualization**: Grafana dashboards for monitoring and analysis
- **Alerting**: Alertmanager handles alert routing and notifications
- **Health Checks**: Comprehensive health monitoring for all components
- **Performance Monitoring**: Request tracing and performance metrics

## Architecture

```
┌─────────────────┐    ┌──────────────┐    ┌─────────────────┐
│   IntelGraph    │    │ IntelGraph   │    │   Exporters     │
│   Server        │───▶│ ML Service   │───▶│ (Redis, PG,     │
│   (Node.js)     │    │ (Python)     │    │  Neo4j, etc.)   │
└─────────────────┘    └──────────────┘    └─────────────────┘
         │                       │                    │
         └───────────────────────┼────────────────────┘
                                 │
                    ┌────────────▼─────────────┐
                    │      Prometheus          │
                    │   (Metrics Collection)   │
                    └────────────┬─────────────┘
                                 │
                    ┌────────────▼─────────────┐
                    │       Grafana           │
                    │   (Visualization)       │
                    └─────────────────────────┘
                                 │
                    ┌────────────▼─────────────┐
                    │    Alertmanager         │
                    │   (Alert Routing)       │
                    └─────────────────────────┘
```

## Quick Start

### 1. Start the Monitoring Stack

```bash
# Start all monitoring services
docker-compose -f docker-compose.monitoring.yml up -d

# Check service status
docker-compose -f docker-compose.monitoring.yml ps
```

### 2. Access the Interfaces

- **Prometheus**: http://localhost:9090
- **Grafana**: http://localhost:3000 (admin/admin123)
- **Alertmanager**: http://localhost:9093

### 3. Configure Your Services

Ensure your IntelGraph services expose metrics endpoints:

**Server (Node.js)**:
```javascript
// Add monitoring middleware
const { httpMetricsMiddleware } = require('./src/monitoring/middleware');
app.use(httpMetricsMiddleware);

// Add monitoring routes
const monitoringRouter = require('./src/routes/monitoring');
app.use('/monitoring', monitoringRouter);
```

**ML Service (Python)**:
```python
# Metrics are automatically tracked via middleware
# Health checks available at /health, /health/ready, /health/live
```

## Metrics Reference

### HTTP Metrics

| Metric | Type | Description | Labels |
|--------|------|-------------|--------|
| `http_requests_total` | Counter | Total HTTP requests | method, route, status_code |
| `http_request_duration_seconds` | Histogram | HTTP request duration | method, route, status_code |

### GraphQL Metrics

| Metric | Type | Description | Labels |
|--------|------|-------------|--------|
| `graphql_requests_total` | Counter | Total GraphQL requests | operation, operation_type, status |
| `graphql_request_duration_seconds` | Histogram | GraphQL request duration | operation, operation_type |
| `graphql_errors_total` | Counter | Total GraphQL errors | operation, error_type |

### AI/ML Metrics

| Metric | Type | Description | Labels |
|--------|------|-------------|--------|
| `ai_jobs_queued` | Gauge | AI jobs in queue | job_type |
| `ai_jobs_processing` | Gauge | AI jobs processing | job_type |
| `ai_job_duration_seconds` | Histogram | AI job duration | job_type, status |
| `ml_model_predictions_total` | Counter | ML predictions made | model_type, status |
| `entities_extracted_total` | Counter | Entities extracted | source, entity_type |

### Database Metrics

| Metric | Type | Description | Labels |
|--------|------|-------------|--------|
| `db_connections_active` | Gauge | Active DB connections | database |
| `db_query_duration_seconds` | Histogram | DB query duration | database, operation |
| `db_queries_total` | Counter | Total DB queries | database, operation, status |

### Graph Metrics

| Metric | Type | Description | Labels |
|--------|------|-------------|--------|
| `graph_nodes_total` | Gauge | Total graph nodes | investigation_id |
| `graph_edges_total` | Gauge | Total graph edges | investigation_id |
| `graph_operation_duration_seconds` | Histogram | Graph operation duration | operation, investigation_id |

## Health Checks

### Endpoints

All services expose standard health check endpoints:

| Endpoint | Purpose | Kubernetes |
|----------|---------|------------|
| `/health` | Comprehensive health check | - |
| `/health/quick` | Cached health status | - |
| `/health/live` | Liveness probe | ✓ |
| `/health/ready` | Readiness probe | ✓ |
| `/health/info` | Service information | - |

### Health Check Components

**Server Health Checks**:
- PostgreSQL connectivity
- Neo4j connectivity  
- Redis connectivity
- ML service connectivity
- System resources (CPU, memory)

**ML Service Health Checks**:
- Redis connectivity
- Neo4j connectivity
- Main API connectivity
- System resources
- ML model availability
- GPU availability (if applicable)

## Alerting

### Alert Severities

- **Critical**: Service down, database failures, critical errors
- **Warning**: High error rates, resource usage, performance issues
- **Info**: General notifications, maintenance events

### Alert Routing

Alerts are routed based on severity:

1. **Critical alerts** → Immediate notification (email, Slack, PagerDuty)
2. **Warning alerts** → Batched notifications every 30 minutes
3. **Info alerts** → Monitoring channel notifications

### Configuration

Edit `alertmanager.yml` to configure:
- Email settings
- Slack webhooks
- PagerDuty integration
- Custom routing rules

## Grafana Dashboards

### Available Dashboards

1. **IntelGraph Overview** - High-level system metrics
2. **HTTP Performance** - Request rates, latencies, errors
3. **GraphQL Operations** - GraphQL-specific metrics
4. **AI/ML Workflows** - ML job processing and model performance
5. **Database Performance** - PostgreSQL, Neo4j, Redis metrics
6. **System Resources** - CPU, memory, disk, network
7. **Investigation Analytics** - Investigation-specific metrics

### Custom Dashboards

Create custom dashboards by:
1. Accessing Grafana at http://localhost:3000
2. Using the Prometheus datasource
3. Building panels with PromQL queries
4. Saving and sharing dashboard JSON

## Performance Monitoring

### Request Tracing

For distributed tracing, Jaeger is included:
- **Jaeger UI**: http://localhost:16686
- **Trace Collection**: Automatic via OpenTelemetry

### Performance Thresholds

Default alert thresholds:
- Response time P95 > 2 seconds
- Error rate > 10%
- CPU usage > 90%
- Memory usage > 90%
- Disk usage > 95%

## Maintenance

### Log Rotation

Prometheus retains metrics for 30 days by default. Configure retention with:
```yaml
command:
  - '--storage.tsdb.retention.time=30d'
```

### Backup

Important data to backup:
- Grafana dashboards: `/var/lib/grafana`
- Prometheus data: `/prometheus`
- Alert configuration: `alertmanager.yml`

### Updates

Update monitoring stack:
```bash
# Pull latest images
docker-compose -f docker-compose.monitoring.yml pull

# Restart services
docker-compose -f docker-compose.monitoring.yml up -d
```

## Troubleshooting

### Common Issues

**Metrics not appearing**:
1. Check service discovery in Prometheus targets
2. Verify metrics endpoints are accessible
3. Check for firewall/network issues

**Alerts not firing**:
1. Verify alert rules syntax with `promtool`
2. Check Alertmanager configuration
3. Verify notification channels

**High memory usage**:
1. Adjust Prometheus retention settings
2. Configure recording rules for expensive queries
3. Use remote storage for long-term retention

### Debug Commands

```bash
# Check Prometheus targets
curl http://localhost:9090/api/v1/targets

# Validate alert rules
docker run --rm -v $(pwd)/monitoring:/etc/prometheus prom/prometheus:latest promtool check rules /etc/prometheus/alert_rules.yml

# Test alert delivery
curl -X POST http://localhost:9093/api/v1/alerts

# Check service logs
docker-compose -f docker-compose.monitoring.yml logs prometheus
docker-compose -f docker-compose.monitoring.yml logs grafana
docker-compose -f docker-compose.monitoring.yml logs alertmanager
```

## Security

### Authentication

- Grafana: Default admin/admin123 (change in production)
- Prometheus: No auth by default (add reverse proxy in production)
- Alertmanager: No auth by default (add reverse proxy in production)

### Network Security

In production:
1. Use reverse proxy with authentication
2. Enable TLS for all communications
3. Restrict network access to monitoring services
4. Use strong passwords and API keys

### Secrets Management

Store sensitive configuration in:
- Environment variables
- Docker secrets
- External secret management systems

## Production Deployment

### High Availability

For production deployment:
1. Run multiple Prometheus instances
2. Use external storage (e.g., Thanos, Cortex)
3. Deploy Alertmanager in cluster mode
4. Use external database for Grafana

### Scaling

Scale monitoring for large deployments:
1. Use federation for multiple Prometheus instances
2. Implement recording rules for expensive queries
3. Use remote storage for long-term retention
4. Shard metrics collection by service type

### Compliance

For regulatory compliance:
1. Enable audit logging
2. Implement data retention policies
3. Secure data transmission and storage
4. Regular security assessments