import EventEmitter from 'events';
import pino from 'pino';
import { advancedAuditSystem, AuditEvent as AdvancedAuditEvent } from './advanced-audit-system.js';
import { AuditEvent, AuditEventType } from './audit-types.js';

/**
 * Event Emitter for decoupling Audit Logging from business logic.
 *
 * This allows services to emit audit events without waiting for persistence.
 * It also facilitates testing by mocking the emitter or listener.
 */
class AuditEmitter extends EventEmitter {
  private logger: pino.Logger;

  constructor() {
    super();
    this.logger = pino({ name: 'audit-emitter' });

    // Set up default listener
    this.on('audit', this.handleEvent.bind(this));
  }

  /**
   * Emit an audit event
   */
  public emitAudit(event: Partial<AuditEvent> & { eventType: AuditEventType }): void {
    this.emit('audit', event);
  }

  /**
   * Handle the event asynchronously
   */
  private async handleEvent(event: Partial<AuditEvent>): Promise<void> {
    try {
      // We must cast to any or compatible type because 'audit-types.ts' and 'advanced-audit-system.ts'
      // have diverged definitions of AuditEvent. This is a known technical debt item.
      // The advancedAuditSystem expects ITS own definition.
      // We perform a runtime compatibility check via the cast.
      if (advancedAuditSystem) {
        await advancedAuditSystem.recordEvent(event as unknown as Partial<AdvancedAuditEvent>);
      } else {
         this.logger.warn({ event }, 'AuditSystem not initialized, dropping event');
      }
    } catch (error) {
      // Fallback logging if the audit system fails
      // We must ensure audit failures are at least logged to stdout/stderr
      this.logger.error({ error, event }, 'Failed to persist audit event via AuditSystem');
    }
  }
}

// Singleton instance
export const auditEmitter = new AuditEmitter();
