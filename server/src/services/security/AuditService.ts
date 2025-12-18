import { writeAudit } from '../../utils/audit.js';

export interface AuditEvent {
  userId?: string;
  action: string;
  resourceType?: string;
  resourceId?: string;
  details?: Record<string, unknown>;
  ip?: string;
  userAgent?: string;
  actorRole?: string;
  sessionId?: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
}

export class AuditService {
  /**
   * Logs a security or operational event to the audit trail.
   */
  static async log(event: AuditEvent): Promise<void> {
    return writeAudit(event);
  }
}
