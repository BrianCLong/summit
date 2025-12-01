/**
 * Provenance Integration for Authority Compiler
 *
 * Connects authority decisions to the provenance ledger for audit trails.
 */

import { v4 as uuidv4 } from 'uuid';
import type { PolicyDecision, Operation } from './schema/policy.schema';
import type { EvaluationContext } from './evaluator';

// -----------------------------------------------------------------------------
// Provenance Event Types
// -----------------------------------------------------------------------------

export interface AuthorityProvenanceEvent {
  /** Unique event ID */
  eventId: string;
  /** Event type */
  eventType: 'authority_evaluation' | 'authority_grant' | 'authority_deny' | 'two_person_request' | 'two_person_approval';
  /** Timestamp */
  timestamp: Date;
  /** User who triggered the event */
  userId: string;
  /** Tenant ID */
  tenantId?: string;
  /** Operation requested */
  operation: Operation;
  /** Resource accessed */
  resource: {
    type?: string;
    id?: string;
    investigationId?: string;
  };
  /** Policy decision */
  decision: {
    allowed: boolean;
    authorityId?: string;
    reason: string;
  };
  /** Request context */
  context: {
    ip?: string;
    userAgent?: string;
    correlationId?: string;
  };
  /** Hash of input for integrity */
  inputHash: string;
}

// -----------------------------------------------------------------------------
// Provenance Recorder
// -----------------------------------------------------------------------------

export interface ProvenanceRecorder {
  /** Record an authority event */
  recordEvent(event: AuthorityProvenanceEvent): Promise<void>;
  /** Get events for an entity */
  getEntityEvents(entityId: string): Promise<AuthorityProvenanceEvent[]>;
  /** Get events for a user */
  getUserEvents(userId: string, limit?: number): Promise<AuthorityProvenanceEvent[]>;
  /** Generate audit report */
  generateAuditReport(options: AuditReportOptions): Promise<AuditReport>;
}

export interface AuditReportOptions {
  startDate: Date;
  endDate: Date;
  userId?: string;
  entityType?: string;
  investigationId?: string;
  includeAllowed?: boolean;
  includeDenied?: boolean;
}

export interface AuditReport {
  generatedAt: Date;
  period: { start: Date; end: Date };
  summary: {
    totalEvents: number;
    allowedCount: number;
    deniedCount: number;
    uniqueUsers: number;
    topOperations: Array<{ operation: Operation; count: number }>;
  };
  events: AuthorityProvenanceEvent[];
}

// -----------------------------------------------------------------------------
// Default Provenance Recorder (In-Memory)
// -----------------------------------------------------------------------------

export class InMemoryProvenanceRecorder implements ProvenanceRecorder {
  private events: AuthorityProvenanceEvent[] = [];

  async recordEvent(event: AuthorityProvenanceEvent): Promise<void> {
    this.events.push(event);
  }

  async getEntityEvents(entityId: string): Promise<AuthorityProvenanceEvent[]> {
    return this.events.filter((e) => e.resource.id === entityId);
  }

  async getUserEvents(userId: string, limit = 100): Promise<AuthorityProvenanceEvent[]> {
    return this.events
      .filter((e) => e.userId === userId)
      .slice(-limit);
  }

  async generateAuditReport(options: AuditReportOptions): Promise<AuditReport> {
    const filtered = this.events.filter((e) => {
      if (e.timestamp < options.startDate || e.timestamp > options.endDate) return false;
      if (options.userId && e.userId !== options.userId) return false;
      if (options.entityType && e.resource.type !== options.entityType) return false;
      if (options.investigationId && e.resource.investigationId !== options.investigationId) return false;
      if (!options.includeAllowed && e.decision.allowed) return false;
      if (!options.includeDenied && !e.decision.allowed) return false;
      return true;
    });

    const operationCounts = new Map<Operation, number>();
    const uniqueUsers = new Set<string>();
    let allowedCount = 0;
    let deniedCount = 0;

    for (const event of filtered) {
      uniqueUsers.add(event.userId);
      if (event.decision.allowed) allowedCount++;
      else deniedCount++;
      operationCounts.set(event.operation, (operationCounts.get(event.operation) || 0) + 1);
    }

    return {
      generatedAt: new Date(),
      period: { start: options.startDate, end: options.endDate },
      summary: {
        totalEvents: filtered.length,
        allowedCount,
        deniedCount,
        uniqueUsers: uniqueUsers.size,
        topOperations: Array.from(operationCounts.entries())
          .map(([operation, count]) => ({ operation, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 10),
      },
      events: filtered,
    };
  }
}

// -----------------------------------------------------------------------------
// Provenance Integration Middleware
// -----------------------------------------------------------------------------

/**
 * Create provenance recording wrapper for policy evaluator
 */
export function withProvenanceRecording(
  evaluator: any,
  recorder: ProvenanceRecorder
): any {
  const originalEvaluate = evaluator.evaluate.bind(evaluator);

  evaluator.evaluate = async (context: EvaluationContext) => {
    const decision: PolicyDecision = await originalEvaluate(context);

    // Record provenance event
    const event: AuthorityProvenanceEvent = {
      eventId: uuidv4(),
      eventType: decision.allowed ? 'authority_grant' : 'authority_deny',
      timestamp: new Date(),
      userId: context.user.id,
      tenantId: context.user.tenantId,
      operation: context.operation,
      resource: {
        type: context.resource.entityType,
        id: context.resource.entityId,
        investigationId: context.resource.investigationId,
      },
      decision: {
        allowed: decision.allowed,
        authorityId: decision.authorityId,
        reason: decision.reason,
      },
      context: {
        ip: context.request.ip,
        userAgent: context.request.userAgent,
      },
      inputHash: hashContext(context),
    };

    await recorder.recordEvent(event);

    return decision;
  };

  return evaluator;
}

/**
 * Hash evaluation context for integrity
 */
function hashContext(context: EvaluationContext): string {
  const data = JSON.stringify({
    userId: context.user.id,
    operation: context.operation,
    resourceType: context.resource.entityType,
    resourceId: context.resource.entityId,
    timestamp: context.request.timestamp.toISOString(),
  });

  // Simple hash for demo - use crypto.subtle.digest in production
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString(16);
}

// -----------------------------------------------------------------------------
// Prov-Ledger Client
// -----------------------------------------------------------------------------

/**
 * Client for Summit's prov-ledger service
 */
export class ProvLedgerClient implements ProvenanceRecorder {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  async recordEvent(event: AuthorityProvenanceEvent): Promise<void> {
    await fetch(`${this.baseUrl}/claims`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: event.eventType,
        subject: event.userId,
        predicate: event.operation,
        object: event.resource.id || event.resource.type,
        metadata: {
          tenantId: event.tenantId,
          decision: event.decision,
          context: event.context,
        },
        hash: event.inputHash,
      }),
    });
  }

  async getEntityEvents(entityId: string): Promise<AuthorityProvenanceEvent[]> {
    const response = await fetch(`${this.baseUrl}/provenance?entityId=${entityId}`);
    const data = await response.json();
    return data.events || [];
  }

  async getUserEvents(userId: string, limit = 100): Promise<AuthorityProvenanceEvent[]> {
    const response = await fetch(`${this.baseUrl}/provenance?userId=${userId}&limit=${limit}`);
    const data = await response.json();
    return data.events || [];
  }

  async generateAuditReport(options: AuditReportOptions): Promise<AuditReport> {
    const params = new URLSearchParams({
      startDate: options.startDate.toISOString(),
      endDate: options.endDate.toISOString(),
    });
    if (options.userId) params.set('userId', options.userId);
    if (options.entityType) params.set('entityType', options.entityType);

    const response = await fetch(`${this.baseUrl}/audit/report?${params}`);
    return response.json();
  }
}
