"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TenantAdminService = void 0;
const database_js_1 = require("../config/database.js");
class TenantAdminService {
    pool;
    constructor() {
        this.pool = (0, database_js_1.getPostgresPool)();
    }
    async getPlan(tenantId) {
        const res = await this.pool.query('SELECT plan_id, status FROM tenant_plans WHERE tenant_id = $1', [tenantId]);
        return res.rows[0] || { plan_id: 'starter', status: 'active' }; // Default
    }
    async updatePlan(tenantId, planId) {
        await this.pool.query(`INSERT INTO tenant_plans (tenant_id, plan_id) VALUES ($1, $2)
             ON CONFLICT (tenant_id) DO UPDATE SET plan_id = EXCLUDED.plan_id, updated_at = NOW()`, [tenantId, planId]);
        // Audit log
        await this.logAudit(tenantId, 'update_plan', { planId });
    }
    async requestResidencyChange(tenantId, region, reason) {
        const res = await this.pool.query(`INSERT INTO residency_requests (tenant_id, requested_region, reason)
             VALUES ($1, $2, $3) RETURNING *`, [tenantId, region, reason]);
        await this.logAudit(tenantId, 'request_residency', { region, reason });
        return res.rows[0];
    }
    async getResidencyRequests(tenantId) {
        const res = await this.pool.query('SELECT * FROM residency_requests WHERE tenant_id = $1 ORDER BY created_at DESC', [tenantId]);
        return res.rows;
    }
    async logAudit(tenantId, action, details) {
        await this.pool.query(`INSERT INTO audit_logs (action, resource_type, resource_id, details, tenant_id)
             VALUES ($1, $2, $3, $4, $5)`, [action, 'Tenant', tenantId, details, tenantId]);
    }
}
exports.TenantAdminService = TenantAdminService;
