import { appendFileSync } from 'fs';
import pino from 'pino';
import { trace } from '@opentelemetry/api';
import {
  buildLogContext,
  recordIngestEvent,
  serviceDimensions,
} from './observability';

export interface AuditEntry {
  subject: string;
  action: string;
  resource: string;
  tenantId: string;
  allowed: boolean;
  reason: string;
}

const auditLogger = pino({
  level: process.env.AUDIT_LOG_LEVEL || process.env.LOG_LEVEL || 'info',
  base: { ...serviceDimensions, component: 'audit' },
  mixin() {
    const span = trace.getActiveSpan();
    if (!span) return {};
    const spanContext = span.spanContext();
    return {
      trace_id: spanContext.traceId,
      span_id: spanContext.spanId,
    };
  },
});

export function log(entry: AuditEntry) {
  const span = trace.getActiveSpan();
  const spanContext = span?.spanContext();
  const decision = entry.allowed ? 'allow' : 'deny';
  const record = {
    ...entry,
    decision,
    traceId: spanContext?.traceId ?? null,
    spanId: spanContext?.spanId ?? null,
    ts: new Date().toISOString(),
  };
  appendFileSync('audit.log', JSON.stringify(record) + '\n');
  recordIngestEvent(entry.tenantId, decision);
  auditLogger.info(
    {
      ...buildLogContext(entry.tenantId),
      decision,
      reason: entry.reason,
      subject: entry.subject,
      action: entry.action,
      resource: entry.resource,
      trace_id: spanContext?.traceId,
      span_id: spanContext?.spanId,
    },
    'ABAC decision recorded',
  );
}
