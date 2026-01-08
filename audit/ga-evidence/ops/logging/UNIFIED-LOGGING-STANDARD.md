# Unified Logging Standard

**Document ID:** GA-E6-LOG-001
**Version:** 1.0
**Date:** 2025-12-27
**Status:** Active
**Owner:** Platform Operations Team

## Overview

This document defines the unified logging standard for the Summit platform, establishing a consistent structured logging format across all services for observability, debugging, and compliance requirements.

## Logging Format

All logs MUST be emitted in **JSON structured format** using the Pino logger framework.

### Required Fields

Every log entry MUST include the following fields:

| Field           | Type               | Description                                                          | Example                                  |
| --------------- | ------------------ | -------------------------------------------------------------------- | ---------------------------------------- |
| `time`          | ISO 8601 timestamp | UTC timestamp of log event                                           | `2025-12-27T14:23:45.123Z`               |
| `level`         | number/string      | Log level (10=trace, 20=debug, 30=info, 40=warn, 50=error, 60=fatal) | `30` or `info`                           |
| `service`       | string             | Service name emitting the log                                        | `summit-api`                             |
| `correlationId` | UUID v4            | Request correlation ID for tracing                                   | `a1b2c3d4-e5f6-7890-abcd-ef1234567890`   |
| `message`       | string             | Human-readable log message                                           | `Request processed successfully`         |
| `context`       | object             | Additional contextual data                                           | `{"userId": "u123", "tenantId": "t456"}` |

### Optional Recommended Fields

| Field         | Type    | Description                                        |
| ------------- | ------- | -------------------------------------------------- |
| `traceId`     | string  | OpenTelemetry trace ID                             |
| `spanId`      | string  | OpenTelemetry span ID                              |
| `tenantId`    | string  | Tenant identifier for multi-tenant context         |
| `userId`      | string  | User identifier when available                     |
| `requestId`   | UUID v4 | Alternative name for correlationId (aliased)       |
| `hostname`    | string  | Host/pod name emitting the log                     |
| `environment` | string  | Deployment environment (production, staging, etc.) |
| `version`     | string  | Application version                                |
| `duration`    | number  | Operation duration in milliseconds                 |
| `statusCode`  | number  | HTTP status code for request logs                  |
| `method`      | string  | HTTP method for request logs                       |
| `path`        | string  | Request path                                       |
| `error`       | object  | Error details including stack trace                |

## Log Levels

Use appropriate log levels according to these guidelines:

- **trace (10)**: Very detailed information, typically for development only
- **debug (20)**: Diagnostic information useful for debugging
- **info (30)**: General informational messages about normal operations
- **warn (40)**: Warning messages for potentially harmful situations
- **error (50)**: Error events that might still allow the application to continue
- **fatal (60)**: Severe errors that cause the application to abort

## Implementation

### Base Logger Setup

The platform provides a pre-configured Pino logger at `/server/src/config/logger.js`:

```javascript
import { logger } from "./config/logger.js";

logger.info({ correlationId: req.correlationId, userId: req.user.id }, "User authenticated");
```

### Context-Aware Logger

For automatic correlation ID injection, use the context-aware logger:

```javascript
import { logger } from "./observability/logging/logger.js";

// Automatically includes correlationId and tenantId from AsyncLocalStorage
logger.info("Processing request", { operation: "getData" });
```

### Structured Logger with Event Bus

For advanced use cases with log event bus and alerting:

```javascript
import { appLogger } from "./logging/structuredLogger.js";

appLogger.info(
  {
    correlationId: req.correlationId,
    tenantId: req.tenantId,
    operation: "payment.processed",
    amount: 100.0,
  },
  "Payment processed successfully"
);
```

## PII and Sensitive Data Handling

### Automatic Redaction

The logger is configured to automatically redact sensitive fields:

- `req.headers.authorization`
- `req.headers.cookie`
- `password`
- `ssn`
- `card.number`

### Manual Redaction

For additional sensitive data, use the PII guard middleware or manually redact:

```javascript
logger.info(
  {
    email: redactEmail(user.email),
    phone: redactPhone(user.phone),
  },
  "User contact updated"
);
```

## Log Storage and Retention

### Storage Locations

- **Application logs**: `/logs/app-structured.log`
- **Error logs**: `/logs/app-error.log`
- **Audit logs**: `/logs/audit/`

### Retention Policies

- **Application logs**: 30 days (configurable via `LOG_RETENTION_DAYS`)
- **Audit logs**: 365 days (configurable via `AUDIT_LOG_RETENTION_DAYS`)
- **Compression**: Logs compressed after 3 days for app logs, 7 days for audit logs

### Total Size Limits

- **Application logs**: 2GB maximum (configurable via `LOG_TOTAL_SIZE_MB`)
- **Audit logs**: 4GB maximum (configurable via `AUDIT_LOG_TOTAL_SIZE_MB`)

## Log Aggregation and Monitoring

### Event Bus

All logs are published to the internal log event bus for:

- Real-time alerting via LogAlertEngine
- Metric aggregation
- Audit trail processing
- Third-party integrations (SIEM, etc.)

### Alert Rules

Critical log patterns trigger alerts:

- High error rates (>5% error ratio over 5 minutes)
- Repeated authentication failures
- Authorization policy violations
- Data residency violations

## Querying Logs

### By Correlation ID

```bash
# Local log files
grep "correlationId\":\"a1b2c3d4-e5f6-7890-abcd-ef1234567890" /logs/app-structured.log

# Using jq for structured queries
cat /logs/app-structured.log | jq 'select(.correlationId == "a1b2c3d4-e5f6-7890-abcd-ef1234567890")'
```

### By Tenant ID

```bash
cat /logs/app-structured.log | jq 'select(.tenantId == "t456")'
```

### Error Logs Only

```bash
cat /logs/app-structured.log | jq 'select(.level >= 50)'
```

## Compliance Mapping

This logging standard supports the following compliance requirements:

- **SOC 2 CC7.2**: System monitoring through comprehensive structured logging
- **SOC 2 CC7.3**: Incident identification via log event bus and alerting
- **SOC 2 CC7.4**: Incident response through correlation ID tracking
- **SOC 2 A1.2**: Recovery procedures via audit log retention
- **GDPR Article 30**: Records of processing activities via audit pipeline
- **HIPAA 164.312(b)**: Audit controls and monitoring

## Configuration Reference

### Environment Variables

| Variable                   | Default      | Description                       |
| -------------------------- | ------------ | --------------------------------- |
| `LOG_LEVEL`                | `info`       | Minimum log level to emit         |
| `LOG_DIR`                  | `./logs`     | Base directory for log files      |
| `LOG_RETENTION_DAYS`       | `30`         | Application log retention period  |
| `AUDIT_LOG_RETENTION_DAYS` | `365`        | Audit log retention period        |
| `LOG_COMPRESS_AFTER_DAYS`  | `3`          | Days before compression           |
| `LOG_TOTAL_SIZE_MB`        | `2048`       | Maximum total log size (MB)       |
| `SERVICE_NAME`             | `summit-api` | Service identifier in logs        |
| `AUDIT_CHAIN`              | `false`      | Enable cryptographic audit ledger |

## Migration Guide

### From Console.log

**Before:**

```javascript
console.log("User logged in:", userId);
```

**After:**

```javascript
logger.info({ userId, correlationId: req.correlationId }, "User logged in");
```

### From Winston

**Before:**

```javascript
winston.log("info", "Processing payment", { amount: 100 });
```

**After:**

```javascript
logger.info({ amount: 100, correlationId: req.correlationId }, "Processing payment");
```

## Examples

### Request Logging

```javascript
app.use((req, res, next) => {
  logger.info(
    {
      correlationId: req.correlationId,
      method: req.method,
      path: req.path,
      userAgent: req.headers["user-agent"],
    },
    "Incoming request"
  );
  next();
});
```

### Error Logging

```javascript
try {
  await processPayment(data);
} catch (error) {
  logger.error(
    {
      correlationId: req.correlationId,
      error: {
        message: error.message,
        stack: error.stack,
        code: error.code,
      },
    },
    "Payment processing failed"
  );
  throw error;
}
```

### Business Event Logging

```javascript
logger.info(
  {
    correlationId: req.correlationId,
    tenantId: req.user.tenantId,
    userId: req.user.id,
    eventType: "governance.verdict",
    verdict: "approved",
    policyId: "pol_123",
    resourceId: "res_456",
  },
  "Governance verdict applied"
);
```

## Support and Contact

- **Documentation**: [Internal Wiki - Observability Guide]
- **Slack Channel**: #platform-observability
- **On-call**: PagerDuty - Platform Ops rotation
- **Questions**: platform-ops@intelgraph.example

---

**Document History:**

- 2025-12-27: Initial version (v1.0) - GA hardening initiative
