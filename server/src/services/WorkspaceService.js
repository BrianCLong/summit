"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.workspaceService = exports.WorkspaceService = void 0;
const database_js_1 = require("../config/database.js");
class WorkspaceService {
    async createWorkspace(tenantId, userId, name, config) {
        const pool = (0, database_js_1.getPostgresPool)();
        const res = await pool.query(`INSERT INTO workspaces (tenant_id, user_id, name, config)
       VALUES ($1, $2, $3, $4)
       RETURNING id, tenant_id as "tenantId", user_id as "userId", name, config, created_at as "createdAt", updated_at as "updatedAt"`, [tenantId, userId, name, config]);
        return res.rows[0];
    }
    async getWorkspaces(tenantId, userId) {
        const pool = (0, database_js_1.getPostgresPool)();
        const res = await pool.query(`SELECT id, tenant_id as "tenantId", user_id as "userId", name, config, created_at as "createdAt", updated_at as "updatedAt"
       FROM workspaces
       WHERE tenant_id = $1 AND user_id = $2
       ORDER BY updated_at DESC`, [tenantId, userId]);
        return res.rows;
    }
    async updateWorkspace(tenantId, userId, workspaceId, updates) {
        const pool = (0, database_js_1.getPostgresPool)();
        const current = await this.getWorkspace(tenantId, userId, workspaceId);
        if (!current)
            return null;
        const name = updates.name || current.name;
        const config = updates.config || current.config;
        const res = await pool.query(`UPDATE workspaces
       SET name = $1, config = $2, updated_at = NOW()
       WHERE id = $3 AND tenant_id = $4 AND user_id = $5
       RETURNING id, tenant_id as "tenantId", user_id as "userId", name, config, created_at as "createdAt", updated_at as "updatedAt"`, [name, config, workspaceId, tenantId, userId]);
        return res.rows[0];
    }
    async getWorkspace(tenantId, userId, workspaceId) {
        const pool = (0, database_js_1.getPostgresPool)();
        const res = await pool.query(`SELECT id, tenant_id as "tenantId", user_id as "userId", name, config, created_at as "createdAt", updated_at as "updatedAt"
       FROM workspaces
       WHERE id = $1 AND tenant_id = $2 AND user_id = $3`, [workspaceId, tenantId, userId]);
        return res.rows[0] || null;
    }
    async deleteWorkspace(tenantId, userId, workspaceId) {
        const pool = (0, database_js_1.getPostgresPool)();
        const res = await pool.query(`DELETE FROM workspaces
       WHERE id = $1 AND tenant_id = $2 AND user_id = $3`, [workspaceId, tenantId, userId]);
        return (res.rowCount ?? 0) > 0;
    }
}
exports.WorkspaceService = WorkspaceService;
exports.workspaceService = new WorkspaceService();
