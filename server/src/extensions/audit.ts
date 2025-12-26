
import { ExtensionContext } from './types';

export interface AuditEvent {
  id: string;
  timestamp: Date;
  tenantId: string;
  extensionId: string;
  action: string; // e.g., 'install', 'execute', 'access_data'
  status: 'success' | 'failure' | 'denied';
  details?: any;
}

export class ExtensionAuditService {
  // In-memory log for prototype
  private logs: AuditEvent[] = [];

  async log(
    context: Partial<ExtensionContext>,
    action: string,
    status: AuditEvent['status'],
    details?: any
  ): Promise<void> {
    const event: AuditEvent = {
      id: Math.random().toString(36).substring(7),
      timestamp: new Date(),
      tenantId: context.tenantId || 'unknown',
      extensionId: context.extensionId || 'unknown',
      action,
      status,
      details,
    };

    // In a real system, this would write to the immutable ledger
    this.logs.push(event);
    console.log(`[ExtensionAudit] ${event.timestamp.toISOString()} [${event.tenantId}:${event.extensionId}] ${action} -> ${status}`, details || '');
  }

  async getLogs(tenantId: string, extensionId?: string): Promise<AuditEvent[]> {
    return this.logs.filter(l =>
      l.tenantId === tenantId &&
      (!extensionId || l.extensionId === extensionId)
    );
  }

  // Test helper
  _clear() {
    this.logs = [];
  }
}

export const extensionAuditService = new ExtensionAuditService();
