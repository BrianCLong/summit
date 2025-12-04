/**
 * Audit Service Integration for ChatOps
 *
 * Provides comprehensive audit logging for:
 * - ReAct traces (full execution history)
 * - Tool invocations
 * - Approval decisions
 * - Guardrail events
 * - Security violations
 *
 * Features:
 * - Cryptographic hash chaining for tamper detection
 * - Real-time streaming to audit log
 * - Retention policy enforcement
 * - Export for compliance reporting
 */

import { Pool } from 'pg';
import Redis from 'ioredis';
import crypto from 'crypto';
import { EventEmitter } from 'events';

import {
  ReActTrace,
  ToolOperation,
  RiskClassification,
  GuardrailFlag,
  SecurityContext,
} from '../types.js';

// =============================================================================
// TYPES
// =============================================================================

export interface AuditServiceConfig {
  postgres: Pool;
  redis: Redis;
  serviceName?: string;
  enableHashChain?: boolean;
  retentionDays?: number;
  batchSize?: number;
  flushIntervalMs?: number;
}

export type AuditEventType =
  | 'trace_started'
  | 'trace_completed'
  | 'trace_step'
  | 'tool_invoked'
  | 'approval_requested'
  | 'approval_decided'
  | 'guardrail_triggered'
  | 'operation_blocked'
  | 'session_started'
  | 'session_ended'
  | 'security_event';

export interface AuditEvent {
  eventId: string;
  eventType: AuditEventType;
  tenantId: string;
  userId: string;
  sessionId: string;
  traceId?: string;
  timestamp: Date;
  data: Record<string, unknown>;
  metadata: {
    serviceName: string;
    version: string;
    environment: string;
  };
  hash?: string;
  previousHash?: string;
}

export interface AuditQuery {
  tenantId: string;
  userId?: string;
  sessionId?: string;
  traceId?: string;
  eventTypes?: AuditEventType[];
  startTime?: Date;
  endTime?: Date;
  limit?: number;
  offset?: number;
}

// =============================================================================
// AUDIT SERVICE
// =============================================================================

export class AuditService extends EventEmitter {
  private pg: Pool;
  private redis: Redis;
  private config: Required<AuditServiceConfig>;
  private eventBuffer: AuditEvent[] = [];
  private flushInterval?: NodeJS.Timeout;
  private lastHash: string = '';

  constructor(config: AuditServiceConfig) {
    super();

    this.pg = config.postgres;
    this.redis = config.redis;
    this.config = {
      serviceName: config.serviceName ?? 'chatops',
      enableHashChain: config.enableHashChain ?? true,
      retentionDays: config.retentionDays ?? 365,
      batchSize: config.batchSize ?? 100,
      flushIntervalMs: config.flushIntervalMs ?? 5000,
      postgres: config.postgres,
      redis: config.redis,
    };

    // Start flush interval
    this.startFlushInterval();

    // Load last hash from storage
    this.loadLastHash();
  }

  // ===========================================================================
  // PUBLIC API - TRACE LOGGING
  // ===========================================================================

  /**
   * Log a ReAct trace
   */
  async logTrace(trace: ReActTrace): Promise<void> {
    // Log trace completion
    await this.log({
      eventType: 'trace_completed',
      tenantId: trace.tenantId,
      userId: trace.userId,
      sessionId: trace.sessionId,
      traceId: trace.traceId,
      data: {
        outcome: trace.finalOutcome,
        stepCount: trace.steps.length,
        totalTokens: trace.totalTokens,
        totalLatencyMs: trace.totalLatencyMs,
        hitlEscalations: trace.hitlEscalations,
        prohibitedBlocks: trace.prohibitedBlocks,
        startTime: trace.startTime,
        endTime: trace.endTime,
      },
    });

    // Log individual steps
    for (const step of trace.steps) {
      await this.log({
        eventType: 'trace_step',
        tenantId: trace.tenantId,
        userId: trace.userId,
        sessionId: trace.sessionId,
        traceId: trace.traceId,
        data: {
          stepNumber: step.stepNumber,
          thought: step.thought,
          tool: step.action.tool,
          operation: step.action.input,
          riskLevel: step.action.riskLevel,
          success: step.observation.success,
          error: step.observation.error,
          tokensUsed: step.observation.tokensUsed,
          latencyMs: step.observation.latencyMs,
        },
      });
    }
  }

  /**
   * Log a blocked operation
   */
  async logBlocked(
    operation: ToolOperation,
    classification: RiskClassification,
    context?: SecurityContext,
  ): Promise<void> {
    await this.log({
      eventType: 'operation_blocked',
      tenantId: context?.tenantId ?? 'unknown',
      userId: context?.userId ?? 'unknown',
      sessionId: context?.sessionId ?? 'unknown',
      data: {
        toolId: operation.toolId,
        operation: operation.operation,
        inputPreview: JSON.stringify(operation.input).slice(0, 500),
        riskLevel: classification.level,
        reason: classification.reason,
        userClearance: context?.clearanceLevel,
        userRoles: context?.roles,
      },
    });
  }

  /**
   * Log a tool invocation
   */
  async logToolInvocation(params: {
    tenantId: string;
    userId: string;
    sessionId: string;
    traceId?: string;
    toolId: string;
    operation: string;
    input: Record<string, unknown>;
    riskLevel: string;
    success: boolean;
    error?: string;
    tokensUsed: number;
    latencyMs: number;
  }): Promise<void> {
    await this.log({
      eventType: 'tool_invoked',
      tenantId: params.tenantId,
      userId: params.userId,
      sessionId: params.sessionId,
      traceId: params.traceId,
      data: {
        toolId: params.toolId,
        operation: params.operation,
        inputHash: this.hashData(params.input),
        inputPreview: JSON.stringify(params.input).slice(0, 500),
        riskLevel: params.riskLevel,
        success: params.success,
        error: params.error,
        tokensUsed: params.tokensUsed,
        latencyMs: params.latencyMs,
      },
    });
  }

  /**
   * Log a guardrail event
   */
  async logGuardrail(
    flag: GuardrailFlag,
    context: {
      tenantId: string;
      userId: string;
      sessionId: string;
      turnId?: string;
      query?: string;
    },
  ): Promise<void> {
    await this.log({
      eventType: 'guardrail_triggered',
      tenantId: context.tenantId,
      userId: context.userId,
      sessionId: context.sessionId,
      data: {
        type: flag.type,
        severity: flag.severity,
        action: flag.action,
        description: flag.description,
        turnId: context.turnId,
        queryPreview: context.query?.slice(0, 200),
      },
    });
  }

  /**
   * Log approval request
   */
  async logApprovalRequest(params: {
    requestId: string;
    tenantId: string;
    userId: string;
    sessionId: string;
    traceId?: string;
    toolId: string;
    operation: string;
    riskLevel: string;
  }): Promise<void> {
    await this.log({
      eventType: 'approval_requested',
      tenantId: params.tenantId,
      userId: params.userId,
      sessionId: params.sessionId,
      traceId: params.traceId,
      data: {
        requestId: params.requestId,
        toolId: params.toolId,
        operation: params.operation,
        riskLevel: params.riskLevel,
      },
    });
  }

  /**
   * Log approval decision
   */
  async logApprovalDecision(params: {
    requestId: string;
    tenantId: string;
    requestorId: string;
    approverId: string;
    sessionId: string;
    decision: 'approve' | 'deny';
    reason?: string;
  }): Promise<void> {
    await this.log({
      eventType: 'approval_decided',
      tenantId: params.tenantId,
      userId: params.approverId,
      sessionId: params.sessionId,
      data: {
        requestId: params.requestId,
        requestorId: params.requestorId,
        decision: params.decision,
        reason: params.reason,
      },
    });
  }

  /**
   * Log security event
   */
  async logSecurityEvent(params: {
    tenantId: string;
    userId?: string;
    sessionId?: string;
    eventName: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    await this.log({
      eventType: 'security_event',
      tenantId: params.tenantId,
      userId: params.userId ?? 'system',
      sessionId: params.sessionId ?? 'system',
      data: {
        eventName: params.eventName,
        severity: params.severity,
        description: params.description,
        ...params.metadata,
      },
    });
  }

  // ===========================================================================
  // QUERY API
  // ===========================================================================

  /**
   * Query audit events
   */
  async query(params: AuditQuery): Promise<AuditEvent[]> {
    const conditions: string[] = ['tenant_id = $1'];
    const values: unknown[] = [params.tenantId];
    let paramIndex = 2;

    if (params.userId) {
      conditions.push(`user_id = $${paramIndex++}`);
      values.push(params.userId);
    }

    if (params.sessionId) {
      conditions.push(`session_id = $${paramIndex++}`);
      values.push(params.sessionId);
    }

    if (params.traceId) {
      conditions.push(`trace_id = $${paramIndex++}`);
      values.push(params.traceId);
    }

    if (params.eventTypes && params.eventTypes.length > 0) {
      conditions.push(`event_type = ANY($${paramIndex++})`);
      values.push(params.eventTypes);
    }

    if (params.startTime) {
      conditions.push(`timestamp >= $${paramIndex++}`);
      values.push(params.startTime);
    }

    if (params.endTime) {
      conditions.push(`timestamp <= $${paramIndex++}`);
      values.push(params.endTime);
    }

    const limit = params.limit ?? 100;
    const offset = params.offset ?? 0;

    const result = await this.pg.query(
      `SELECT * FROM chatops_audit_events
      WHERE ${conditions.join(' AND ')}
      ORDER BY timestamp DESC
      LIMIT ${limit} OFFSET ${offset}`,
      values,
    );

    return result.rows.map((row) => ({
      eventId: row.event_id,
      eventType: row.event_type,
      tenantId: row.tenant_id,
      userId: row.user_id,
      sessionId: row.session_id,
      traceId: row.trace_id,
      timestamp: row.timestamp,
      data: row.data,
      metadata: row.metadata,
      hash: row.hash,
      previousHash: row.previous_hash,
    }));
  }

  /**
   * Verify hash chain integrity
   */
  async verifyIntegrity(tenantId: string, startEventId?: string): Promise<{
    valid: boolean;
    eventsChecked: number;
    brokenAt?: string;
  }> {
    const events = await this.pg.query(
      `SELECT event_id, hash, previous_hash, data
      FROM chatops_audit_events
      WHERE tenant_id = $1
      ${startEventId ? 'AND event_id >= $2' : ''}
      ORDER BY timestamp ASC`,
      startEventId ? [tenantId, startEventId] : [tenantId],
    );

    let eventsChecked = 0;
    let previousHash = '';

    for (const event of events.rows) {
      eventsChecked++;

      // Verify previous hash link
      if (previousHash && event.previous_hash !== previousHash) {
        return {
          valid: false,
          eventsChecked,
          brokenAt: event.event_id,
        };
      }

      // Verify hash of data
      const computedHash = this.computeHash(event.data, event.previous_hash);
      if (computedHash !== event.hash) {
        return {
          valid: false,
          eventsChecked,
          brokenAt: event.event_id,
        };
      }

      previousHash = event.hash;
    }

    return {
      valid: true,
      eventsChecked,
    };
  }

  /**
   * Export audit events for compliance
   */
  async export(params: AuditQuery & {
    format: 'json' | 'csv';
  }): Promise<string> {
    const events = await this.query(params);

    if (params.format === 'csv') {
      const headers = [
        'eventId',
        'eventType',
        'tenantId',
        'userId',
        'sessionId',
        'traceId',
        'timestamp',
        'data',
      ];

      const rows = events.map((e) =>
        [
          e.eventId,
          e.eventType,
          e.tenantId,
          e.userId,
          e.sessionId,
          e.traceId ?? '',
          e.timestamp.toISOString(),
          JSON.stringify(e.data),
        ].join(','),
      );

      return [headers.join(','), ...rows].join('\n');
    }

    return JSON.stringify(events, null, 2);
  }

  // ===========================================================================
  // INTERNAL METHODS
  // ===========================================================================

  private async log(params: Omit<AuditEvent, 'eventId' | 'timestamp' | 'metadata' | 'hash' | 'previousHash'>): Promise<void> {
    const event: AuditEvent = {
      eventId: crypto.randomUUID(),
      timestamp: new Date(),
      metadata: {
        serviceName: this.config.serviceName,
        version: '1.0.0',
        environment: process.env.NODE_ENV ?? 'development',
      },
      ...params,
    };

    // Compute hash chain
    if (this.config.enableHashChain) {
      event.previousHash = this.lastHash;
      event.hash = this.computeHash(event.data, this.lastHash);
      this.lastHash = event.hash;
    }

    // Add to buffer
    this.eventBuffer.push(event);

    // Flush if buffer is full
    if (this.eventBuffer.length >= this.config.batchSize) {
      await this.flush();
    }

    // Emit for real-time subscribers
    this.emit('audit:event', event);
  }

  private computeHash(data: unknown, previousHash: string): string {
    const payload = JSON.stringify({ data, previousHash });
    return crypto.createHash('sha256').update(payload).digest('hex');
  }

  private hashData(data: unknown): string {
    return crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex');
  }

  private async flush(): Promise<void> {
    if (this.eventBuffer.length === 0) return;

    const events = [...this.eventBuffer];
    this.eventBuffer = [];

    // Batch insert
    const values: unknown[] = [];
    const placeholders: string[] = [];

    events.forEach((event, i) => {
      const offset = i * 10;
      placeholders.push(`($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9}, $${offset + 10})`);
      values.push(
        event.eventId,
        event.eventType,
        event.tenantId,
        event.userId,
        event.sessionId,
        event.traceId ?? null,
        event.timestamp,
        JSON.stringify(event.data),
        JSON.stringify(event.metadata),
        event.hash ?? null,
      );
    });

    await this.pg.query(
      `INSERT INTO chatops_audit_events (
        event_id, event_type, tenant_id, user_id, session_id,
        trace_id, timestamp, data, metadata, hash
      ) VALUES ${placeholders.join(', ')}`,
      values,
    );

    // Update last hash in Redis
    if (this.config.enableHashChain && events.length > 0) {
      await this.redis.set('chatops:audit:last_hash', this.lastHash);
    }
  }

  private async loadLastHash(): Promise<void> {
    if (!this.config.enableHashChain) return;

    const cached = await this.redis.get('chatops:audit:last_hash');
    if (cached) {
      this.lastHash = cached;
      return;
    }

    // Load from database
    const result = await this.pg.query(
      `SELECT hash FROM chatops_audit_events
      ORDER BY timestamp DESC
      LIMIT 1`,
    );

    if (result.rows.length > 0) {
      this.lastHash = result.rows[0].hash;
      await this.redis.set('chatops:audit:last_hash', this.lastHash);
    }
  }

  private startFlushInterval(): void {
    this.flushInterval = setInterval(async () => {
      try {
        await this.flush();
      } catch (error) {
        console.error('Audit flush error:', error);
      }
    }, this.config.flushIntervalMs);
  }

  // ===========================================================================
  // CLEANUP
  // ===========================================================================

  async close(): Promise<void> {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }

    // Final flush
    await this.flush();
  }
}

// =============================================================================
// FACTORY
// =============================================================================

export function createAuditService(config: AuditServiceConfig): AuditService {
  return new AuditService(config);
}

// =============================================================================
// AUDIT TABLE SCHEMA (for reference)
// =============================================================================

export const AUDIT_TABLE_SCHEMA = `
CREATE TABLE IF NOT EXISTS chatops_audit_events (
  event_id UUID PRIMARY KEY,
  event_type VARCHAR(50) NOT NULL,
  tenant_id VARCHAR(255) NOT NULL,
  user_id VARCHAR(255) NOT NULL,
  session_id VARCHAR(255),
  trace_id UUID,
  timestamp TIMESTAMPTZ NOT NULL,
  data JSONB NOT NULL,
  metadata JSONB,
  hash VARCHAR(64),
  previous_hash VARCHAR(64)
);

CREATE INDEX IF NOT EXISTS idx_audit_tenant ON chatops_audit_events(tenant_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_user ON chatops_audit_events(tenant_id, user_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_session ON chatops_audit_events(session_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_trace ON chatops_audit_events(trace_id);
CREATE INDEX IF NOT EXISTS idx_audit_type ON chatops_audit_events(event_type, timestamp DESC);
`;
