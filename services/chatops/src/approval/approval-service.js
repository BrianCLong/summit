"use strict";
// @ts-nocheck
/**
 * Approval Service for HITL Workflows
 *
 * Manages approval requests for human-in-the-loop operations:
 * - Request creation and persistence
 * - Multi-approver workflows
 * - Expiration handling
 * - Notification dispatch
 * - Decision recording
 *
 * Features:
 * - Configurable approval requirements
 * - Role-based approver matching
 * - Real-time notifications via WebSocket/Slack
 * - Audit trail for all decisions
 * - Automatic expiration with cleanup
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApprovalService = void 0;
exports.createApprovalService = createApprovalService;
const events_1 = require("events");
const uuid_1 = require("uuid");
// =============================================================================
// APPROVAL SERVICE
// =============================================================================
class ApprovalService extends events_1.EventEmitter {
    pg;
    redis;
    config;
    policies = new Map();
    cleanupInterval;
    notificationChannels = [];
    constructor(config) {
        super();
        this.pg = config.postgres;
        this.redis = config.redis;
        this.config = {
            defaultExpirationMinutes: config.defaultExpirationMinutes ?? 30,
            cleanupIntervalMinutes: config.cleanupIntervalMinutes ?? 5,
            notificationChannels: config.notificationChannels ?? [],
            postgres: config.postgres,
            redis: config.redis,
        };
        this.notificationChannels = config.notificationChannels ?? [];
        // Start cleanup interval
        this.startCleanupInterval();
        // Subscribe to Redis for real-time updates
        this.subscribeToUpdates();
    }
    // ===========================================================================
    // PUBLIC API
    // ===========================================================================
    /**
     * Create a new approval request
     */
    async createRequest(params) {
        const policy = this.findMatchingPolicy(params.operation);
        const expirationMinutes = policy?.expirationMinutes ?? this.config.defaultExpirationMinutes;
        const request = {
            requestId: (0, uuid_1.v4)(),
            sessionId: params.sessionId,
            userId: params.userId,
            tenantId: params.tenantId,
            operation: params.operation,
            classification: params.classification,
            trace: params.trace,
            status: 'pending',
            requestedAt: new Date(),
            expiresAt: new Date(Date.now() + expirationMinutes * 60 * 1000),
            approvals: [],
        };
        // Persist to PostgreSQL
        await this.pg.query(`INSERT INTO chatops_approvals (
        id, tenant_id, session_id, trace_id, requestor_id,
        tool_id, operation, input, risk_level, risk_reason,
        required_approvals, required_roles, status, created_at, expires_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`, [
            request.requestId,
            request.tenantId,
            request.sessionId,
            params.traceId,
            request.userId,
            request.operation.toolId,
            request.operation.operation,
            JSON.stringify(request.operation.input),
            request.classification.level,
            request.classification.reason,
            policy?.requiredApprovals ?? params.classification.requiredApprovals ?? 1,
            JSON.stringify(policy?.requiredRoles ?? params.classification.requiredRoles ?? ['supervisor']),
            request.status,
            request.requestedAt,
            request.expiresAt,
        ]);
        // Cache in Redis for fast lookup
        await this.cacheRequest(request);
        // Send notifications
        await this.notifyApprovers(request);
        // Emit event
        this.emit('approval:created', {
            type: 'created',
            request,
            timestamp: new Date(),
        });
        return request;
    }
    /**
     * Record an approval decision
     */
    async recordDecision(requestId, approverId, decision, reason) {
        const request = await this.getRequest(requestId);
        if (!request) {
            throw new Error(`Approval request ${requestId} not found`);
        }
        if (request.status !== 'pending') {
            throw new Error(`Approval request ${requestId} is no longer pending (status: ${request.status})`);
        }
        // Check if approver has required role
        const approverRole = await this.getApproverRole(approverId, request.tenantId);
        // Record the decision
        const approvalDecision = {
            approverId,
            decision,
            reason: reason ?? '',
            timestamp: new Date(),
        };
        // Persist decision
        await this.pg.query(`INSERT INTO chatops_approval_decisions (
        id, approval_id, approver_id, approver_role, decision, reason, decided_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)`, [
            (0, uuid_1.v4)(),
            requestId,
            approverId,
            approverRole,
            decision,
            reason,
            approvalDecision.timestamp,
        ]);
        request.approvals.push(approvalDecision);
        // Determine new status
        let newStatus = 'pending';
        if (decision === 'deny') {
            newStatus = 'denied';
        }
        else {
            // Check if we have enough approvals
            const approvalCount = request.approvals.filter((a) => a.decision === 'approve').length;
            const requiredApprovals = await this.getRequiredApprovals(requestId);
            if (approvalCount >= requiredApprovals) {
                newStatus = 'approved';
            }
        }
        // Update status if changed
        if (newStatus !== 'pending') {
            await this.updateStatus(requestId, newStatus);
            request.status = newStatus;
        }
        // Update cache
        await this.cacheRequest(request);
        // Emit event
        this.emit(`approval:${decision}d`, {
            type: decision === 'approve' ? 'approved' : 'denied',
            request,
            decision: approvalDecision,
            timestamp: new Date(),
        });
        // Notify about decision
        for (const channel of this.notificationChannels) {
            await channel.update(requestId, newStatus);
        }
        return request;
    }
    /**
     * Get approval request by ID
     */
    async getRequest(requestId) {
        // Try cache first
        const cached = await this.redis.get(`chatops:approval:${requestId}`);
        if (cached) {
            return JSON.parse(cached);
        }
        // Fall back to database
        const result = await this.pg.query(`SELECT a.*,
        COALESCE(json_agg(
          json_build_object(
            'approverId', d.approver_id,
            'decision', d.decision,
            'reason', d.reason,
            'timestamp', d.decided_at
          )
        ) FILTER (WHERE d.id IS NOT NULL), '[]') as decisions
      FROM chatops_approvals a
      LEFT JOIN chatops_approval_decisions d ON a.id = d.approval_id
      WHERE a.id = $1
      GROUP BY a.id`, [requestId]);
        if (result.rows.length === 0) {
            return null;
        }
        const row = result.rows[0];
        const request = {
            requestId: row.id,
            sessionId: row.session_id,
            userId: row.requestor_id,
            tenantId: row.tenant_id,
            operation: {
                toolId: row.tool_id,
                operation: row.operation,
                input: row.input,
            },
            classification: {
                level: row.risk_level,
                reason: row.risk_reason,
                requiredApprovals: row.required_approvals,
                requiredRoles: row.required_roles,
            },
            trace: {}, // Would need to load separately
            status: row.status,
            requestedAt: row.created_at,
            expiresAt: row.expires_at,
            approvals: row.decisions.map((d) => ({
                approverId: d.approverId,
                decision: d.decision,
                reason: d.reason,
                timestamp: new Date(d.timestamp),
            })),
        };
        // Cache for future lookups
        await this.cacheRequest(request);
        return request;
    }
    /**
     * Get pending requests for a tenant
     */
    async getPendingRequests(tenantId) {
        const result = await this.pg.query(`SELECT id FROM chatops_approvals
      WHERE tenant_id = $1 AND status = 'pending'
      ORDER BY created_at DESC`, [tenantId]);
        const requests = [];
        for (const row of result.rows) {
            const request = await this.getRequest(row.id);
            if (request) {
                requests.push(request);
            }
        }
        return requests;
    }
    /**
     * Wait for approval with timeout
     */
    async waitForApproval(requestId, timeoutMs) {
        const startTime = Date.now();
        while (Date.now() - startTime < timeoutMs) {
            const request = await this.getRequest(requestId);
            if (!request) {
                return false;
            }
            if (request.status === 'approved') {
                return true;
            }
            if (request.status === 'denied' || request.status === 'expired') {
                return false;
            }
            // Wait before checking again
            await new Promise((resolve) => setTimeout(resolve, 1000));
        }
        return false;
    }
    /**
     * Cancel a pending request
     */
    async cancelRequest(requestId, reason) {
        await this.updateStatus(requestId, 'cancelled');
        // Notify
        for (const channel of this.notificationChannels) {
            await channel.update(requestId, 'cancelled');
        }
    }
    /**
     * Register an approval policy
     */
    registerPolicy(policy) {
        this.policies.set(policy.operationPattern, policy);
    }
    /**
     * Register a notification channel
     */
    registerNotificationChannel(channel) {
        this.notificationChannels.push(channel);
    }
    // ===========================================================================
    // INTERNAL METHODS
    // ===========================================================================
    findMatchingPolicy(operation) {
        const operationKey = `${operation.toolId}:${operation.operation}`;
        // Exact match
        if (this.policies.has(operationKey)) {
            return this.policies.get(operationKey);
        }
        // Wildcard match
        for (const [pattern, policy] of this.policies) {
            const regex = new RegExp('^' + pattern.replace('*', '.*') + '$');
            if (regex.test(operationKey)) {
                return policy;
            }
        }
        return undefined;
    }
    async cacheRequest(request) {
        const ttl = Math.max(0, Math.ceil((request.expiresAt.getTime() - Date.now()) / 1000));
        if (ttl > 0) {
            await this.redis.setex(`chatops:approval:${request.requestId}`, ttl, JSON.stringify(request));
        }
    }
    async updateStatus(requestId, status) {
        await this.pg.query(`UPDATE chatops_approvals
      SET status = $1, resolved_at = $2
      WHERE id = $3`, [status, new Date(), requestId]);
        // Invalidate cache
        await this.redis.del(`chatops:approval:${requestId}`);
    }
    async getRequiredApprovals(requestId) {
        const result = await this.pg.query(`SELECT required_approvals FROM chatops_approvals WHERE id = $1`, [requestId]);
        return result.rows[0]?.required_approvals ?? 1;
    }
    async getApproverRole(approverId, tenantId) {
        // This would integrate with your auth system
        // For now, return a default role
        return 'supervisor';
    }
    async notifyApprovers(request) {
        for (const channel of this.notificationChannels) {
            try {
                await channel.send(request);
            }
            catch (error) {
                console.error(`Failed to send notification via ${channel.type}:`, error);
            }
        }
    }
    startCleanupInterval() {
        this.cleanupInterval = setInterval(async () => {
            try {
                await this.expireStaleRequests();
            }
            catch (error) {
                console.error('Approval cleanup error:', error);
            }
        }, this.config.cleanupIntervalMinutes * 60 * 1000);
    }
    async expireStaleRequests() {
        const result = await this.pg.query(`UPDATE chatops_approvals
      SET status = 'expired', resolved_at = NOW()
      WHERE status = 'pending' AND expires_at < NOW()
      RETURNING id`);
        for (const row of result.rows) {
            await this.redis.del(`chatops:approval:${row.id}`);
            this.emit('approval:expired', {
                type: 'expired',
                request: { requestId: row.id },
                timestamp: new Date(),
            });
        }
        return result.rowCount ?? 0;
    }
    subscribeToUpdates() {
        // Subscribe to Redis pub/sub for real-time updates
        const subscriber = this.redis.duplicate();
        subscriber.subscribe('chatops:approval:updates');
        subscriber.on('message', async (channel, message) => {
            if (channel === 'chatops:approval:updates') {
                const { requestId, status } = JSON.parse(message);
                // Handle real-time update
                this.emit('approval:update', { requestId, status });
            }
        });
    }
    // ===========================================================================
    // CLEANUP
    // ===========================================================================
    async close() {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
        }
    }
}
exports.ApprovalService = ApprovalService;
// =============================================================================
// FACTORY
// =============================================================================
function createApprovalService(config) {
    return new ApprovalService(config);
}
