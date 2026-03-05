import * as crypto from 'crypto';

export interface AuditEvent {
  timestamp: string;
  requestId: string;
  profile: string;
  intent: string;
  action: 'ALLOWED' | 'DENIED' | 'REDLINE_VIOLATION';
  promptHash: string; // Do not log raw prompt PII, only hash
}

export interface CryptographicAuditRecord {
  event: AuditEvent;
  signature: string;
}

/**
 * Mocks the emission of a cryptographically verifiable audit log.
 * In production, this might write to an append-only ledger or use actual HMAC signatures with a vault.
 */
export function emitAuditLog(eventDetails: Omit<AuditEvent, 'timestamp' | 'promptHash'> & { rawPrompt: string }): CryptographicAuditRecord {
  const promptHash = crypto.createHash('sha256').update(eventDetails.rawPrompt).digest('hex');

  const event: AuditEvent = {
    timestamp: new Date().toISOString(),
    requestId: eventDetails.requestId,
    profile: eventDetails.profile,
    intent: eventDetails.intent,
    action: eventDetails.action,
    promptHash
  };

  // Mock cryptographic signature of the event to prove non-repudiation
  const signatureString = JSON.stringify(event) + (process.env.AUDIT_SECRET_MOCK || 'mock-secret');
  const signature = crypto.createHash('sha256').update(signatureString).digest('hex');

  const record: CryptographicAuditRecord = {
    event,
    signature,
  };

  // Simulate secure write
  console.log(`[AUDIT_LOG_EMITTED] ${JSON.stringify(record)}`);

  return record;
}
