import { AuditEvent, AuditLevel, ComplianceFramework } from './advanced-audit-system.js';
import { advancedAuditSystem } from './index.js';

/**
 * Unified Audit Sink Interface
 * This interface defines the standard way to record audit events across the platform.
 */
export interface IAuditSink {
  /**
   * Records an audit event.
   * @param event The audit event data to record.
   * @returns A promise that resolves to the unique ID of the recorded event.
   */
  recordEvent(event: Partial<AuditEvent>): Promise<string>;

  /**
   * Records a critical security alert.
   * @param message Descriptive message of the alert.
   * @param details Additional metadata for forensic analysis.
   */
  securityAlert(message: string, details: Record<string, any>): Promise<string>;

  /**
   * Records a compliance-relevant event.
   * @param framework The compliance framework (e.g., GDPR, SOC2).
   * @param message Descriptive message.
   * @param details Additional metadata.
   */
  complianceEvent(
    framework: ComplianceFramework,
    message: string,
    details: Record<string, any>
  ): Promise<string>;
}

/**
 * Production Audit Sink implementation that routes events to the AdvancedAuditSystem.
 * It provides a clean API for common audit patterns.
 */
export class AuditSink implements IAuditSink {
  async recordEvent(event: Partial<AuditEvent>): Promise<string> {
    // In dev/test without full DB setup, we can fallback to console or pino
    // But here we route to the sophisticated system.
    return advancedAuditSystem.recordEvent(event);
  }

  async securityAlert(message: string, details: Record<string, any>): Promise<string> {
    return this.recordEvent({
      eventType: 'security_alert',
      level: 'critical',
      action: 'security_alert_triggered',
      message,
      details,
      complianceRelevant: true,
    });
  }

  async complianceEvent(
    framework: ComplianceFramework,
    message: string,
    details: Record<string, any>
  ): Promise<string> {
    return this.recordEvent({
      eventType: 'user_action',
      level: 'info',
      action: 'compliance_event_recorded',
      message,
      details,
      complianceRelevant: true,
      complianceFrameworks: [framework],
    });
  }
}

/**
 * Singleton instance of the Audit Sink.
 */
export const auditSink: IAuditSink = new AuditSink();
