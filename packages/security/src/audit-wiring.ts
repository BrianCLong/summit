export interface AuditEvent {
  timestamp: string;
  actorId: string;
  action: string;
  resource: string;
  outcome: 'success' | 'failure';
  metadata?: Record<string, unknown>;
}

export interface AuditLogger {
  log(event: AuditEvent): void;
}

export interface AuditableService {
  name: string;
  [key: string]: any;
}

export function wireAuditEvents(
  auditLogger: AuditLogger,
  ...services: AuditableService[]
): void {
  for (const service of services) {
    const methodsToWrap = ['invoke', 'execute', 'start', 'stop', 'save', 'delete'];

    for (const methodName of methodsToWrap) {
      if (typeof service[methodName] === 'function') {
        const originalMethod = service[methodName];

        service[methodName] = async function (...args: any[]) {
          const timestamp = new Date().toISOString();
          try {
            const result = await originalMethod.apply(this, args);
            auditLogger.log({
              timestamp,
              actorId: 'system',
              action: methodName,
              resource: service.name,
              outcome: 'success',
              metadata: { args },
            });
            return result;
          } catch (error: any) {
            auditLogger.log({
              timestamp,
              actorId: 'system',
              action: methodName,
              resource: service.name,
              outcome: 'failure',
              metadata: { args, error: error.message },
            });
            throw error;
          }
        };
      }
    }
  }
}
