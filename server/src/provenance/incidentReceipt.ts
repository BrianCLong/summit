import { provenanceLedger } from './ledger.js';
import type { ProvenanceEntry } from './ledger.js';

export interface IncidentReceiptInput {
  tenantId: string;
  breachId: string;
  actorId?: string;
  actorType?: ProvenanceEntry['actorType'];
  timestamp?: Date;
  correlationId?: string;
  environment?: string;
  breachContext: Record<string, unknown>;
  rampAction?: Record<string, unknown>;
}

export async function recordIncidentReceipt(
  input: IncidentReceiptInput,
): Promise<ProvenanceEntry> {
  const timestamp = input.timestamp ?? new Date();

  return provenanceLedger.appendEntry({
    tenantId: input.tenantId,
    timestamp,
    actionType: 'INCIDENT_RECEIPT',
    resourceType: 'SLO_BREACH',
    resourceId: input.breachId,
    actorId: input.actorId ?? 'system',
    actorType: input.actorType ?? 'system',
    payload: {
      breachContext: input.breachContext,
      rampAction: input.rampAction ?? null,
      receiptTimestamp: timestamp.toISOString(),
    },
    metadata: {
      correlationId: input.correlationId,
      environment: input.environment,
      source: 'auto-ramp-reducer',
      domain: 'slo-ramp',
    },
  });
}
