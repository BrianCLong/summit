# Summit Observability Audit & Enhancement Plan

**Date**: 2025-11-20
**Status**: In Progress
**Owner**: Engineering Team

## Executive Summary

This document captures the current state of observability in the Summit/IntelGraph platform and outlines a comprehensive enhancement plan to achieve production-grade monitoring, tracing, logging, and alerting.

## Current State Assessment

### ✅ What's Working Well

1. **Prometheus & Grafana Infrastructure**
   - Prometheus configured in docker-compose with basic scraping
   - Grafana 10.4.7 with provisioning support
   - Basic dashboards exist for system health and application metrics
   - Location: `observability/prometheus/`, `observability/grafana/`

2. **OpenTelemetry Foundation**
   - Basic OpenTelemetry SDK implemented in `server/src/monitoring/opentelemetry.ts`
   - Supports GraphQL, Neo4j, and BullMQ tracing
   - Jaeger exporter configured (though backend not deployed)
   - Prometheus metrics export on port 9464

3. **Alert Rules**
   - Basic SLO-based alerting exists (`observability/prometheus/alerts.yaml`)
   - API error budget burn alert configured
   - Multiple specialized rules: ML, Redis, search quality, finops, etc.
   - Location: `observability/prometheus/alerts/`, `observability/prometheus/*-rules.yaml`

4. **Operational Runbooks**
   - Comprehensive set of runbooks for incidents and operations
   - Location: `RUNBOOKS/INDEX.md`
   - Covers deployment, rollback, chaos testing, investigation playbooks

### ⚠️ Gaps & Areas for Improvement

1. **Distributed Tracing**
   - ❌ No tracing backend (Jaeger/Tempo) deployed in docker-compose
   - ❌ OpenTelemetry only implemented in main API server
   - ❌ Missing instrumentation in: gateway, web client, microservices
   - ❌ No trace context propagation across service boundaries
   - ❌ No exemplars linking metrics to traces

2. **Logging**
   - ❌ **Inconsistent logging libraries**: Mix of Winston and Pino across services
     - `server/src/utils/logger.ts`: Winston
     - `server/src/config/logger.ts`: Pino
     - Various services use different configurations
   - ❌ **No structured logging standard**: Inconsistent log formats
   - ❌ **No centralized log aggregation**: Missing Loki or ELK stack
   - ❌ **No correlation IDs**: Can't trace logs across services

3. **Dashboards**
   - ⚠️ Basic dashboards exist but lack:
     - Golden signals (latency, traffic, errors, saturation)
     - Service-level dashboards for each microservice
     - Database performance metrics (Neo4j, PostgreSQL, Redis)
     - Frontend performance metrics (Core Web Vitals, bundle size)
     - Error tracking and drill-downs

4. **Alerting & SLOs**
   - ⚠️ Minimal SLO definitions (only web service at 99.9%)
   - ❌ No SLO definitions for: API, gateway, databases, background jobs
   - ❌ No multi-window burn rate alerts (fast/slow burn)
   - ❌ No alert routing configuration (AlertManager)
   - ❌ Missing alerts for: disk space, memory pressure, database health

5. **Observability Runbooks**
   - ❌ No specific runbooks for observability incidents:
     - High latency troubleshooting
     - Error rate spike response
     - Trace investigation workflows
     - Log analysis procedures

## Enhancement Plan

### Phase 1: Distributed Tracing (Priority: High)

**Goal**: Full end-to-end tracing across all services

#### 1.1 Deploy Tracing Backend
- [ ] Add Jaeger or Tempo to `docker-compose.dev.yml`
- [ ] Configure OTLP receiver endpoints
- [ ] Set up trace storage (in-memory for dev, persistent for prod)
- [ ] Add Jaeger UI service

#### 1.2 Instrument All Services
- [ ] **API Server**: Enhance existing OpenTelemetry setup
- [ ] **Gateway**: Add OpenTelemetry SDK with HTTP/gRPC instrumentation
- [ ] **Web Client**: Add browser tracing (RUM)
- [ ] **Databases**: Neo4j, PostgreSQL query tracing
- [ ] **Background Jobs**: BullMQ worker tracing
- [ ] **External Calls**: HTTP client instrumentation

#### 1.3 Context Propagation
- [ ] Implement W3C Trace Context headers
- [ ] Add correlation IDs to all HTTP requests
- [ ] Propagate trace context in GraphQL federation
- [ ] Add baggage for user context (tenant, user ID)

#### 1.4 Sampling & Performance
- [ ] Configure head-based sampling (1.0 for dev, 0.1 for prod)
- [ ] Implement tail-based sampling for errors
- [ ] Optimize trace payload sizes

### Phase 2: Structured Logging (Priority: High)

**Goal**: Consistent, queryable, correlated logs across all services

#### 2.1 Standardize on Pino
- [ ] Create shared logging package: `packages/logger/`
- [ ] Migrate all services from Winston to Pino
- [ ] Define standard log schema with required fields:
  - `timestamp`, `level`, `service`, `traceId`, `spanId`, `userId`, `tenantId`, `message`, `error`

#### 2.2 Deploy Log Aggregation
- [ ] Add Loki to `docker-compose.dev.yml`
- [ ] Configure Promtail for log collection
- [ ] Set up Grafana Loki data source
- [ ] Create log retention policies

#### 2.3 Log Correlation
- [ ] Extract trace context from OpenTelemetry
- [ ] Inject `traceId` and `spanId` into all log entries
- [ ] Add user/tenant context to logs
- [ ] Implement request ID middleware

### Phase 3: Comprehensive Dashboards (Priority: Medium)

**Goal**: Real-time visibility into system health and performance

#### 3.1 Golden Signals Dashboards
- [ ] **Latency**: P50, P95, P99 for all endpoints
- [ ] **Traffic**: Request rate by service, endpoint, status code
- [ ] **Errors**: Error rate, error budget burn
- [ ] **Saturation**: CPU, memory, disk, connection pools

#### 3.2 Service-Specific Dashboards
- [ ] **API Server**: GraphQL operations, resolver performance
- [ ] **Gateway**: Routing latency, upstream health
- [ ] **Neo4j**: Cypher query performance, transaction rate, heap usage
- [ ] **PostgreSQL**: Connection pool, query duration, cache hit rate
- [ ] **Redis**: Memory usage, eviction rate, key expiration
- [ ] **BullMQ**: Job queue depth, processing rate, failures

#### 3.3 Frontend Performance
- [ ] Core Web Vitals (LCP, FID, CLS)
- [ ] Bundle size and load time
- [ ] API call latency from client perspective
- [ ] User journey funnels

#### 3.4 Business Metrics
- [ ] Investigations created/updated
- [ ] Entities and relationships added
- [ ] Copilot queries processed
- [ ] Active users and sessions

### Phase 4: Alerting & SLOs (Priority: Medium)

**Goal**: Proactive incident detection with actionable alerts

#### 4.1 Define SLOs
- [ ] **API**: 99.9% availability, P99 < 500ms
- [ ] **Gateway**: 99.95% availability, P99 < 100ms
- [ ] **Web**: 99.9% availability, P95 < 2s page load
- [ ] **Background Jobs**: 99% success rate, P99 < 5min
- [ ] **Databases**: 99.99% availability, P99 query < 1s

#### 4.2 Multi-Window Burn Rate Alerts
- [ ] Implement 2-hour / 1-hour fast burn (×14.4 burn rate)
- [ ] Implement 6-hour / 30-min medium burn (×6 burn rate)
- [ ] Implement 24-hour / 2-hour slow burn (×3 burn rate)
- [ ] Add 3-day / 6-hour early warning (×1 burn rate)

#### 4.3 Resource Alerts
- [ ] Disk space < 20% free
- [ ] Memory usage > 85%
- [ ] CPU sustained > 80% for 5min
- [ ] Database connection pool > 80% utilized

#### 4.4 Alert Routing
- [ ] Configure AlertManager with routing rules
- [ ] Set up Slack/PagerDuty integrations
- [ ] Define escalation policies
- [ ] Implement alert silencing and inhibition

### Phase 5: Observability Runbooks (Priority: Low)

**Goal**: Codify troubleshooting procedures for common observability scenarios

#### 5.1 Create Runbooks
- [ ] **High Latency Investigation**
  - Check trace spans, identify slow operations
  - Database query analysis
  - Network latency checks
- [ ] **Error Rate Spike Response**
  - Log aggregation queries
  - Error grouping and stack trace analysis
  - Rollback procedures
- [ ] **Trace Analysis Workflows**
  - Finding root cause spans
  - Identifying bottlenecks
  - Cross-service correlation
- [ ] **Metrics Investigation**
  - Dashboard drill-down patterns
  - PromQL query cookbook
  - Correlation with deployments

## Implementation Timeline

| Phase | Tasks | Duration | Priority |
|-------|-------|----------|----------|
| **Phase 1** | Distributed Tracing | 2 weeks | High |
| **Phase 2** | Structured Logging | 1 week | High |
| **Phase 3** | Dashboards | 1 week | Medium |
| **Phase 4** | Alerting & SLOs | 1 week | Medium |
| **Phase 5** | Runbooks | 3 days | Low |

**Total Estimated Time**: 5-6 weeks

## Success Metrics

1. **Tracing Coverage**: 100% of services instrumented
2. **Trace Sampling**: <5% overhead, >99% error trace capture
3. **Log Correlation**: 100% of logs have traceId/spanId
4. **Dashboard Adoption**: All on-call engineers use dashboards daily
5. **Alert Accuracy**: <5% false positive rate, 0 missed incidents
6. **MTTD**: Mean Time To Detect < 2 minutes
7. **MTTR**: Mean Time To Resolve < 15 minutes for P1

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Performance overhead from tracing | Medium | Medium | Use sampling, optimize span creation |
| Log volume explosion | High | Medium | Implement retention policies, sampling |
| Alert fatigue | Medium | High | Tune thresholds, use multi-window alerts |
| Integration complexity | Low | Low | Use standard OTLP protocol |

## Dependencies

- OpenTelemetry SDK/API packages
- Jaeger or Tempo for tracing
- Loki for log aggregation
- Grafana for visualization
- AlertManager for alert routing

## References

- Current setup: `observability/README.md`
- Prometheus config: `observability/prometheus/prometheus-dev.yml`
- OpenTelemetry code: `server/src/monitoring/opentelemetry.ts`
- Runbooks: `RUNBOOKS/INDEX.md`
- SLO definitions: `observability/slo/slo.yaml`

---

**Next Steps**:
1. Review and approve this enhancement plan
2. Prioritize phases based on business needs
3. Assign ownership for each phase
4. Begin Phase 1 implementation
