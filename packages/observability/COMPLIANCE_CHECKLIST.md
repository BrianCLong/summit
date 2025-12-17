# CompanyOS Service Observability Compliance Checklist

Use this checklist when onboarding a new service to ensure full observability compliance.

## Service Information

- **Service Name**: ________________
- **Version**: ________________
- **Team**: ________________
- **Archetype**: [ ] api-service [ ] worker-service [ ] gateway-service [ ] data-pipeline [ ] storage-service [ ] ml-service
- **Tier**: [ ] critical [ ] standard [ ] background
- **Review Date**: ________________
- **Reviewer**: ________________

---

## 1. SDK Integration

### 1.1 Package Installation
- [ ] `@companyos/observability` package installed
- [ ] Package version is latest stable release
- [ ] Peer dependencies satisfied (express, etc.)

### 1.2 Initialization
- [ ] `initializeObservability()` called at service startup
- [ ] Service config includes name, version, environment
- [ ] Archetype correctly specified
- [ ] Graceful shutdown calls `shutdownObservability()`

**Code Reference**:
```typescript
import { initializeObservability } from '@companyos/observability';

await initializeObservability({
  service: {
    name: 'my-service',
    version: '1.0.0',
    environment: 'production',
    team: 'platform',
    tier: 'standard',
  },
  archetype: 'api-service',
});
```

---

## 2. Metrics

### 2.1 Required Endpoints
- [ ] `/metrics` endpoint returns Prometheus format
- [ ] Endpoint is accessible by Prometheus scraper
- [ ] Content-Type is `text/plain; version=0.0.4`

### 2.2 Standard Metrics (based on archetype)

#### All Services
- [ ] `errors_total` with labels: service, error_type, severity

#### API Services
- [ ] `http_requests_total` with labels: service, method, route, status_code
- [ ] `http_request_duration_seconds` histogram with appropriate buckets
- [ ] `http_requests_in_flight` gauge

#### Worker Services
- [ ] `jobs_processed_total` with labels: service, queue, job_type, status
- [ ] `job_duration_seconds` histogram
- [ ] `jobs_in_queue` gauge
- [ ] `jobs_in_progress` gauge

#### Database Access
- [ ] `db_queries_total` with labels: service, db_system, operation, status
- [ ] `db_query_duration_seconds` histogram
- [ ] `db_connections_active` gauge
- [ ] `db_connections_idle` gauge

#### Cache Access
- [ ] `cache_operations_total` with labels: service, cache_name, operation, result
- [ ] `cache_operation_duration_seconds` histogram

#### External Calls
- [ ] `external_requests_total` with labels: service, target_service, method, status
- [ ] `external_request_duration_seconds` histogram

### 2.3 Labels
- [ ] All metrics include `service` label
- [ ] All metrics include `environment` label
- [ ] All metrics include `version` label
- [ ] No high-cardinality labels (user IDs, request IDs, etc.)

### 2.4 Histogram Buckets
- [ ] HTTP latency buckets appropriate for expected latencies
- [ ] Database query buckets appropriate for expected query times
- [ ] Job duration buckets appropriate for expected job lengths

---

## 3. Logging

### 3.1 Structure
- [ ] All logs are structured JSON
- [ ] Log schema matches CompanyOS specification
- [ ] Timestamp in ISO 8601 format
- [ ] Level as uppercase string (INFO, ERROR, etc.)

### 3.2 Required Fields
- [ ] `timestamp` present on all logs
- [ ] `level` present on all logs
- [ ] `message` present on all logs
- [ ] `service` present on all logs
- [ ] `environment` present on all logs
- [ ] `version` present on all logs

### 3.3 Context Fields
- [ ] `traceId` included when available
- [ ] `spanId` included when available
- [ ] `requestId` included for request-scoped logs
- [ ] `userId` included when authenticated (if applicable)
- [ ] `tenantId` included for multi-tenant services

### 3.4 Error Logging
- [ ] Errors include `error.name`
- [ ] Errors include `error.message`
- [ ] Errors include `error.stack` (non-production)
- [ ] Error severity correctly categorized

### 3.5 PII Handling
- [ ] Password fields are redacted
- [ ] Token fields are redacted
- [ ] API keys are redacted
- [ ] Session IDs are redacted
- [ ] Credit card numbers are redacted
- [ ] SSNs are redacted
- [ ] Custom sensitive fields added to redaction list

### 3.6 Log Levels
- [ ] Production minimum level is INFO
- [ ] DEBUG/TRACE not enabled in production
- [ ] Log levels configurable via environment variable

### 3.7 Audit Logging
- [ ] Authentication events logged
- [ ] Authorization failures logged
- [ ] Data mutations logged
- [ ] Admin actions logged
- [ ] Security events logged

---

## 4. Tracing

### 4.1 SDK Configuration
- [ ] OpenTelemetry SDK initialized
- [ ] Service name set correctly
- [ ] Service version set correctly
- [ ] OTLP endpoint configured
- [ ] Sample rate appropriate for traffic volume

### 4.2 Context Propagation
- [ ] W3C Trace Context extracted from incoming requests
- [ ] Trace context injected into outgoing requests
- [ ] Context propagated to async operations

### 4.3 Span Creation
- [ ] HTTP server spans created automatically
- [ ] Database operation spans created
- [ ] External service call spans created
- [ ] Queue operation spans created (if applicable)
- [ ] Significant business operations have spans

### 4.4 Span Attributes
- [ ] HTTP spans include method, URL, status_code
- [ ] Database spans include db.system, db.operation
- [ ] External call spans include peer.service
- [ ] Custom attributes follow naming conventions

### 4.5 Error Recording
- [ ] Exceptions recorded on spans
- [ ] Span status set to ERROR on failures
- [ ] Error messages included in span status

---

## 5. Health Checks

### 5.1 Required Endpoints
- [ ] `/health` returns liveness status
- [ ] `/health/live` returns liveness status
- [ ] `/health/ready` returns readiness status
- [ ] `/health/detailed` returns full health report

### 5.2 Response Format
- [ ] Status is `healthy`, `degraded`, or `unhealthy`
- [ ] Service name included
- [ ] Service version included
- [ ] Uptime included
- [ ] Timestamp included
- [ ] Individual check results included

### 5.3 Dependency Checks
- [ ] Database connectivity checked
- [ ] Cache connectivity checked (if used)
- [ ] Queue connectivity checked (if used)
- [ ] Critical external services checked
- [ ] Check timeouts configured (< 5s)

### 5.4 Kubernetes Integration
- [ ] Liveness probe configured in deployment
- [ ] Readiness probe configured in deployment
- [ ] Probe timeouts appropriate
- [ ] Probe intervals appropriate

---

## 6. SLOs

### 6.1 Definition
- [ ] Availability SLO defined
- [ ] Latency SLO defined (if applicable)
- [ ] SLO targets appropriate for service tier
- [ ] SLO window is 30 days

### 6.2 Recording Rules
- [ ] SLI recording rules deployed to Prometheus
- [ ] Rules cover all required time windows (5m, 30m, 1h, 6h, 1d, 3d)

### 6.3 Alert Rules
- [ ] Critical burn rate alert (14.4x) configured
- [ ] High burn rate alert (6x) configured
- [ ] Medium burn rate alert (1x) configured
- [ ] Error budget exhaustion alert configured

### 6.4 Alert Metadata
- [ ] Alerts have severity labels
- [ ] Alerts have runbook URLs
- [ ] Alerts have dashboard URLs
- [ ] Alert descriptions include current values

---

## 7. Dashboards

### 7.1 Golden Signals Dashboard
- [ ] Dashboard exists in Grafana
- [ ] Traffic panel shows request rate
- [ ] Errors panel shows error rate and types
- [ ] Latency panel shows P50, P95, P99
- [ ] Saturation panel shows resource utilization

### 7.2 SLO Dashboard
- [ ] Dashboard exists in Grafana
- [ ] Current SLI displayed
- [ ] Error budget remaining displayed
- [ ] Burn rate displayed
- [ ] Error budget timeline displayed

### 7.3 Dashboard Variables
- [ ] Service selectable
- [ ] Environment selectable
- [ ] Time range configurable

---

## 8. Alerting

### 8.1 Alert Configuration
- [ ] SLO alerts configured in Prometheus/AlertManager
- [ ] Infrastructure alerts configured
- [ ] Alerts routed to correct channels

### 8.2 Alert Routing
- [ ] Critical alerts route to PagerDuty
- [ ] Warning alerts route to Slack
- [ ] Team-specific routing configured

### 8.3 Runbooks
- [ ] Runbook exists for each alert
- [ ] Runbook includes diagnosis steps
- [ ] Runbook includes remediation steps
- [ ] Runbook accessible via alert annotation

---

## 9. Documentation

### 9.1 Service Documentation
- [ ] Service architecture documented
- [ ] Dependencies documented
- [ ] SLOs documented
- [ ] Runbooks documented

### 9.2 Observability Documentation
- [ ] Custom metrics documented
- [ ] Custom spans documented
- [ ] Dashboard locations documented

---

## Sign-off

### Service Owner
- **Name**: ________________
- **Date**: ________________
- **Signature**: ________________

### SRE/Platform Review
- **Name**: ________________
- **Date**: ________________
- **Signature**: ________________

---

## Compliance Score

| Category | Max Points | Scored |
|----------|-----------|--------|
| SDK Integration | 10 | |
| Metrics | 25 | |
| Logging | 20 | |
| Tracing | 15 | |
| Health Checks | 10 | |
| SLOs | 10 | |
| Dashboards | 5 | |
| Alerting | 5 | |
| **Total** | **100** | |

**Minimum passing score: 80 points**

---

## Notes

_Additional notes or exceptions:_

________________________________________________________________________________

________________________________________________________________________________

________________________________________________________________________________
