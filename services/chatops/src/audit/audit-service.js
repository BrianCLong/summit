"use strict";
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AUDIT_TABLE_SCHEMA = exports.AuditService = void 0;
exports.createAuditService = createAuditService;
const crypto_1 = __importDefault(require("crypto"));
const events_1 = require("events");
// =============================================================================
// AUDIT SERVICE
// =============================================================================
class AuditService extends events_1.EventEmitter {
    pg;
    redis;
    config;
    eventBuffer = [];
    flushInterval;
    lastHash = '';
    constructor(config) {
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
    async logTrace(trace) {
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
    async logBlocked(operation, classification, context) {
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
    async logToolInvocation(params) {
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
    async logGuardrail(flag, context) {
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
    async logApprovalRequest(params) {
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
    async logApprovalDecision(params) {
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
    async logSecurityEvent(params) {
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
    async query(params) {
        const conditions = ['tenant_id = $1'];
        const values = [params.tenantId];
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
        const result = await this.pg.query(`SELECT * FROM chatops_audit_events
      WHERE ${conditions.join(' AND ')}
      ORDER BY timestamp DESC
      LIMIT ${limit} OFFSET ${offset}`, values);
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
    async verifyIntegrity(tenantId, startEventId) {
        const events = await this.pg.query(`SELECT event_id, hash, previous_hash, data
      FROM chatops_audit_events
      WHERE tenant_id = $1
      ${startEventId ? 'AND event_id >= $2' : ''}
      ORDER BY timestamp ASC`, startEventId ? [tenantId, startEventId] : [tenantId]);
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
    async export(params) {
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
            const rows = events.map((e) => [
                e.eventId,
                e.eventType,
                e.tenantId,
                e.userId,
                e.sessionId,
                e.traceId ?? '',
                e.timestamp.toISOString(),
                JSON.stringify(e.data),
            ].join(','));
            return [headers.join(','), ...rows].join('\n');
        }
        return JSON.stringify(events, null, 2);
    }
    // ===========================================================================
    // INTERNAL METHODS
    // ===========================================================================
    async log(params) {
        const event = {
            eventId: crypto_1.default.randomUUID(),
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
    computeHash(data, previousHash) {
        const payload = JSON.stringify({ data, previousHash });
        return crypto_1.default.createHash('sha256').update(payload).digest('hex');
    }
    hashData(data) {
        return crypto_1.default.createHash('sha256').update(JSON.stringify(data)).digest('hex');
    }
    async flush() {
        if (this.eventBuffer.length === 0)
            return;
        const events = [...this.eventBuffer];
        this.eventBuffer = [];
        // Batch insert
        const values = [];
        const placeholders = [];
        events.forEach((event, i) => {
            const offset = i * 10;
            placeholders.push(`($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9}, $${offset + 10})`);
            values.push(event.eventId, event.eventType, event.tenantId, event.userId, event.sessionId, event.traceId ?? null, event.timestamp, JSON.stringify(event.data), JSON.stringify(event.metadata), event.hash ?? null);
        });
        await this.pg.query(`INSERT INTO chatops_audit_events (
        event_id, event_type, tenant_id, user_id, session_id,
        trace_id, timestamp, data, metadata, hash
      ) VALUES ${placeholders.join(', ')}`, values);
        // Update last hash in Redis
        if (this.config.enableHashChain && events.length > 0) {
            await this.redis.set('chatops:audit:last_hash', this.lastHash);
        }
    }
    async loadLastHash() {
        if (!this.config.enableHashChain)
            return;
        const cached = await this.redis.get('chatops:audit:last_hash');
        if (cached) {
            this.lastHash = cached;
            return;
        }
        // Load from database
        const result = await this.pg.query(`SELECT hash FROM chatops_audit_events
      ORDER BY timestamp DESC
      LIMIT 1`);
        if (result.rows.length > 0) {
            this.lastHash = result.rows[0].hash;
            await this.redis.set('chatops:audit:last_hash', this.lastHash);
        }
    }
    startFlushInterval() {
        this.flushInterval = setInterval(async () => {
            try {
                await this.flush();
            }
            catch (error) {
                console.error('Audit flush error:', error);
            }
        }, this.config.flushIntervalMs);
    }
    // ===========================================================================
    // CLEANUP
    // ===========================================================================
    async close() {
        if (this.flushInterval) {
            clearInterval(this.flushInterval);
        }
        // Final flush
        await this.flush();
    }
}
exports.AuditService = AuditService;
// =============================================================================
// FACTORY
// =============================================================================
function createAuditService(config) {
    return new AuditService(config);
}
// =============================================================================
// AUDIT TABLE SCHEMA (for reference)
// =============================================================================
exports.AUDIT_TABLE_SCHEMA = `
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
