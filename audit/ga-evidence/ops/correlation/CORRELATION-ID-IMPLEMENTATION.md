# Correlation ID Implementation

**Document ID:** GA-E6-CORR-001
**Version:** 1.0
**Date:** 2025-12-27
**Status:** Active
**Owner:** Platform Operations Team

## Overview

This document describes the implementation of correlation IDs in the Summit platform for end-to-end request tracing across all services, logs, and external integrations.

## Purpose

Correlation IDs enable:

- **End-to-end tracing** of requests through multiple services
- **Incident diagnosis** by correlating all logs for a single request
- **Performance analysis** across distributed systems
- **Customer support** by tracking specific user interactions
- **Compliance auditing** with traceable request flows

## Implementation Architecture

### Request Lifecycle

```
Client Request → Correlation ID Middleware → Services → Response
     ↓                    ↓                      ↓           ↓
  Generates ID      Attaches to req         Propagates   Returns in header
                    Stores in ALS           to all logs   X-Correlation-ID
                    Links to OTEL           & sub-calls
```

### Core Components

1. **Middleware**: `/server/src/middleware/correlation-id.ts`
2. **AsyncLocalStorage**: Context propagation via Node.js ALS
3. **Logger Integration**: Automatic injection into all log entries
4. **OpenTelemetry**: Integration with distributed tracing
5. **HTTP Headers**: Propagation and response injection

## Middleware Implementation

### Location

`/server/src/middleware/correlation-id.ts`

### Execution Order

The correlation ID middleware is the **FIRST** middleware in the Express chain (see `/server/src/app.ts` line 142):

```javascript
app.use(correlationIdMiddleware);
```

This ensures all subsequent middleware and route handlers have access to correlation context.

### ID Generation Strategy

```javascript
const correlationId =
  req.headers["x-correlation-id"] || // From upstream service
  req.headers["x-request-id"] || // Alternative header
  randomUUID(); // Generate new UUID v4
```

**Priority Order:**

1. Use existing `X-Correlation-ID` header (from API gateway, upstream service)
2. Use existing `X-Request-ID` header (compatibility)
3. Generate new UUID v4 using Node.js `crypto.randomUUID()`

### Request Attachment

```javascript
req.correlationId = correlationId; // Available in all handlers
req.traceId = activeSpan?.spanContext().traceId || "";
req.spanId = activeSpan?.spanContext().spanId || "";
```

### Response Headers

All responses include correlation headers for client-side tracing:

```javascript
res.setHeader("X-Correlation-ID", correlationId);
res.setHeader("X-Request-ID", correlationId); // Alias for compatibility
res.setHeader("X-Trace-ID", traceId); // OpenTelemetry trace ID
```

Clients can use these headers to:

- Reference specific requests in support tickets
- Track request flows through the system
- Correlate client-side errors with server-side logs

### AsyncLocalStorage Context

The middleware uses Node.js AsyncLocalStorage to propagate context through the entire request lifecycle:

```javascript
const store = new Map();
store.set("correlationId", correlationId);
store.set("requestId", correlationId);
store.set("traceId", traceId);
store.set("tenantId", tenantId);
store.set("principalId", userId);

correlationStorage.run(store, () => {
  next();
});
```

This enables **automatic context injection** without manual parameter passing:

```javascript
// Anywhere in the request chain:
import { logger } from "./observability/logging/logger.js";

// Automatically includes correlationId from ALS context
logger.info("Processing payment");
```

## OpenTelemetry Integration

### Trace Context Extraction

The middleware integrates with OpenTelemetry distributed tracing:

```javascript
const activeSpan = trace.getActiveSpan();
req.traceId = activeSpan?.spanContext().traceId || "";
req.spanId = activeSpan?.spanContext().spanId || "";
```

### W3C Traceparent Support

If no active span exists, the middleware honors the W3C Traceparent header:

```
traceparent: 00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01
             |  |                              |                  |
             ver trace-id                      parent-id          flags
```

```javascript
if (!req.traceId && req.headers["traceparent"]) {
  const [, inboundTraceId, inboundSpanId] = req.headers["traceparent"].split("-");
  req.traceId = inboundTraceId;
  req.spanId = inboundSpanId;
}
```

### Span Attributes

Correlation data is attached to OpenTelemetry spans:

```javascript
tracer.setAttribute("correlation.id", correlationId);
tracer.setAttribute("correlation.request_id", correlationId);
tracer.setAttribute("tenant.id", tenantId);
```

## Usage Patterns

### Express Route Handlers

```javascript
app.get("/api/users/:id", async (req, res) => {
  // Correlation ID automatically available
  logger.info({ correlationId: req.correlationId }, "Fetching user");

  const user = await getUserById(req.params.id);
  res.json(user);
});
```

### Service-to-Service Calls

When calling downstream services, propagate the correlation ID:

```javascript
async function callDownstreamService(data, req) {
  const response = await fetch("https://downstream-service/api/endpoint", {
    method: "POST",
    headers: {
      "X-Correlation-ID": req.correlationId,
      "X-Trace-ID": req.traceId,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  return response.json();
}
```

### Background Jobs and Workers

For async operations, capture and propagate correlation context:

```javascript
async function queueJob(jobData, req) {
  await queue.add({
    ...jobData,
    correlationId: req.correlationId,
    tenantId: req.user?.tenant_id,
    timestamp: new Date().toISOString(),
  });
}

// In worker
async function processJob(job) {
  const { correlationId, tenantId } = job.data;

  logger.info(
    {
      correlationId,
      tenantId,
      jobId: job.id,
    },
    "Processing queued job"
  );

  // Process job...
}
```

### GraphQL Operations

GraphQL context automatically includes correlation data:

```javascript
// In /server/src/lib/auth.js getContext()
export async function getContext({ req }) {
  return {
    correlationId: req.correlationId,
    traceId: req.traceId,
    tenantId: req.user?.tenant_id,
    user: req.user,
    // ... other context
  };
}

// In resolvers
const resolvers = {
  Query: {
    user: async (parent, args, context) => {
      logger.info(
        {
          correlationId: context.correlationId,
          userId: args.id,
        },
        "GraphQL: Fetching user"
      );

      return getUserById(args.id);
    },
  },
};
```

## Header Reference

### Request Headers (Honored)

| Header             | Description                   | Example                                                   |
| ------------------ | ----------------------------- | --------------------------------------------------------- |
| `X-Correlation-ID` | Primary correlation ID header | `a1b2c3d4-e5f6-7890-abcd-ef1234567890`                    |
| `X-Request-ID`     | Alternative correlation ID    | `a1b2c3d4-e5f6-7890-abcd-ef1234567890`                    |
| `traceparent`      | W3C trace context             | `00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01` |
| `X-Tenant-ID`      | Tenant context (optional)     | `tenant_abc123`                                           |

### Response Headers (Always Returned)

| Header             | Description              | Example                                |
| ------------------ | ------------------------ | -------------------------------------- |
| `X-Correlation-ID` | Request correlation ID   | `a1b2c3d4-e5f6-7890-abcd-ef1234567890` |
| `X-Request-ID`     | Alias for correlation ID | `a1b2c3d4-e5f6-7890-abcd-ef1234567890` |
| `X-Trace-ID`       | OpenTelemetry trace ID   | `4bf92f3577b34da6a3ce929d0e0e4736`     |

## Correlation Context Helpers

### Get Correlation Context

```javascript
import { getCorrelationContext } from "./middleware/correlation-id.js";

const context = getCorrelationContext(req);
// {
//   correlationId: '...',
//   traceId: '...',
//   spanId: '...',
//   userId: '...',
//   tenantId: '...'
// }
```

### Get User Context

```javascript
import { getUserContext } from "./middleware/correlation-id.js";

const userCtx = getUserContext(req);
// {
//   userId: '...',
//   userEmail: '...',
//   tenantId: '...',
//   role: '...'
// }
```

## Logging Integration

### Automatic Injection

The context-aware logger automatically includes correlation ID:

```javascript
import { logger } from "./observability/logging/logger.js";

// Inside request handler
logger.info("User authenticated");
// Output: {"time":"...","level":30,"correlationId":"a1b2...","message":"User authenticated"}
```

### Manual Inclusion

For the base Pino logger, include correlation ID explicitly:

```javascript
import { appLogger } from "./logging/structuredLogger.js";

appLogger.info(
  {
    correlationId: req.correlationId,
    userId: req.user.id,
  },
  "Payment processed"
);
```

### Pino HTTP Logger

The `pino-http` middleware automatically includes correlation data:

```javascript
app.use(
  pinoHttp({
    logger: appLogger,
    customProps: (req) => ({
      correlationId: req.correlationId,
      traceId: req.traceId,
      spanId: req.spanId,
      userId: req.user?.sub || req.user?.id,
      tenantId: req.user?.tenant_id,
    }),
  })
);
```

## Querying by Correlation ID

### Log Files

```bash
# Direct grep
grep "correlationId\":\"a1b2c3d4-e5f6-7890-abcd-ef1234567890" /logs/app-structured.log

# Using jq for structured output
cat /logs/app-structured.log | \
  jq 'select(.correlationId == "a1b2c3d4-e5f6-7890-abcd-ef1234567890")' | \
  jq -s 'sort_by(.time)'
```

### Grafana Loki

```logql
{service="summit-api"}
  | json
  | correlationId="a1b2c3d4-e5f6-7890-abcd-ef1234567890"
```

### Elasticsearch

```json
{
  "query": {
    "term": {
      "correlationId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
    }
  },
  "sort": [{ "time": "asc" }]
}
```

## Monitoring and Metrics

### Request Flow Visualization

Correlation IDs enable Grafana dashboards to:

- Trace request paths through services
- Identify bottlenecks and latency contributors
- Correlate errors across service boundaries
- Visualize distributed transaction flows

### Performance Analysis

```promql
# Request duration histogram by correlation ID
histogram_quantile(0.95,
  sum(rate(http_request_duration_seconds_bucket[5m])) by (le, correlationId)
)
```

## Best Practices

### DO

✅ Always propagate correlation ID to downstream services
✅ Include correlation ID in all log entries
✅ Return correlation ID in error responses for customer support
✅ Use correlation ID in metrics and traces
✅ Store correlation ID with background jobs and async tasks
✅ Include correlation ID in audit events

### DON'T

❌ Don't generate multiple correlation IDs for a single request
❌ Don't omit correlation ID from error logs
❌ Don't use non-UUID formats (breaks parsing tools)
❌ Don't forget to propagate to message queues and workers
❌ Don't expose correlation IDs containing sensitive data

## Testing

### Unit Tests

See `/server/src/middleware/__tests__/requestId.test.ts` for comprehensive test coverage.

### Manual Testing

```bash
# Test correlation ID generation
curl -H "X-Correlation-ID: test-123" http://localhost:3000/api/health
# Response should include: X-Correlation-ID: test-123

# Test automatic generation
curl -v http://localhost:3000/api/health
# Response should include: X-Correlation-ID: <generated-uuid>
```

### Integration Testing

```javascript
it("should propagate correlation ID through request chain", async () => {
  const correlationId = "test-correlation-id";

  const response = await request(app).get("/api/users/123").set("X-Correlation-ID", correlationId);

  expect(response.headers["x-correlation-id"]).toBe(correlationId);

  // Verify in logs
  const logs = await readLogs();
  const requestLogs = logs.filter((l) => l.correlationId === correlationId);
  expect(requestLogs.length).toBeGreaterThan(0);
});
```

## Compliance and SOC 2 Mapping

This implementation supports:

- **SOC 2 CC7.2** (System Monitoring): Correlation IDs enable comprehensive request tracking
- **SOC 2 CC7.3** (Incident Identification): Correlation enables rapid incident detection
- **SOC 2 CC7.4** (Incident Response): End-to-end tracing supports incident investigation
- **SOC 2 A1.2** (Recovery Procedures): Request reconstruction via correlation ID lookup

## Troubleshooting

### Correlation ID Not Appearing in Logs

**Cause**: Using logger without context or before middleware execution
**Solution**: Ensure correlation middleware runs first; use context-aware logger

### Different Correlation IDs for Same Request

**Cause**: Multiple ID generation points or missing propagation
**Solution**: Verify middleware order; check downstream service call headers

### Correlation ID Lost in Background Jobs

**Cause**: Context not captured before queuing
**Solution**: Include correlation ID in job payload; restore context in worker

## Future Enhancements

- [ ] Correlation ID in WebSocket connections
- [ ] Correlation ID in Server-Sent Events (SSE)
- [ ] Correlation ID in Kafka message headers
- [ ] Correlation ID dashboard in admin UI
- [ ] Automated correlation chain visualization

## Support and Contact

- **Implementation**: `/server/src/middleware/correlation-id.ts`
- **Tests**: `/server/src/middleware/__tests__/requestId.test.ts`
- **Documentation**: This file
- **Slack Channel**: #platform-observability
- **On-call**: PagerDuty - Platform Ops rotation

---

**Document History:**

- 2025-12-27: Initial version (v1.0) - GA hardening initiative
