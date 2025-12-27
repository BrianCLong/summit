import { EventEmitter } from 'events';

export class AuditEmitter extends EventEmitter {
  private static instance: AuditEmitter;

  private constructor() {
    super();
  }

  public static getInstance(): AuditEmitter {
    if (!AuditEmitter.instance) {
      AuditEmitter.instance = new AuditEmitter();
    }
    return AuditEmitter.instance;
  }

  public emitAudit(event: string, data: any): void {
    this.emit('audit', { event, data, timestamp: new Date() });
  }
}
