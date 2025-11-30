import { Pool } from 'pg';
import { getPostgresPool } from '../config/database.js';

interface ResidencyRequest {
    id: string;
    tenantId: string;
    requestedRegion: string;
    status: string;
    createdAt: Date;
}

export class TenantAdminService {
    private pool: Pool;

    constructor() {
        this.pool = getPostgresPool();
    }

    public async getPlan(tenantId: string) {
        const res = await this.pool.query(
            'SELECT plan_id, status FROM tenant_plans WHERE tenant_id = $1',
            [tenantId]
        );
        return res.rows[0] || { plan_id: 'starter', status: 'active' }; // Default
    }

    public async updatePlan(tenantId: string, planId: string) {
        await this.pool.query(
            `INSERT INTO tenant_plans (tenant_id, plan_id) VALUES ($1, $2)
             ON CONFLICT (tenant_id) DO UPDATE SET plan_id = EXCLUDED.plan_id, updated_at = NOW()`,
            [tenantId, planId]
        );
        // Audit log
        await this.logAudit(tenantId, 'update_plan', { planId });
    }

    public async requestResidencyChange(tenantId: string, region: string, reason?: string) {
        const res = await this.pool.query(
            `INSERT INTO residency_requests (tenant_id, requested_region, reason)
             VALUES ($1, $2, $3) RETURNING *`,
            [tenantId, region, reason]
        );
        await this.logAudit(tenantId, 'request_residency', { region, reason });
        return res.rows[0];
    }

    public async getResidencyRequests(tenantId: string) {
        const res = await this.pool.query(
            'SELECT * FROM residency_requests WHERE tenant_id = $1 ORDER BY created_at DESC',
            [tenantId]
        );
        return res.rows;
    }

    private async logAudit(tenantId: string, action: string, details: any) {
         await this.pool.query(
            `INSERT INTO audit_logs (action, resource_type, resource_id, details, tenant_id)
             VALUES ($1, $2, $3, $4, $5)`,
            [action, 'Tenant', tenantId, details, tenantId]
        );
    }
}
