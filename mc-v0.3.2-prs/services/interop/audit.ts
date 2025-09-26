// services/interop/audit.ts
// MC v0.3.2 - Audit logging for interop operations

import { logger } from '../config/logger';
import { generateId } from '../utils/id-generator';

export interface AuditEvent {
  eventId: string;
  timestamp: string;
  eventType: string;
  tenantId: string;
  userId?: string;
  sessionId?: string;
  details: Record<string, any>;
  outcome: 'success' | 'failure' | 'error';
  duration_ms?: number;
}

/**
 * Log audit event for interop operation
 * Integrates with SIEM if configured, otherwise structured logging
 */
export async function auditDecision(
  eventType: string,
  details: Record<string, any>
): Promise<string> {
  const eventId = generateId('audit');
  const auditEvent: AuditEvent = {
    eventId,
    timestamp: new Date().toISOString(),
    eventType,
    tenantId: details.tenantId || 'unknown',
    userId: details.userId,
    sessionId: details.sessionId,
    details: {
      ...details,
      // Redact sensitive information
      parameters: details.parameters ? '[REDACTED]' : undefined
    },
    outcome: eventType.includes('error') ? 'error' :
             eventType.includes('deny') || eventType.includes('violation') ? 'failure' : 'success',
    duration_ms: details.duration_ms
  };

  try {
    // Send to SIEM if configured
    if (process.env.SIEM_ENDPOINT) {
      await sendToSIEM(auditEvent);
    }

    // Always log structured event
    logger.info('Interop audit event', {
      audit_event_id: eventId,
      event_type: eventType,
      tenant_id: auditEvent.tenantId,
      outcome: auditEvent.outcome,
      duration_ms: auditEvent.duration_ms
    });

    // Store for evidence collection
    await storeAuditEvent(auditEvent);

  } catch (error) {
    logger.error('Audit logging failed', { error: error.message, eventId, eventType });
  }

  return eventId;
}

async function sendToSIEM(event: AuditEvent): Promise<void> {
  // SIEM integration - HTTP POST to configured endpoint
  const response = await fetch(process.env.SIEM_ENDPOINT!, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.SIEM_TOKEN}`
    },
    body: JSON.stringify(event)
  });

  if (!response.ok) {
    throw new Error(`SIEM submission failed: ${response.status}`);
  }
}

async function storeAuditEvent(event: AuditEvent): Promise<void> {
  // Store in audit evidence collection
  const fs = await import('fs').then(m => m.promises);
  const path = `out/audit/interop-${event.timestamp.split('T')[0]}.jsonl`;

  await fs.appendFile(path, JSON.stringify(event) + '\n');
}
