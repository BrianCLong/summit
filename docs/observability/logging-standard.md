# Logging Standard

The Summit platform standardizes on **Pino** via the `@intelgraph/logging` adapter. All runtime services must emit JSON logs to stdout with the following canonical shape:

| Field | Description |
| --- | --- |
| `level` | Pino level (`trace`\|`debug`\|`info`\|`warn`\|`error`\|`fatal`). |
| `msg` | Human-readable message. |
| `time` | ISO-8601 timestamp (in UTC). |
| `service` | Service name (defaults to `summit` if unset). |
| `environment` | Deployment environment (development/staging/production). |
| `traceId` | OpenTelemetry trace identifier. |
| `spanId` | OpenTelemetry span identifier. |
| `correlationId`/`requestId` | Request correlation identifiers propagated via middleware. |
| `userId` | Authenticated user identifier (if available). |
| `tenantId` | Tenant/account identifier (if available). |
| `component` | Logical component emitting the event. |

## Logger requirements

1. **Transports**: emit newline-delimited JSON to stdout for log collectors. File targets are optional; stdout is mandatory.
2. **Context**: automatically enrich every log with the active OpenTelemetry span (`traceId`/`spanId`) and AsyncLocal context (`correlationId`, `userId`, `tenantId`).
3. **Redaction**: redact secrets and PII by default. Minimum keys: `req.headers.authorization`, `req.headers.cookie`, `password`, `token`, `secret`, `api_key`, `ssn`, `card.number`. Additional keys can be passed via `redactKeys`.
4. **Sampling**: noisy components must set `sampleRates` (per-level) to shed debug/trace volume without sacrificing errors. Defaults to `1` (no sampling).
5. **Structured shape only**: avoid string concatenation. Prefer `logger.info({ tenantId, caseId }, 'case loaded')`.
6. **Correlation**: use `requestContextMiddleware` from `@intelgraph/logging` to set correlation headers (`x-correlation-id`, `x-request-id`) and attach span identifiers to responses.

## How to use `@intelgraph/logging`

```ts
import { createLogger, requestContextMiddleware, bindLogContext } from '@intelgraph/logging';

const logger = createLogger({
  serviceName: 'intelgraph-api',
  environment: process.env.NODE_ENV,
  sampleRates: { debug: 0.25 },
});

app.use(requestContextMiddleware({
  logger,
  resolveUserId: (req) => (req as any).user?.sub,
  resolveTenantId: (req) => (req as any).user?.tenant_id,
}));

bindLogContext({ correlationId: 'abc-123', userId: 'user-1' }, () => {
  logger.info({ component: 'ingest' }, 'connector started');
});
```

## Anti-patterns

- `console.*` calls in production code (blocked by ESLint). Use the logger instead.
- Free-form strings without structured context objects.
- Logging sensitive payloads without redaction.
- Logging outside of an OpenTelemetry span or request context (trace links will be missing).

## Validation

- Unit and integration tests must assert that `traceId`/`spanId` are present for instrumented operations.
- CI should run `pnpm --filter @intelgraph/logging test` and `pnpm lint` to keep the lint guard active.
- Run `npx jscodeshift -t tools/codemods/replace-console-with-logger.js <paths> --loggerIdentifier=<logger>` to migrate legacy console usage.
