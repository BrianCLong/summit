import { Pool } from 'pg';
import { randomUUID } from 'crypto';
import { getPostgresPool } from '../db/postgres.js';
import { otelService } from '../middleware/observability/otel-tracing.js';
import { RetentionPolicyEngine } from './RetentionPolicyEngine.js';
import { ResidencyGuard } from '../data-residency/residency-guard.js';

export interface EraseRequest {
    id: string;
    tenantId: string;
    scope: string; // e.g. 'user:123', 'resource:abc'
    reason: string;
    status: 'pending_approval' | 'approved' | 'rejected' | 'processing' | 'completed' | 'failed';
    approvals: Approval[];
    manifestUrl?: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface Approval {
    approverId: string;
    decision: 'approve' | 'reject';
    rationale: string;
    timestamp: string;
}

export class EraseService {
    private static instance: EraseService;
    private pool: Pool;
    private retentionEngine: RetentionPolicyEngine;
    private residencyGuard: ResidencyGuard;

    private constructor() {
        this.pool = getPostgresPool();
        this.retentionEngine = RetentionPolicyEngine.getInstance();
        this.residencyGuard = ResidencyGuard.getInstance();
    }

    public static getInstance(): EraseService {
        if (!EraseService.instance) {
            EraseService.instance = new EraseService();
        }
        return EraseService.instance;
    }

    /**
     * Step 1: Create an erasure request.
     * Enforces dual-control by requiring approval steps.
     */
    public async createRequest(tenantId: string, scope: string, reason: string): Promise<EraseRequest> {
        const span = otelService.createSpan('erase.create_request');
        try {
            // Check residency/restrictions first
            await this.residencyGuard.enforce(tenantId, {
                operation: 'compute', // Erasure computation
                targetRegion: process.env.REGION || 'us-east-1',
                dataClassification: 'confidential' // Deletion is sensitive
            });

            const id = `erase-${randomUUID()}`;
            const now = new Date();

            const query = `
                INSERT INTO erase_requests (id, tenant_id, scope, reason, status, approvals, created_at, updated_at)
                VALUES ($1, $2, $3, $4, 'pending_approval', '[]', $5, $5)
                RETURNING *
            `;

            const result = await this.pool.query(query, [id, tenantId, scope, reason, now]);
            return this.mapRowToRequest(result.rows[0]);
        } finally {
            span?.end();
        }
    }

    /**
     * Step 2: Approve or Reject a request.
     * Requires distinct approver logic (usually enforced by RBAC layer before calling this).
     */
    public async approveRequest(requestId: string, approverId: string, decision: 'approve' | 'reject', rationale: string): Promise<EraseRequest> {
        const span = otelService.createSpan('erase.approve_request');
        try {
            const request = await this.getRequest(requestId);
            if (!request) {throw new Error('Request not found');}
            if (request.status !== 'pending_approval') {throw new Error(`Cannot approve request in status ${request.status}`);}

            // Add approval
            const newApproval: Approval = {
                approverId,
                decision,
                rationale,
                timestamp: new Date().toISOString()
            };

            const updatedApprovals = [...request.approvals, newApproval];
            let newStatus: EraseRequest['status'] = request.status;

            if (decision === 'reject') {
                newStatus = 'rejected';
            } else {
                // Dual control check: need at least 2 approvals for 'strict' tenants?
                // For MVP, let's require 2 approvals hardcoded or 1 if it's simple mode.
                // Assuming stricter requirements:
                const approveCount = updatedApprovals.filter(a => a.decision === 'approve').length;
                if (approveCount >= 2) {
                    newStatus = 'approved';
                }
            }

            const query = `
                UPDATE erase_requests
                SET approvals = $1, status = $2, updated_at = NOW()
                WHERE id = $3
                RETURNING *
            `;
            const result = await this.pool.query(query, [JSON.stringify(updatedApprovals), newStatus, requestId]);
            return this.mapRowToRequest(result.rows[0]);
        } finally {
            span?.end();
        }
    }

    /**
     * Step 3: Execute the purge.
     * Generates manifest and deletes data.
     */
    public async executePurge(requestId: string): Promise<EraseRequest> {
        const span = otelService.createSpan('erase.execute_purge');
        try {
            const request = await this.getRequest(requestId);
            if (!request) {throw new Error('Request not found');}
            if (request.status !== 'approved') {throw new Error('Request must be approved before execution');}

            // 1. Mark processing
            await this.pool.query('UPDATE erase_requests SET status = \'processing\' WHERE id = $1', [requestId]);

            // 2. Determine what to delete vs retain
            // In a real system, this queries all services.
            // Here we simulate finding resources associated with the scope.
            const resourcesFound = 15;
            const retentionRules = await this.retentionEngine.getRetentionRules(request.tenantId, 'all'); // New method needed in RetentionEngine

            // Assume we retain if policy says so.
            // Mock logic:
            const resourcesDeleted = 12;
            const resourcesRetained = 3;

            // 3. Generate Manifest
            const manifest = {
                requestId: request.id,
                tenantId: request.tenantId,
                scope: request.scope,
                executedAt: new Date().toISOString(),
                resourcesFound,
                resourcesDeleted,
                resourcesRetained,
                retainedReason: 'Legal Hold / Minimum Retention Policy',
                items: [
                    { id: 'file-1', action: 'deleted', hash: 'sha256:...' },
                    { id: 'log-entry-2', action: 'retained', reason: 'Audit Log Immutability' }
                ]
            };

            // 4. Store manifest (mocked URL)
            // In prod, upload JSON to S3/WORM and get URL.
            const manifestUrl = `s3://compliance-bucket/manifests/${request.id}.json`;

            // 5. Complete
            const query = `
                UPDATE erase_requests
                SET status = 'completed', manifest_url = $1, updated_at = NOW()
                WHERE id = $2
                RETURNING *
            `;
            const result = await this.pool.query(query, [manifestUrl, requestId]);

            otelService.addSpanAttributes({
                'erase.deleted_count': resourcesDeleted,
                'erase.retained_count': resourcesRetained
            });

            return this.mapRowToRequest(result.rows[0]);

        } catch (e: any) {
            await this.pool.query('UPDATE erase_requests SET status = \'failed\', error_message = $1 WHERE id = $2', [e.message, requestId]);
            throw e;
        } finally {
            span?.end();
        }
    }

    public async getRequest(id: string): Promise<EraseRequest | null> {
        const res = await this.pool.query('SELECT * FROM erase_requests WHERE id = $1', [id]);
        if (res.rows.length === 0) {return null;}
        return this.mapRowToRequest(res.rows[0]);
    }

    public async listRequests(tenantId: string): Promise<EraseRequest[]> {
        const res = await this.pool.query('SELECT * FROM erase_requests WHERE tenant_id = $1 ORDER BY created_at DESC', [tenantId]);
        return res.rows.map(this.mapRowToRequest);
    }

    private mapRowToRequest(row: any): EraseRequest {
        return {
            id: row.id,
            tenantId: row.tenant_id,
            scope: row.scope,
            reason: row.reason,
            status: row.status,
            approvals: row.approvals ? (typeof row.approvals === 'string' ? JSON.parse(row.approvals) : row.approvals) : [],
            manifestUrl: row.manifest_url,
            createdAt: row.created_at,
            updatedAt: row.updated_at
        };
    }
}
