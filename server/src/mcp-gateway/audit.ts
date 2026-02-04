export interface AuditEvent {
  timestamp: string;
  userId: string;
  traceId: string;
  action: string;
  targetId: string;
  status: 'allowed' | 'denied';
  details?: any;
}

export class AuditLogger {
  async log(event: AuditEvent): Promise<void> {
    // In a real implementation, this would write to a structured log or database.
    // For now, we log to stdout in JSON format.
    console.log(JSON.stringify({
      level: 'info',
      component: 'mcp-gateway',
      event
    }));
  }
}
