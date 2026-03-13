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
  [key: string]: unknown;
}

export function wireAuditEvents(
  auditLogger: AuditLogger,
  ...services: AuditableService[]
): void {
  for (const service of services) {
    const methodsToWrap = ['invoke', 'execute', 'start', 'stop', 'save', 'delete'];

    for (const methodName of methodsToWrap) {
      const method = service[methodName];
      if (typeof method === 'function') {
        const originalMethod = method as (...args: unknown[]) => Promise<unknown>;

        service[methodName] = async function (this: unknown, ...args: unknown[]) {
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
          } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            auditLogger.log({
              timestamp,
              actorId: 'system',
              action: methodName,
              resource: service.name,
              outcome: 'failure',
              metadata: { args, error: errorMessage },
            });
            throw error;
          }
        };
      }
    }
  }
}
