# Summit GA Hardening - Operations Evidence

**Epic**: GA-E6: Operations - Unified Logging & Operator Dashboards
**Date**: 2025-12-27
**Status**: Complete
**Owner**: Platform Operations Team

## Overview

This directory contains evidence and documentation for the unified logging, correlation ID implementation, and operator dashboard capabilities implemented as part of the Summit GA hardening initiative (Epic E6).

## Objectives

1. ✅ Implement unified logging standard with JSON structured logs
2. ✅ Implement correlation IDs for end-to-end request tracing
3. ✅ Create operator dashboards for self-service incident diagnosis
4. ✅ Develop runbooks for common incident types
5. ✅ Map implementations to SOC 2 controls

## Directory Structure

```
ops/
├── README.md                           # This file
├── logging/
│   └── UNIFIED-LOGGING-STANDARD.md    # Logging standard specification
├── correlation/
│   └── CORRELATION-ID-IMPLEMENTATION.md # Correlation ID guide
├── dashboards/
│   ├── operator-dashboard.json        # Grafana dashboard definition
│   └── README.md                      # Dashboard documentation
├── runbooks/
│   └── INCIDENT-DIAGNOSIS-RUNBOOK.md  # Self-service incident procedures
└── controls/
    └── SOC2-CONTROLS-MAPPING.md       # SOC 2 compliance mapping
```

## Deliverables

### 1. Unified Logging Standard

**Location**: `logging/UNIFIED-LOGGING-STANDARD.md`

**Description**: Comprehensive logging standard defining JSON structured log format with required fields: timestamp, level, service, correlationId, message, context.

**Key Features**:

- Pino-based structured logging
- Automatic PII redaction
- Log event bus for real-time alerting
- Configurable retention policies (30 days app logs, 365 days audit logs)
- Multiple log levels (trace, debug, info, warn, error, fatal)

**Implementation**:

- `/server/src/logging/structuredLogger.ts` - Main structured logger
- `/server/src/observability/logging/logger.ts` - Context-aware logger
- `/server/src/config/logger.js` - Base Pino configuration

### 2. Correlation ID Implementation

**Location**: `correlation/CORRELATION-ID-IMPLEMENTATION.md`

**Description**: End-to-end request tracing system using UUID v4 correlation IDs propagated through all services and logs.

**Key Features**:

- Automatic correlation ID generation (UUID v4)
- Express middleware for request attachment
- AsyncLocalStorage for context propagation
- OpenTelemetry integration
- Response header injection (`X-Correlation-ID`)
- Automatic log field injection

**Implementation**:

- `/server/src/middleware/correlation-id.ts` - Correlation middleware
- Integration with all loggers via AsyncLocalStorage
- Propagation to downstream services via HTTP headers

### 3. Operator Dashboards

**Location**: `dashboards/operator-dashboard.json`

**Description**: Grafana dashboard for self-service incident diagnosis with 10 panels covering request rates, errors, latency, AI metrics, and governance verdicts.

**Key Panels**:

1. Request Rate by Endpoint
2. Error Rate by Endpoint (5xx)
3. Request Latency (p50, p95, p99)
4. Request Flow by Correlation ID (Loki logs)
5. AI Copilot Request Rate
6. AI Copilot Latency (SLO tracking)
7. Governance Verdict Distribution
8. API Availability Gauge (99% SLO)
9. AI Copilot Success Rate Gauge (99% SLO)
10. Recent Errors and Warnings

**Template Variables**:

- `correlation_id` - Text input for correlation ID search
- `DS_PROMETHEUS` - Prometheus datasource
- `DS_LOKI` - Loki datasource

**Installation**: Import via Grafana UI or add to Helm chart at `/helm/monitoring/values.yaml`

### 4. Incident Diagnosis Runbook

**Location**: `runbooks/INCIDENT-DIAGNOSIS-RUNBOOK.md`

**Description**: Comprehensive self-service runbook for operators to diagnose and resolve common incidents using correlation IDs and structured logs.

**Coverage**:

1. API Errors (5xx status codes)
2. High Latency / Slow Requests
3. AI Copilot Errors or Timeouts
4. Governance Policy Violations
5. Authentication / Authorization Failures
6. Data Residency Violations

**Features**:

- Step-by-step diagnosis procedures
- Log query patterns (jq, grep, Loki, Prometheus)
- Resolution paths for each incident type
- Escalation criteria and contacts
- Post-incident tasks and best practices

### 5. SOC 2 Controls Mapping

**Location**: `controls/SOC2-CONTROLS-MAPPING.md`

**Description**: Detailed mapping of operational monitoring capabilities to SOC 2 Trust Services Criteria.

**Controls Mapped**:

- **CC7.2**: System Monitoring
  - Structured logging, log event bus, Grafana dashboards, Prometheus metrics, alert engine
- **CC7.3**: Incident Identification
  - Correlation ID system, automated alerting, error detection, pattern matching
- **CC7.4**: Incident Response
  - Self-service runbook, correlation tracing, escalation framework, post-incident process
- **A1.2**: Recovery Procedures
  - System state monitoring, recovery validation, audit trail, retention policies

**Evidence Summary**: 13 implementation components with complete evidence locations

## Implementation Status

| Component            | Status      | Evidence                                      | Tests                                                    |
| -------------------- | ----------- | --------------------------------------------- | -------------------------------------------------------- |
| Structured Logging   | ✅ Complete | `/server/src/logging/`                        | `/server/src/logging/__tests__/`                         |
| Correlation ID       | ✅ Complete | `/server/src/middleware/correlation-id.ts`    | `/server/src/middleware/__tests__/requestId.test.ts`     |
| Context-Aware Logger | ✅ Complete | `/server/src/observability/logging/logger.ts` | Covered by integration tests                             |
| Log Event Bus        | ✅ Complete | `/server/src/logging/logEventBus.ts`          | `/server/src/logging/__tests__/`                         |
| Log Alert Engine     | ✅ Complete | `/server/src/logging/logAlertEngine.ts`       | `/server/src/logging/__tests__/logAlertEngine.test.ts`   |
| Log Retention        | ✅ Complete | `/server/src/logging/logRetention.ts`         | `/server/src/logging/__tests__/logRetention.test.ts`     |
| Audit Log Pipeline   | ✅ Complete | `/server/src/logging/auditLogPipeline.ts`     | `/server/src/logging/__tests__/auditLogPipeline.test.ts` |
| Grafana Dashboard    | ✅ Complete | `dashboards/operator-dashboard.json`          | Manual validation                                        |
| Operator Runbook     | ✅ Complete | `runbooks/INCIDENT-DIAGNOSIS-RUNBOOK.md`      | Quarterly drills                                         |
| SOC 2 Mapping        | ✅ Complete | `controls/SOC2-CONTROLS-MAPPING.md`           | Audit review pending                                     |

## Existing Infrastructure Leveraged

The implementation builds on existing Summit capabilities:

1. **Pino Logger**: Already configured at `/server/src/config/logger.js`
2. **Correlation Middleware**: Existing at `/server/src/middleware/correlation-id.ts`
3. **OpenTelemetry**: Integration with distributed tracing
4. **Prometheus Monitoring**: Existing metrics collection at `/helm/monitoring/`
5. **Grafana**: Existing dashboard infrastructure
6. **Alert Rules**: Existing Prometheus alert rules in Helm charts

## Configuration

### Environment Variables

```bash
# Logging Configuration
LOG_LEVEL=info                    # Minimum log level
LOG_DIR=/logs                     # Base log directory
LOG_RETENTION_DAYS=30             # Application log retention
AUDIT_LOG_RETENTION_DAYS=365      # Audit log retention
LOG_COMPRESS_AFTER_DAYS=3         # Days before compression
LOG_TOTAL_SIZE_MB=2048            # Max total log size

# Service Identity
SERVICE_NAME=summit-api           # Service identifier in logs
NODE_ENV=production               # Environment

# Audit Chain (Optional)
AUDIT_CHAIN=true                  # Enable cryptographic audit ledger
AUDIT_LEDGER_FILE=/logs/audit/ledger.db
```

### Helm Configuration

To deploy the Grafana dashboard, add to `/helm/monitoring/values.yaml`:

```yaml
grafana:
  dashboards:
    intelgraph:
      summit-ops-diagnostics.json: |
        # Paste contents of operator-dashboard.json here
```

## Usage

### For Operators

1. **Incident Occurs**: User reports error or alert fires
2. **Get Correlation ID**: From error response header `X-Correlation-ID`
3. **Open Dashboard**: Navigate to "Summit Operations - Self-Service Diagnostics"
4. **Enter Correlation ID**: In template variable at top of dashboard
5. **Review Logs**: Check "Request Flow by Correlation ID" panel
6. **Follow Runbook**: Use `runbooks/INCIDENT-DIAGNOSIS-RUNBOOK.md`
7. **Escalate if Needed**: Follow escalation paths in runbook

### For Developers

1. **Use Context-Aware Logger**:

   ```javascript
   import { logger } from "./observability/logging/logger.js";
   logger.info("Operation completed", { operation: "getData" });
   ```

2. **Access Correlation ID in Handlers**:

   ```javascript
   app.get("/api/endpoint", (req, res) => {
     const correlationId = req.correlationId;
     logger.info({ correlationId }, "Processing request");
   });
   ```

3. **Propagate to Downstream Services**:
   ```javascript
   const response = await fetch(url, {
     headers: {
       "X-Correlation-ID": req.correlationId,
     },
   });
   ```

### For Auditors

1. Review SOC 2 controls mapping: `controls/SOC2-CONTROLS-MAPPING.md`
2. Access Grafana dashboards (read-only credentials provided)
3. Review sample correlation ID traces
4. Examine test results and coverage reports
5. Validate incident response procedures in runbook

## Testing

### Unit Tests

```bash
# Logging tests
npm test server/src/logging/__tests__/

# Correlation middleware tests
npm test server/src/middleware/__tests__/requestId.test.ts

# Log event formatter tests
npm test server/src/logging/__tests__/logEventFormatter.test.ts
```

### Integration Tests

```bash
# End-to-end correlation ID propagation
npm test server/src/__tests__/ai-copilot.e2e.test.ts

# Audit pipeline tests
npm test server/src/logging/__tests__/auditLogPipeline.test.ts
```

### Manual Validation

```bash
# Generate test request with correlation ID
curl -H "X-Correlation-ID: test-correlation-id" \
     http://localhost:3000/api/health

# Search logs for correlation ID
cat /logs/app-structured.log | \
  jq 'select(.correlationId == "test-correlation-id")'

# Check Grafana dashboard
# Enter "test-correlation-id" in dashboard template variable
```

## Metrics and SLOs

### Service Level Objectives

- **API Availability**: 99% (non-5xx ratio)
- **AI Copilot Success Rate**: 99% (non-error ratio)
- **AI Copilot Latency**: p95 < 5s, p99 < 8s
- **Incident Response Time**: MTTR < 30 minutes for L1 incidents

### Key Metrics

```promql
# API availability
sum(rate(http_requests_total{service="summit-api",status!~"5.."}[5m])) /
sum(rate(http_requests_total{service="summit-api"}[5m]))

# Error rate by endpoint
sum(rate(http_requests_total{service="summit-api",status=~"5.."}[5m])) by (path) /
sum(rate(http_requests_total{service="summit-api"}[5m])) by (path)

# Request latency percentiles
histogram_quantile(0.95,
  sum(rate(http_request_duration_seconds_bucket{service="summit-api"}[5m])) by (le, path)
)
```

## Compliance Checklist

- ✅ **CC7.2 - System Monitoring**: Comprehensive structured logging and dashboards
- ✅ **CC7.3 - Incident Identification**: Correlation ID system and automated alerting
- ✅ **CC7.4 - Incident Response**: Self-service runbook and escalation procedures
- ✅ **A1.2 - Recovery Procedures**: Recovery monitoring and audit trails

## Known Limitations

1. **Single-Region Correlation**: Correlation IDs currently tracked within single region; multi-region support planned Q3 2026
2. **Manual Runbook Execution**: Automated runbook execution planned Q2 2026
3. **Statistical Anomaly Detection**: ML-based anomaly detection enhancement planned Q1 2026

## Roadmap

- **Q1 2026**: ML-based anomaly detection for pattern recognition
- **Q2 2026**: Automated runbook execution for common L1 incidents
- **Q3 2026**: Multi-region correlation ID propagation
- **Q4 2026**: Advanced root cause analysis automation

## Support and Contact

- **Slack Channels**:
  - #platform-observability (general questions)
  - #platform-ops-oncall (incidents)
  - #engineering-support (feature requests)

- **PagerDuty**: Platform Ops rotation (on-call)

- **Documentation**:
  - Internal Wiki: [Observability Guide]
  - This Directory: `/audit/ga-evidence/ops/`

- **Email**:
  - platform-ops@intelgraph.example
  - compliance@intelgraph.example

## Maintenance

### Review Schedule

- **Monthly**: Runbook validation and drill
- **Quarterly**: SOC 2 controls review
- **Annually**: Comprehensive audit and update
- **As Needed**: Post-incident runbook updates

### Document Owners

- **Logging Standard**: Platform Ops Lead
- **Correlation ID**: Platform Ops Lead
- **Dashboards**: SRE Team Lead
- **Runbooks**: Operations Manager
- **SOC 2 Mapping**: Compliance Officer

## Related Documentation

- **Security Evidence**: `/audit/ga-evidence/security/`
- **Authorization Evidence**: `/audit/ga-evidence/authz/`
- **AI Copilot SLOs**: Recent commit `e95eedfd9`
- **Monitoring Helm Charts**: `/helm/monitoring/`
- **Prometheus Rules**: `/charts/monitoring/alerts/prometheus-rules.yaml`

## Change History

- **2025-12-27**: Initial implementation (GA-E6)
  - Unified logging standard documented
  - Correlation ID implementation documented
  - Operator dashboard created
  - Incident diagnosis runbook created
  - SOC 2 controls mapped

## Audit Trail

All changes to this evidence directory are tracked in Git:

```bash
# View evidence history
git log --oneline audit/ga-evidence/ops/

# View specific file changes
git log -p audit/ga-evidence/ops/logging/UNIFIED-LOGGING-STANDARD.md
```

---

**Last Updated**: 2025-12-27
**Next Review**: 2026-03-27 (Quarterly)
**Status**: ✅ Complete and operational
