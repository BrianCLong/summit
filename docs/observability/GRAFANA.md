# IntelGraph Grafana Observability Stack

## Overview

IntelGraph uses a comprehensive observability stack built on industry-standard tools to monitor API performance, system health, and application metrics. This document provides guidance on setting up, using, and customizing the Grafana dashboards and related observability infrastructure.

## Architecture

The observability stack consists of the following components:

### Core Components

1. **Prometheus** - Time-series metrics database
   - Scrapes metrics from application and infrastructure
   - Stores metrics with 30-day retention
   - Evaluates alerting rules

2. **Grafana** - Visualization and dashboarding
   - Pre-configured dashboards for API and system metrics
   - Real-time monitoring with 10-second refresh
   - Integration with Prometheus, Jaeger, and Loki

3. **OpenTelemetry Collector** - Telemetry data pipeline
   - Receives traces, metrics, and logs
   - Processes and enriches telemetry data
   - Exports to multiple backends (Prometheus, Jaeger)

4. **Jaeger** - Distributed tracing
   - Traces requests across microservices
   - Performance bottleneck identification
   - Service dependency mapping

5. **Alertmanager** - Alert routing and management
   - Routes alerts to appropriate channels
   - Deduplicates and groups alerts
   - Supports multiple notification channels

### Exporters

- **Node Exporter** - System-level metrics (CPU, memory, disk)
- **PostgreSQL Exporter** - Database connection pool and query metrics
- **Redis Exporter** - Cache hit rates and memory usage
- **Neo4j Exporter** - Graph database query performance
- **cAdvisor** - Container resource usage

## Getting Started

### Prerequisites

- Docker and Docker Compose installed
- IntelGraph server running
- Network connectivity between services

### Quick Start

1. **Start the observability stack:**

```bash
docker-compose -f docker-compose.observability.yml up -d
```

2. **Verify services are running:**

```bash
docker-compose -f docker-compose.observability.yml ps
```

3. **Access Grafana:**

Open your browser and navigate to:
```
http://localhost:3001
```

Default credentials:
- Username: `admin`
- Password: `admin` (change on first login)

4. **Access other services:**

- **Prometheus**: http://localhost:9090
- **Jaeger UI**: http://localhost:16686
- **Alertmanager**: http://localhost:9093

### Environment Variables

Set these environment variables in your `.env` file:

```bash
# Grafana
GRAFANA_ADMIN_PASSWORD=your_secure_password

# PostgreSQL Exporter
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_password
POSTGRES_HOST=postgres
POSTGRES_PORT=5432
POSTGRES_DB=intelgraph

# Redis Exporter
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=

# Neo4j Exporter
NEO4J_USER=neo4j
NEO4J_PASSWORD=your_password
```

## Pre-configured Dashboards

### 1. API Performance Dashboard

**Location:** `grafana/dashboards/api-performance.json`

**Metrics Tracked:**

- **Request Rate**: Requests per second by HTTP method
- **Error Rate**: Percentage of 5xx errors (with thresholds: 2%, 5%, 10%)
- **Latency Percentiles**: p50, p95, p99 response times
- **Status Code Distribution**: Request breakdown by status code
- **GraphQL Performance**: Query performance by operation
- **GraphQL Error Rate**: Percentage of failed GraphQL operations

**Use Cases:**
- Monitor API SLA compliance
- Identify slow endpoints
- Detect error spikes
- Analyze GraphQL query performance

**Recommended Alerts:**
- API error rate > 5% for 5 minutes
- p95 latency > 2 seconds for 5 minutes
- p99 latency > 5 seconds for 5 minutes

### 2. System Health Dashboard

**Location:** `grafana/dashboards/system-health.json`

**Metrics Tracked:**

- **CPU Usage**: System CPU utilization percentage
- **Memory Usage**: Memory consumption percentage
- **Database Status**: Up/Down status for Neo4j, PostgreSQL, Redis
- **Neo4j Query Performance**: p95 query duration by query type
- **Redis Cache Hit Rate**: Cache efficiency percentage
- **PostgreSQL Connection Pool**: Active database connections
- **Container Resource Usage**: CPU and memory per container

**Use Cases:**
- Monitor infrastructure health
- Detect resource exhaustion
- Track database performance
- Optimize cache configuration

**Recommended Alerts:**
- CPU usage > 85% for 10 minutes
- Memory usage > 90% for 5 minutes
- Cache hit rate < 80% for 10 minutes
- Database connection failures

## Metrics Reference

### HTTP Metrics

```promql
# Total requests by method
http_requests_total{job="intelgraph-server"}

# Request duration histogram
http_request_duration_seconds_bucket{job="intelgraph-server"}

# p95 latency
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))
```

### GraphQL Metrics

```promql
# GraphQL request rate
rate(graphql_requests_total[5m])

# GraphQL error rate
rate(graphql_errors_total[5m]) / rate(graphql_requests_total[5m])

# GraphQL operation duration
graphql_request_duration_seconds{operation="getUserInvestigations"}
```

### Database Metrics

```promql
# Neo4j query duration
neo4j_query_duration_seconds{query_type="read"}

# PostgreSQL connections
pg_stat_database_numbackends

# Redis cache hit rate
rate(redis_keyspace_hits_total[5m]) /
(rate(redis_keyspace_hits_total[5m]) + rate(redis_keyspace_misses_total[5m]))
```

### System Metrics

```promql
# CPU usage
100 - (avg(rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100)

# Memory usage
(node_memory_MemTotal_bytes - node_memory_MemAvailable_bytes) /
node_memory_MemTotal_bytes * 100

# Disk usage
(node_filesystem_size_bytes - node_filesystem_avail_bytes) /
node_filesystem_size_bytes * 100
```

## Alerting Rules

Alert rules are defined in `prometheus/alerts.yml`. The following alert categories are configured:

### API Performance Alerts

- `HighAPIErrorRate` - Error rate > 5% for 5 minutes (warning)
- `CriticalAPIErrorRate` - Error rate > 10% for 2 minutes (critical)
- `HighAPILatencyP95` - p95 latency > 2s for 5 minutes (warning)
- `HighAPILatencyP99` - p99 latency > 5s for 5 minutes (critical)

### Database Performance Alerts

- `SlowNeo4jQueries` - p95 query time > 1s for 5 minutes
- `PostgreSQLConnectionPoolExhaustion` - > 80% pool usage
- `LowRedisCacheHitRate` - Hit rate < 80% for 10 minutes

### System Health Alerts

- `ServiceDown` - Service unreachable for 1 minute (critical)
- `HighCPUUsage` - CPU > 80% for 10 minutes (warning)
- `CriticalCPUUsage` - CPU > 95% for 5 minutes (critical)
- `HighMemoryUsage` - Memory > 85% for 10 minutes (warning)
- `CriticalMemoryUsage` - Memory > 95% for 5 minutes (critical)
- `LowDiskSpace` - < 15% free space (warning)
- `CriticalDiskSpace` - < 5% free space (critical)

### Container Health Alerts

- `ContainerHighMemoryUsage` - Container using > 90% of memory limit
- `ContainerHighCPUUsage` - Container CPU > 80%
- `ContainerHighRestartRate` - Frequent container restarts

## Customizing Dashboards

### Adding a New Panel

1. **Open Grafana** and navigate to the dashboard
2. **Click "Add panel"** in the top right
3. **Select visualization type** (Time series, Gauge, Stat, etc.)
4. **Configure the query:**

```promql
# Example: Track investigation creation rate
rate(investigations_total[5m])
```

5. **Set panel options:**
   - Title
   - Description
   - Legend
   - Thresholds

6. **Save the dashboard**

### Creating a Custom Dashboard

1. **Click "+ Create"** → **Dashboard**
2. **Add panels** with relevant metrics
3. **Organize panels** using drag-and-drop
4. **Configure variables** for dynamic filtering:
   - Go to Dashboard settings → Variables
   - Add variable (e.g., `$instance`, `$job`)
   - Use in queries: `{instance="$instance"}`

5. **Export dashboard JSON:**
   - Dashboard settings → JSON Model
   - Copy JSON and save to `grafana/dashboards/`

### Best Practices

1. **Use consistent naming** for metrics and labels
2. **Set appropriate time ranges** (e.g., Last 1h for real-time, Last 24h for trends)
3. **Configure refresh intervals** (10s for monitoring, 1m for analysis)
4. **Add annotations** for deployments and incidents
5. **Use template variables** to make dashboards reusable
6. **Set meaningful thresholds** based on SLOs
7. **Include documentation** in panel descriptions

## Querying with PromQL

### Common Query Patterns

**Rate calculations:**
```promql
# Request rate per second
rate(http_requests_total[5m])

# Error rate percentage
rate(http_requests_total{status_code=~"5.."}[5m]) /
rate(http_requests_total[5m]) * 100
```

**Aggregations:**
```promql
# Sum across all instances
sum(rate(http_requests_total[5m]))

# Average by route
avg(http_request_duration_seconds) by (route)

# Top 5 slowest operations
topk(5, histogram_quantile(0.95, rate(graphql_request_duration_seconds_bucket[5m])) by (operation))
```

**Histograms and percentiles:**
```promql
# p50 latency
histogram_quantile(0.50, rate(http_request_duration_seconds_bucket[5m]))

# p95 latency
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))

# p99 latency
histogram_quantile(0.99, rate(http_request_duration_seconds_bucket[5m]))
```

## Troubleshooting

### No Data in Dashboards

1. **Check Prometheus targets:**
   - Navigate to http://localhost:9090/targets
   - Ensure all targets are "UP"
   - Check for scrape errors

2. **Verify metrics endpoint:**
```bash
curl http://localhost:4000/metrics
```

3. **Check service logs:**
```bash
docker-compose -f docker-compose.observability.yml logs prometheus
docker-compose -f docker-compose.observability.yml logs otel-collector
```

### High Memory Usage

1. **Reduce Prometheus retention:**
   - Edit `prometheus/prometheus.yml`
   - Set `--storage.tsdb.retention.time=15d`

2. **Limit metrics collection:**
   - Disable unused exporters
   - Add metric filtering in scrape configs

### Slow Dashboard Loading

1. **Reduce time range** (e.g., Last 1h instead of Last 24h)
2. **Optimize queries:**
   - Use `rate()` over shorter intervals
   - Add `by` clauses to reduce cardinality
3. **Enable query result caching** in Grafana settings

## Integration with Application Code

### Adding Metrics to Your Code

```typescript
import { recordHttpRequest, recordGraphQLOperation } from './metrics';

// HTTP middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    recordHttpRequest(req.method, req.route?.path || req.path, res.statusCode, duration);
  });
  next();
});

// GraphQL plugin
const metricsPlugin = {
  async requestDidStart() {
    const start = Date.now();
    return {
      async willSendResponse(requestContext) {
        const duration = (Date.now() - start) / 1000;
        const operation = requestContext.operationName || 'unknown';
        const operationType = requestContext.operation?.operation || 'unknown';
        recordGraphQLOperation(operation, operationType, duration, requestContext.errors?.[0]);
      }
    };
  }
};
```

### Database Query Instrumentation

```typescript
import { recordDatabaseQuery } from './metrics';

// Neo4j query wrapper
async function runNeo4jQuery(query: string, params: any) {
  const start = Date.now();
  try {
    const result = await session.run(query, params);
    const duration = (Date.now() - start) / 1000;
    recordDatabaseQuery('neo4j', 'read', duration, true);
    return result;
  } catch (error) {
    const duration = (Date.now() - start) / 1000;
    recordDatabaseQuery('neo4j', 'read', duration, false);
    throw error;
  }
}
```

## OpenTelemetry Integration

### Configuration

OpenTelemetry Collector is configured in `monitoring/otel/collector-config.yml`:

- **Receivers**: OTLP (gRPC/HTTP), Prometheus, Host metrics
- **Processors**: Batch, Memory limiter, Resource detection
- **Exporters**: Prometheus, Jaeger, Logging

### Sending Traces

The application can send traces to the OTel Collector at:
- gRPC: `http://otel-collector:4317`
- HTTP: `http://otel-collector:4318`

To enable OpenTelemetry instrumentation, update `server/src/otel.ts` with actual implementation.

## Maintenance

### Regular Tasks

1. **Monitor disk usage** - Prometheus TSDB can grow large
2. **Review alert rules** - Adjust thresholds based on SLOs
3. **Update dashboards** - Add new metrics as features are added
4. **Clean old data** - Prometheus automatically prunes based on retention
5. **Backup Grafana config** - Export dashboards periodically

### Upgrading Components

```bash
# Update Docker images in docker-compose.observability.yml
# Then restart the stack
docker-compose -f docker-compose.observability.yml pull
docker-compose -f docker-compose.observability.yml up -d
```

## Security Considerations

1. **Change default passwords** for Grafana and databases
2. **Restrict network access** - Use Docker networks for isolation
3. **Enable HTTPS** for production deployments
4. **Use authentication** for Prometheus and Alertmanager
5. **Sanitize sensitive data** from metrics labels

## Additional Resources

- [Prometheus Documentation](https://prometheus.io/docs/)
- [Grafana Documentation](https://grafana.com/docs/)
- [OpenTelemetry Documentation](https://opentelemetry.io/docs/)
- [PromQL Basics](https://prometheus.io/docs/prometheus/latest/querying/basics/)
- [Grafana Best Practices](https://grafana.com/docs/grafana/latest/best-practices/)

## Support

For issues or questions about the observability stack:

1. Check service logs in Docker Compose
2. Review Prometheus target status
3. Consult the IntelGraph team documentation
4. Refer to component-specific documentation above
