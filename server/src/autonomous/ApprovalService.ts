import { Pool } from 'pg';
import { Logger } from 'pino';
import { randomUUID } from 'crypto';
import { z } from 'zod';

export interface Action {
    type: string;
    payload: any;
    tenantId: string;
    reason: string;
}

export interface ApprovalRequest {
    id: string;
    action: Action;
    status: 'pending' | 'approved' | 'rejected' | 'expired';
    requestedAt: Date;
    expiresAt: Date;
    respondedAt?: Date;
    respondedBy?: string;
    responseReason?: string;
}

const ActionSchema = z.object({
    type: z.string(),
    payload: z.any(),
    tenantId: z.string(),
    reason: z.string(),
});

export class ApprovalService {
    private db: Pool;
    private logger: Logger;

    constructor(db: Pool, logger: Logger) {
        this.db = db;
        this.logger = logger;
    }

    /**
     * Creates a new approval request for a given action.
     * Actions are persisted to the database.
     */
    async requestApproval(action: Action, ttlMinutes: number = 60): Promise<string> {
        const validation = ActionSchema.safeParse(action);
        if (!validation.success) {
            throw new Error(`Invalid action: ${validation.error.message}`);
        }

        const id = randomUUID();
        const now = new Date();
        const expiresAt = new Date(now.getTime() + ttlMinutes * 60 * 1000);

        try {
            await this.db.query(
                `INSERT INTO autonomous_approvals
                (id, tenant_id, action_type, payload, status, reason, requested_at, expires_at)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
                [
                    id,
                    action.tenantId,
                    action.type,
                    JSON.stringify(action.payload),
                    'pending',
                    action.reason,
                    now,
                    expiresAt
                ]
            );

            this.logger.info({ id, action: action.type, tenantId: action.tenantId }, 'Approval requested');
            return id;
        } catch (error: any) {
            this.logger.error({ error, action }, 'Failed to create approval request');
            throw error;
        }
    }

    /**
     * Retrieves all pending approvals for a tenant.
     */
    async getPendingApprovals(tenantId: string): Promise<ApprovalRequest[]> {
        const result = await this.db.query(
            `SELECT id, tenant_id, action_type, payload, status, reason, requested_at, expires_at
             FROM autonomous_approvals
             WHERE tenant_id = $1 AND status = 'pending' AND expires_at > NOW()`,
            [tenantId]
        );

        return result.rows.map((row: { id: string; action_type: string; payload: unknown; tenant_id: string; reason: string; status: string; requested_at: Date; expires_at: Date }) => ({
            id: row.id,
            action: {
                type: row.action_type,
                payload: row.payload,
                tenantId: row.tenant_id,
                reason: row.reason
            },
            status: row.status as ApprovalRequest['status'],
            requestedAt: row.requested_at,
            expiresAt: row.expires_at
        }));
    }

    /**
     * Approves a request.
     */
    async approve(id: string, userId: string, reason?: string): Promise<void> {
        await this.respond(id, 'approved', userId, reason);
    }

    /**
     * Rejects a request.
     */
    async reject(id: string, userId: string, reason?: string): Promise<void> {
        await this.respond(id, 'rejected', userId, reason);
    }

    private async respond(id: string, status: 'approved' | 'rejected', userId: string, reason?: string): Promise<void> {
        const result = await this.db.query(
            `UPDATE autonomous_approvals
             SET status = $1, responded_at = NOW(), responded_by = $2, response_reason = $3
             WHERE id = $4 AND status = 'pending' AND expires_at > NOW()`,
            [status, userId, reason, id]
        );

        if (result.rowCount === 0) {
            throw new Error('Approval request not found, expired, or already processed');
        }

        this.logger.info({ id, status, userId }, 'Approval request processed');
    }

    /**
     * Initialize the database table if it doesn't exist.
     * In production this should be a migration.
     */
    async initSchema(): Promise<void> {
        await this.db.query(`
            CREATE TABLE IF NOT EXISTS autonomous_approvals (
                id UUID PRIMARY KEY,
                tenant_id VARCHAR(255) NOT NULL,
                action_type VARCHAR(255) NOT NULL,
                payload JSONB NOT NULL,
                status VARCHAR(50) NOT NULL,
                reason TEXT,
                requested_at TIMESTAMP WITH TIME ZONE NOT NULL,
                expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
                responded_at TIMESTAMP WITH TIME ZONE,
                responded_by VARCHAR(255),
                response_reason TEXT
            );
            CREATE INDEX IF NOT EXISTS idx_autonomous_approvals_tenant_status ON autonomous_approvals(tenant_id, status);
        `);
    }
}
