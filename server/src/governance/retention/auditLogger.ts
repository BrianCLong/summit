import pino from 'pino';
import { RetentionAuditEvent } from './types.js';

export interface RetentionAuditLogger {
  log(event: RetentionAuditEvent): Promise<void>;
}

const logger = pino({ name: 'data-retention' });

export class PinoRetentionAuditLogger implements RetentionAuditLogger {
  async log(event: RetentionAuditEvent): Promise<void> {
    const logMethod = event.severity === 'error'
      ? logger.error.bind(logger)
      : event.severity === 'warn'
        ? logger.warn.bind(logger)
        : logger.info.bind(logger);

    logMethod({
      datasetId: event.datasetId,
      policyId: event.policyId,
      metadata: event.metadata
    }, event.message);
  }
}

export class AdvancedAuditSystemAdapter implements RetentionAuditLogger {
  private readonly auditSystem: { recordEvent: (event: Record<string, any>) => Promise<string> };

  constructor(auditSystem: { recordEvent: (event: Record<string, any>) => Promise<string> }) {
    this.auditSystem = auditSystem;
  }

  async log(event: RetentionAuditEvent): Promise<void> {
    await this.auditSystem.recordEvent({
      eventType: `retention.${event.event}`,
      level: event.severity === 'error' ? 'error' : event.severity === 'warn' ? 'warn' : 'info',
      tenantId: event.metadata?.tenantId || 'global',
      serviceId: 'data-retention-engine',
      action: event.event,
      outcome: event.severity === 'error' ? 'failure' : 'success',
      message: event.message,
      details: {
        datasetId: event.datasetId,
        policyId: event.policyId,
        ...event.metadata
      },
      complianceRelevant: true,
      complianceFrameworks: ['SOC2', 'GDPR'],
      correlationId: event.metadata?.correlationId || event.datasetId,
      userId: event.metadata?.userId,
      resourceType: event.metadata?.resourceType || 'dataset',
      resourceId: event.datasetId
    });
  }
}

export class CompositeRetentionAuditLogger implements RetentionAuditLogger {
  private readonly loggers: RetentionAuditLogger[];

  constructor(...loggers: RetentionAuditLogger[]) {
    this.loggers = loggers;
  }

  async log(event: RetentionAuditEvent): Promise<void> {
    await Promise.all(this.loggers.map(logger => logger.log(event)));
  }
}
