/**
 * SecurityAuditLogger — Central "who saw what when" audit facade
 *
 * Wraps AdvancedAuditSystem with:
 *  - Non-blocking, fire-and-forget writes (safe for hot paths)
 *  - Prometheus self-monitoring metrics (write success/failure counts)
 *  - Convenience helpers for the most common security-relevant actions
 *
 * Usage:
 *   import { securityAudit } from '../audit/security-audit-logger.js';
 *   securityAudit.logSensitiveRead({ actor, resource, ... });
 */

import { randomUUID } from 'crypto';
import promClient from 'prom-client';
import logger from '../utils/logger.js';

import type {
  AuditEventType,
  AuditLevel,
  ComplianceFramework,
} from './advanced-audit-system.js';

// ---------------------------------------------------------------------------
// Prometheus metrics — exported so SOC dashboards can consume them
// ---------------------------------------------------------------------------

export const securityAuditWritesTotal = new promClient.Counter({
  name: 'security_audit_writes_total',
  help: 'Total security audit events written (success or failure)',
  labelNames: ['event_type', 'outcome'] as const,
});

export const securityAuditWriteFailuresTotal = new promClient.Counter({
  name: 'security_audit_write_failures_total',
  help: 'Security audit events that failed to persist',
  labelNames: ['event_type'] as const,
});

export const securitySensitiveReadsTotal = new promClient.Counter({
  name: 'security_sensitive_reads_total',
  help: 'Sensitive resource reads recorded by audit logger',
  labelNames: ['resource_type'] as const,
});

export const securityAuthDenialsTotal = new promClient.Counter({
  name: 'security_auth_denials_total',
  help: 'Auth/permission denials recorded by audit logger',
  labelNames: ['denial_type'] as const,
});

export const securityDataExportsTotal = new promClient.Counter({
  name: 'security_data_exports_total',
  help: 'Data export events recorded by audit logger',
  labelNames: ['artifact_type'] as const,
});

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SecurityAuditEntry {
  /** Actor identifier (user ID, service account, agent ID) */
  actor: string;
  /** Type of actor */
  actorType?: 'user' | 'service' | 'agent';
  /** Tenant scope */
  tenantId?: string;
  /** What was accessed / modified / exported */
  resourceType: string;
  /** Specific resource identifier */
  resourceId: string;
  /** Human-readable action verb: view | update | export | delete | search | ingest */
  action: string;
  /** Optional correlation / request ID for tracing */
  correlationId?: string;
  /** Additional details (query params, filters, counts, etc.) */
  details?: Record<string, unknown>;
  /** IP address of the requester */
  ipAddress?: string;
  /** User agent string */
  userAgent?: string;
  /** Override the default event type */
  eventType?: AuditEventType;
  /** Override the default level */
  level?: AuditLevel;
  /** Compliance frameworks this event touches */
  complianceFrameworks?: ComplianceFramework[];
  /** Data classification of the resource */
  dataClassification?: 'public' | 'internal' | 'confidential' | 'restricted';
}

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

class SecurityAuditLogger {
  /**
   * Record a sensitive-read event ("who saw what when").
   * Non-blocking — errors are logged + metriced, never thrown to the caller.
   */
  logSensitiveRead(entry: SecurityAuditEntry): void {
    securitySensitiveReadsTotal.inc({ resource_type: entry.resourceType });
    this.emit({
      ...entry,
      eventType: entry.eventType ?? 'resource_access',
      action: entry.action || 'view',
      level: entry.level ?? 'info',
    });
  }

  /**
   * Record a data-export / bulk-download event.
   */
  logDataExport(entry: SecurityAuditEntry): void {
    securityDataExportsTotal.inc({ artifact_type: entry.resourceType });
    this.emit({
      ...entry,
      eventType: entry.eventType ?? 'data_export',
      action: entry.action || 'export',
      level: entry.level ?? 'warn',
      complianceFrameworks: entry.complianceFrameworks ?? ['SOC2', 'GDPR'],
    });
  }

  /**
   * Record a data-ingest / import event.
   */
  logDataImport(entry: SecurityAuditEntry): void {
    this.emit({
      ...entry,
      eventType: entry.eventType ?? 'data_import',
      action: entry.action || 'ingest',
      level: entry.level ?? 'info',
    });
  }

  /**
   * Record an auth/permission denial.
   */
  logAuthDenial(entry: SecurityAuditEntry & { denialType?: string }): void {
    securityAuthDenialsTotal.inc({
      denial_type: entry.denialType ?? 'unknown',
    });
    this.emit({
      ...entry,
      eventType: entry.eventType ?? 'policy_violation',
      action: entry.action || 'access_denied',
      level: entry.level ?? 'warn',
    });
  }

  /**
   * Record a resource modification.
   */
  logResourceModify(entry: SecurityAuditEntry): void {
    this.emit({
      ...entry,
      eventType: entry.eventType ?? 'resource_modify',
      action: entry.action || 'update',
      level: entry.level ?? 'info',
    });
  }

  // -------------------------------------------------------------------------
  // Internal: fire-and-forget emit
  // -------------------------------------------------------------------------

  private emit(entry: SecurityAuditEntry & { eventType: AuditEventType }): void {
    const eventType = entry.eventType;

    // Defer the async work so the caller's hot path is never blocked
    setImmediate(() => {
      this.writeToAuditSystem(entry)
        .then(() => {
          securityAuditWritesTotal.inc({ event_type: eventType, outcome: 'success' });
        })
        .catch((err) => {
          securityAuditWritesTotal.inc({ event_type: eventType, outcome: 'failure' });
          securityAuditWriteFailuresTotal.inc({ event_type: eventType });
          logger.error(
            { err: err?.message, eventType, actor: entry.actor, resourceId: entry.resourceId },
            'SecurityAuditLogger: failed to persist audit event',
          );
        });
    });
  }

  private async writeToAuditSystem(
    entry: SecurityAuditEntry & { eventType: AuditEventType },
  ): Promise<void> {
    // Lazy-load to avoid circular dependency and startup ordering issues
    const { getAuditSystem } = await import('./advanced-audit-system.js');
    const audit = getAuditSystem();

    await audit.recordEvent({
      eventType: entry.eventType,
      level: entry.level ?? 'info',
      action: entry.action,
      outcome: 'success',
      userId: entry.actor,
      tenantId: entry.tenantId ?? 'unknown',
      serviceId: 'intelgraph-api',
      resourceType: entry.resourceType,
      resourceId: entry.resourceId,
      message: `${entry.action} ${entry.resourceType}/${entry.resourceId} by ${entry.actorType ?? 'user'}:${entry.actor}`,
      details: {
        ...entry.details,
        actorType: entry.actorType ?? 'user',
      },
      correlationId: entry.correlationId ?? randomUUID(),
      ipAddress: entry.ipAddress,
      userAgent: entry.userAgent,
      complianceRelevant: (entry.complianceFrameworks?.length ?? 0) > 0,
      complianceFrameworks: entry.complianceFrameworks ?? [],
      dataClassification: entry.dataClassification,
    });
  }
}

/** Singleton instance — import this from consuming modules */
export const securityAudit = new SecurityAuditLogger();
