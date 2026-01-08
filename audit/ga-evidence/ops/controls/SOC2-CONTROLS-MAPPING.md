# SOC 2 Controls Mapping - Operations & Monitoring

**Document ID:** GA-E6-SOC2-001
**Version:** 1.0
**Date:** 2025-12-27
**Status:** Active
**Owner:** Platform Operations Team
**Auditor Review**: Pending

## Overview

This document maps the Summit platform's unified logging, correlation ID implementation, and operator dashboard capabilities to SOC 2 Trust Services Criteria (TSC), demonstrating compliance with operational monitoring and incident response requirements.

## Executive Summary

The Summit platform implements comprehensive operational monitoring through:

- **Unified structured logging** with JSON format and required fields
- **Correlation ID system** for end-to-end request tracing
- **Grafana dashboards** for real-time system monitoring
- **Self-service runbooks** for incident diagnosis and response

These capabilities directly support SOC 2 compliance for system monitoring (CC7.2), incident identification (CC7.3), incident response (CC7.4), and recovery procedures (A1.2).

## Control Mapping

### CC7.2 - System Monitoring

**Trust Services Criteria**: _The entity monitors system components and the operation of those components for anomalies that are indicative of malicious acts, natural disasters, and errors affecting the entity's ability to meet its objectives; anomalies are analyzed to determine whether they represent security events._

#### Implementation Evidence

1. **Structured Logging System** (`/server/src/logging/structuredLogger.ts`)
   - **Description**: Pino-based structured logger with JSON output
   - **Coverage**: All API requests, errors, and system events logged
   - **Fields**: timestamp, level, service, correlationId, message, context
   - **Evidence Location**: `/audit/ga-evidence/ops/logging/UNIFIED-LOGGING-STANDARD.md`

2. **Log Event Bus** (`/server/src/logging/logEventBus.ts`)
   - **Description**: Real-time log event streaming for monitoring
   - **Coverage**: All log entries published to event bus
   - **Integration**: Feeds into alert engine and SIEM

3. **Grafana Dashboards** (`/audit/ga-evidence/ops/dashboards/operator-dashboard.json`)
   - **Panels**:
     - Request Rate by Endpoint (anomaly detection)
     - Error Rate by Endpoint (failure monitoring)
     - Request Latency (performance monitoring)
     - Recent Errors and Warnings (real-time alerting)
   - **Coverage**: Continuous monitoring of all API endpoints
   - **Refresh**: 30-second auto-refresh for near real-time visibility

4. **Prometheus Metrics Collection**
   - **Metrics**:
     - `http_requests_total` - Request volume tracking
     - `http_request_duration_seconds` - Latency monitoring
     - `ai_copilot_requests_total` - AI operation monitoring
     - `governance_verdict_total` - Policy enforcement tracking
   - **Scrape Interval**: 30 seconds
   - **Retention**: 30 days

5. **Log Alert Engine** (`/server/src/logging/logAlertEngine.ts`)
   - **Alert Rules**:
     - High error rate (>5% over 5 minutes)
     - Repeated authentication failures
     - Authorization policy violations
     - Data residency violations
   - **Notification**: Slack, PagerDuty, email

#### Control Effectiveness

- ✅ **Continuous Monitoring**: 24/7 automated monitoring via Prometheus and Grafana
- ✅ **Real-Time Alerting**: Sub-minute alert generation via log event bus
- ✅ **Anomaly Detection**: Statistical thresholds for error rates and latency
- ✅ **Historical Analysis**: 30-day metric retention for trend analysis
- ✅ **Coverage**: All system components instrumented with structured logging

#### Testing Evidence

- Unit tests: `/server/src/logging/__tests__/logAlertEngine.test.ts`
- Integration tests: Alert rule validation
- Operational validation: Daily alert digest review

---

### CC7.3 - Incident Identification

**Trust Services Criteria**: _The entity identifies, develops, and implements activities to detect security events._

#### Implementation Evidence

1. **Correlation ID System** (`/server/src/middleware/correlation-id.ts`)
   - **Description**: UUID-based request tracking across all services
   - **Generation**: Automatic UUID v4 generation for each request
   - **Propagation**: Via Express middleware and AsyncLocalStorage
   - **Response Header**: `X-Correlation-ID` returned to clients
   - **Evidence Location**: `/audit/ga-evidence/ops/correlation/CORRELATION-ID-IMPLEMENTATION.md`

2. **Structured Log Format**
   - **Required Fields**: correlationId, timestamp, level, service, message
   - **Optional Context**: tenantId, userId, traceId, spanId, error details
   - **Format**: JSON (machine-parseable)
   - **Indexing**: All fields indexed for rapid search

3. **Error Detection Mechanisms**
   - **HTTP Status Codes**: 4xx/5xx automatically flagged
   - **Exception Handling**: Global error handler logs all exceptions
   - **Log Levels**: Error (50) and Fatal (60) levels trigger alerts
   - **Pattern Matching**: Regex-based anomaly detection in logs

4. **Incident Identification Dashboards**
   - **Error Rate Panel**: Real-time 5xx error tracking by endpoint
   - **Recent Errors Panel**: Loki log panel showing errors/warnings
   - **AI Copilot Success Rate**: SLO-based failure detection
   - **Governance Verdict Distribution**: Anomalous deny pattern detection

5. **Automated Alert Rules** (`/helm/monitoring/values.yaml`)
   - **HighErrorRate**: Triggers when error ratio > 5% for 10 minutes
   - **AICopilotSLOViolation**: Triggers when AI latency exceeds SLO
   - **PolicyBundleStale**: Triggers when policies not refreshed
   - **ServiceDown**: Triggers when service health check fails

#### Control Effectiveness

- ✅ **Rapid Detection**: Incidents identified within 5 minutes via alerting
- ✅ **Correlation**: All related logs linkable via correlation ID
- ✅ **Automated Alerting**: No manual monitoring required
- ✅ **Multi-Channel Notification**: Slack, PagerDuty, email
- ✅ **Pattern Recognition**: Statistical and rule-based detection

#### Testing Evidence

- Unit tests: `/server/src/middleware/__tests__/requestId.test.ts`
- Integration tests: Alert rule validation
- Chaos engineering: Simulated incidents trigger alerts correctly

---

### CC7.4 - Incident Response

**Trust Services Criteria**: _The entity responds to identified security events by executing a defined incident response program._

#### Implementation Evidence

1. **Self-Service Incident Diagnosis Runbook**
   - **Location**: `/audit/ga-evidence/ops/runbooks/INCIDENT-DIAGNOSIS-RUNBOOK.md`
   - **Coverage**: 6 common incident types with step-by-step procedures
   - **Tools**: Correlation ID lookup, log queries, dashboard analysis
   - **Escalation Paths**: Defined L1, L2, L3, L4 escalation criteria

2. **Correlation ID Tracing**
   - **End-to-End Visibility**: Single correlation ID traces full request flow
   - **Log Aggregation**: All logs for a request retrievable in seconds
   - **Cross-Service**: Correlation ID propagated to downstream services
   - **Client Visibility**: Correlation ID returned in response headers

3. **Grafana Log Search Panel**
   - **Template Variable**: `correlation_id` text input
   - **Loki Query**: Automatic filtering by correlation ID
   - **Timeline View**: Chronological log sequence visualization
   - **Error Highlighting**: Errors/warnings visually distinguished

4. **Incident Response Procedures** (from runbook)
   - **API Errors**: 6-step diagnosis with log queries and resolution paths
   - **High Latency**: Performance analysis and bottleneck identification
   - **AI Copilot Issues**: AI-specific troubleshooting procedures
   - **Governance Failures**: Policy evaluation analysis
   - **Auth Failures**: Token and permission verification
   - **Data Residency**: Residency enforcement diagnosis

5. **Escalation Framework**
   - **Level 1 (Self-Service)**: Operators use runbook (0-30 minutes)
   - **Level 2 (Platform Ops)**: On-call team via PagerDuty (30-60 minutes)
   - **Level 3 (Engineering)**: Development team via Jira (1-4 hours)
   - **Level 4 (Security)**: Security team for suspected breaches (immediate)

6. **Post-Incident Process**
   - **Documentation**: Incident report template with correlation IDs
   - **Root Cause Analysis**: Log analysis and timeline reconstruction
   - **Runbook Updates**: Continuous improvement of procedures
   - **Alerting Improvements**: New alerts added based on incidents

#### Control Effectiveness

- ✅ **Defined Procedures**: Documented runbooks for common incidents
- ✅ **Rapid Diagnosis**: Correlation ID enables <5 minute log retrieval
- ✅ **Self-Service**: Operators resolve L1 incidents without escalation
- ✅ **Clear Escalation**: Time-based escalation criteria defined
- ✅ **Continuous Improvement**: Post-incident reviews update runbooks

#### Testing Evidence

- Tabletop exercises: Quarterly incident response drills
- Runbook validation: Monthly runbook walkthroughs
- Escalation testing: Annual escalation path testing
- Metrics: Incident response time tracking (MTTR)

---

### A1.2 - Recovery Procedures

**Trust Services Criteria**: _The entity implements activities to recover from identified availability incidents._

#### Implementation Evidence

1. **System State Monitoring**
   - **Availability Gauge**: Real-time API availability percentage
   - **AI Success Rate Gauge**: AI Copilot reliability tracking
   - **SLO Tracking**: Visual SLO compliance indicators
   - **Historical Data**: 30-day retention for trend analysis

2. **Recovery Validation Tools**
   - **Health Endpoints**: `/health` endpoint for service status
   - **Metrics Endpoint**: `/metrics` for Prometheus scraping
   - **Dashboard Panels**: Visual confirmation of service recovery
   - **Alert Resolution**: Automatic alert clearing on recovery

3. **Audit Trail for Recovery**
   - **Correlation ID**: Links incident to recovery actions
   - **Audit Logs**: 365-day retention of all operational events
   - **Log Retention**: 30-day application logs, 365-day audit logs
   - **Compressed Archives**: Older logs compressed for long-term storage

4. **Recovery Procedures** (from runbook)
   - **Database Issues**: DBA escalation with correlation ID
   - **Service Dependencies**: Health dashboard checks and restarts
   - **Load Issues**: Horizontal scaling procedures
   - **Configuration Issues**: Config rollback procedures

5. **Backup and Retention**
   - **Log Backup**: Daily backup of log files
   - **Compression**: Automated log compression after 3/7 days
   - **Retention Policy**: Configurable retention periods
   - **Total Size Limits**: Automatic rotation to prevent disk exhaustion

6. **Recovery Metrics**
   - **MTTR (Mean Time To Recovery)**: Tracked via correlation ID timestamps
   - **Availability**: 99% SLO tracked in dashboard
   - **Error Rate**: Post-recovery validation via metrics
   - **Performance**: Latency normalization post-incident

#### Control Effectiveness

- ✅ **Monitoring During Recovery**: Real-time dashboard visibility
- ✅ **Validation**: Metrics confirm successful recovery
- ✅ **Audit Trail**: Complete incident-to-recovery timeline
- ✅ **Historical Analysis**: Long-term retention enables RCA
- ✅ **SLO Tracking**: Objective recovery success criteria

#### Testing Evidence

- Disaster recovery drills: Quarterly DR exercises
- Backup validation: Monthly log backup restoration tests
- Retention testing: Automated tests for log rotation
- Recovery metrics: MTTR tracked for all P0/P1 incidents

---

## Evidence Summary Table

| Control | Implementation        | Evidence Location                                | Status      |
| ------- | --------------------- | ------------------------------------------------ | ----------- |
| CC7.2   | Structured Logging    | `/audit/ga-evidence/ops/logging/`                | ✅ Complete |
| CC7.2   | Grafana Dashboards    | `/audit/ga-evidence/ops/dashboards/`             | ✅ Complete |
| CC7.2   | Prometheus Metrics    | `/helm/monitoring/values.yaml`                   | ✅ Complete |
| CC7.2   | Log Alert Engine      | `/server/src/logging/logAlertEngine.ts`          | ✅ Complete |
| CC7.3   | Correlation ID System | `/audit/ga-evidence/ops/correlation/`            | ✅ Complete |
| CC7.3   | Error Detection       | `/server/src/middleware/global-error-handler.ts` | ✅ Complete |
| CC7.3   | Automated Alerts      | `/helm/monitoring/values.yaml`                   | ✅ Complete |
| CC7.4   | Incident Runbook      | `/audit/ga-evidence/ops/runbooks/`               | ✅ Complete |
| CC7.4   | Correlation Tracing   | `/server/src/middleware/correlation-id.ts`       | ✅ Complete |
| CC7.4   | Escalation Procedures | `/audit/ga-evidence/ops/runbooks/`               | ✅ Complete |
| A1.2    | Recovery Monitoring   | `/audit/ga-evidence/ops/dashboards/`             | ✅ Complete |
| A1.2    | Audit Trail           | `/server/src/logging/auditLogPipeline.ts`        | ✅ Complete |
| A1.2    | Log Retention         | `/server/src/logging/logRetention.ts`            | ✅ Complete |

## Audit Trail

All operational monitoring activities generate audit trails:

1. **Log Events**: Every system event logged with correlation ID
2. **Metric Collection**: Prometheus scrapes tracked and versioned
3. **Alert History**: All alerts stored in Alertmanager
4. **Dashboard Access**: Grafana access logs retained
5. **Incident Records**: Correlation IDs link to incident tickets
6. **Runbook Execution**: Operators document actions with correlation IDs

## Continuous Monitoring

The controls are continuously validated through:

- **Automated Testing**: Unit and integration tests in CI/CD
- **Daily Metrics**: Alert digest reviewed daily
- **Weekly Dashboard Review**: Operations team reviews trends
- **Monthly Runbook Drills**: Team practices incident procedures
- **Quarterly Audits**: Internal compliance team reviews evidence

## Remediation Tracking

Any control deficiencies are tracked via:

- **Jira Tickets**: Tagged with `soc2-remediation`
- **Risk Register**: Logged in central risk management system
- **Escalation**: Critical deficiencies escalated to CISO
- **Timeline**: Remediation SLA based on risk severity

## Document Maintenance

This mapping is reviewed and updated:

- **Quarterly**: Regular compliance review cycle
- **After Incidents**: Post-incident reviews may identify gaps
- **Code Changes**: Significant architecture changes trigger review
- **Audit Feedback**: External auditor findings incorporated

## Related Documentation

- **Unified Logging Standard**: `/audit/ga-evidence/ops/logging/UNIFIED-LOGGING-STANDARD.md`
- **Correlation ID Implementation**: `/audit/ga-evidence/ops/correlation/CORRELATION-ID-IMPLEMENTATION.md`
- **Dashboard Definitions**: `/audit/ga-evidence/ops/dashboards/operator-dashboard.json`
- **Incident Diagnosis Runbook**: `/audit/ga-evidence/ops/runbooks/INCIDENT-DIAGNOSIS-RUNBOOK.md`
- **Security Controls**: `/audit/ga-evidence/security/`
- **Access Controls**: `/audit/ga-evidence/authz/`

## Auditor Access

Auditors are provided:

1. **Read-Only Grafana Access**: View all dashboards and metrics
2. **Log Export Scripts**: Sample correlation ID traces
3. **Runbook Walkthrough**: Guided demonstration of incident response
4. **Test Results**: Automated test output and coverage reports
5. **Incident Samples**: De-identified incident reports with correlation IDs

## Compliance Attestation

**Control Owner**: Platform Operations Team
**Reviewer**: CISO Office
**Status**: Controls operating effectively as of 2025-12-27
**Next Review**: 2026-03-27 (Quarterly)

**Signed**:

- Platform Ops Lead: ********\_\_\_******** Date: ****\_\_\_****
- CISO: ********\_\_\_******** Date: ****\_\_\_****
- Compliance Officer: ********\_\_\_******** Date: ****\_\_\_****

---

## Appendix A: Control Testing Procedures

### CC7.2 Testing

**Objective**: Validate system monitoring capabilities

**Procedure**:

1. Generate test API traffic with known error patterns
2. Verify errors appear in Grafana dashboard within 5 minutes
3. Confirm Prometheus metrics reflect error rate
4. Validate alert rules trigger correctly
5. Check log aggregation in Loki

**Expected Result**: All errors detected and alerted within SLA

**Frequency**: Monthly

---

### CC7.3 Testing

**Objective**: Validate incident identification

**Procedure**:

1. Inject simulated incidents (500 errors, timeouts, etc.)
2. Verify correlation IDs generated for all requests
3. Confirm alerts triggered for incident patterns
4. Validate log aggregation by correlation ID
5. Test multi-channel alerting (Slack, PagerDuty)

**Expected Result**: Incidents identified and alerted automatically

**Frequency**: Monthly

---

### CC7.4 Testing

**Objective**: Validate incident response procedures

**Procedure**:

1. Conduct tabletop exercise using runbook
2. Select random correlation ID from recent errors
3. Follow runbook to diagnose root cause
4. Document time to diagnosis
5. Test escalation path notification

**Expected Result**: Incident diagnosed within 30 minutes using runbook

**Frequency**: Quarterly

---

### A1.2 Testing

**Objective**: Validate recovery procedures

**Procedure**:

1. Simulate service outage (controlled)
2. Follow recovery procedures from runbook
3. Monitor recovery via dashboards
4. Validate metrics return to baseline
5. Verify audit trail completeness

**Expected Result**: Recovery completed and validated via monitoring

**Frequency**: Quarterly

---

## Appendix B: Compliance Gaps and Roadmap

### Current Gaps

1. **Automated Runbook Execution**: Currently manual; automation planned for Q2 2026
2. **ML-Based Anomaly Detection**: Statistical rules only; ML enhancement planned
3. **Cross-Region Correlation**: Single-region correlation ID tracking; multi-region planned

### Roadmap

- **Q1 2026**: Implement ML-based anomaly detection
- **Q2 2026**: Automated runbook execution for common incidents
- **Q3 2026**: Multi-region correlation ID propagation
- **Q4 2026**: Advanced root cause analysis automation

---

**Document History:**

- 2025-12-27: Initial version (v1.0) - GA hardening initiative

**Next Review**: 2026-03-27
