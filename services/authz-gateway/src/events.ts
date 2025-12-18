import { appendFileSync } from 'fs';
import crypto from 'crypto';

export interface ApiCallEvent {
  tenantId: string;
  clientId: string;
  subjectId?: string;
  apiMethod: string;
  statusCode: number;
  decision?: string;
  latencyMs: number;
  traceId?: string;
  error?: string;
}

const eventLogPath = process.env.API_EVENT_LOG || 'api-events.log';

export function createTraceId(): string {
  return crypto.randomUUID();
}

export function emitApiCallEvent(event: ApiCallEvent): string {
  const traceId = event.traceId || createTraceId();
  const record = {
    ...event,
    traceId,
    ts: new Date().toISOString(),
  };
  appendFileSync(eventLogPath, JSON.stringify(record) + '\n');
  return traceId;
}
