"use strict";
/**
 * Case Repository - Case Spaces management with compartmentalization
 * Handles CRUD operations for cases with policy-based access control
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CaseRepo = void 0;
const crypto_1 = require("crypto");
const logger_js_1 = __importDefault(require("../config/logger.js"));
const repoLogger = logger_js_1.default.child({ name: 'CaseRepo' });
class CaseRepo {
    pg;
    constructor(pg) {
        this.pg = pg;
    }
    /**
     * Create a new case
     */
    async create(input, userId) {
        const id = (0, crypto_1.randomUUID)();
        const { rows } = (await this.pg.query(`INSERT INTO maestro.cases (
        id, tenant_id, title, description, status, priority, compartment,
        policy_labels, metadata, created_by
      )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`, [
            id,
            input.tenantId,
            input.title,
            input.description || null,
            input.status || 'open',
            input.priority || 'medium',
            input.compartment || null,
            input.policyLabels || [],
            JSON.stringify(input.metadata || {}),
            userId,
        ]));
        repoLogger.info({
            caseId: id,
            tenantId: input.tenantId,
            title: input.title,
            compartment: input.compartment,
        }, 'Case created');
        return this.mapRow(rows[0]);
    }
    /**
     * Update an existing case
     */
    async update(input, userId) {
        const updateFields = [];
        const params = [input.id];
        let paramIndex = 2;
        if (input.title !== undefined) {
            updateFields.push(`title = $${paramIndex}`);
            params.push(input.title);
            paramIndex++;
        }
        if (input.description !== undefined) {
            updateFields.push(`description = $${paramIndex}`);
            params.push(input.description);
            paramIndex++;
        }
        if (input.status !== undefined) {
            updateFields.push(`status = $${paramIndex}`);
            params.push(input.status);
            paramIndex++;
            // Auto-set closed_at and closed_by when status changes to 'closed'
            if (input.status === 'closed' && userId) {
                updateFields.push(`closed_at = NOW()`);
                updateFields.push(`closed_by = $${paramIndex}`);
                params.push(userId);
                paramIndex++;
            }
        }
        if (input.priority !== undefined) {
            updateFields.push(`priority = $${paramIndex}`);
            params.push(input.priority);
            paramIndex++;
        }
        if (input.compartment !== undefined) {
            updateFields.push(`compartment = $${paramIndex}`);
            params.push(input.compartment);
            paramIndex++;
        }
        if (input.policyLabels !== undefined) {
            updateFields.push(`policy_labels = $${paramIndex}`);
            params.push(input.policyLabels);
            paramIndex++;
        }
        if (input.metadata !== undefined) {
            updateFields.push(`metadata = $${paramIndex}`);
            params.push(JSON.stringify(input.metadata));
            paramIndex++;
        }
        if (updateFields.length === 0) {
            return await this.findById(input.id);
        }
        updateFields.push(`updated_at = NOW()`);
        const { rows } = (await this.pg.query(`UPDATE maestro.cases SET ${updateFields.join(', ')}
       WHERE id = $1
       RETURNING *`, params));
        if (rows[0]) {
            repoLogger.info({
                caseId: input.id,
                updatedFields: Object.keys(input).filter((k) => k !== 'id'),
            }, 'Case updated');
        }
        return rows[0] ? this.mapRow(rows[0]) : null;
    }
    /**
     * Delete a case (soft delete by archiving recommended, but hard delete supported)
     */
    async delete(id) {
        const client = await this.pg.connect();
        try {
            await client.query('BEGIN');
            // Check if case has audit logs (should not delete if it does)
            const { rows: auditLogs } = await client.query(`SELECT id FROM maestro.audit_access_logs WHERE case_id = $1 LIMIT 1`, [id]);
            if (auditLogs.length > 0) {
                throw new Error('Cannot delete case with existing audit logs. Archive the case instead.');
            }
            const { rowCount } = await client.query(`DELETE FROM maestro.cases WHERE id = $1`, [id]);
            await client.query('COMMIT');
            if (rowCount && rowCount > 0) {
                repoLogger.warn({ caseId: id }, 'Case deleted');
            }
            return rowCount !== null && rowCount > 0;
        }
        catch (error) {
            await client.query('ROLLBACK');
            throw error;
        }
        finally {
            client.release();
        }
    }
    /**
     * Archive a case (soft delete - preferred method)
     */
    async archive(id, userId) {
        return this.update({ id, status: 'archived' }, userId);
    }
    /**
     * Find case by ID
     */
    async findById(id, tenantId) {
        const params = [id];
        let query = `SELECT * FROM maestro.cases WHERE id = $1`;
        if (tenantId) {
            query += ` AND tenant_id = $2`;
            params.push(tenantId);
        }
        const { rows } = (await this.pg.query(query, params));
        return rows[0] ? this.mapRow(rows[0]) : null;
    }
    /**
     * List cases with filters
     */
    async list({ tenantId, status, compartment, policyLabels, limit = 50, offset = 0, }) {
        const params = [tenantId];
        let query = `SELECT * FROM maestro.cases WHERE tenant_id = $1`;
        let paramIndex = 2;
        if (status) {
            query += ` AND status = $${paramIndex}`;
            params.push(status);
            paramIndex++;
        }
        if (compartment) {
            query += ` AND compartment = $${paramIndex}`;
            params.push(compartment);
            paramIndex++;
        }
        if (policyLabels && policyLabels.length > 0) {
            query += ` AND policy_labels && $${paramIndex}`;
            params.push(policyLabels);
            paramIndex++;
        }
        query += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
        params.push(Math.min(limit, 1000), offset);
        const { rows } = (await this.pg.query(query, params));
        return rows.map(this.mapRow);
    }
    /**
     * Count cases with filters
     */
    async count({ tenantId, status, compartment, policyLabels, }) {
        const params = [tenantId];
        let query = `SELECT COUNT(*) as count FROM maestro.cases WHERE tenant_id = $1`;
        let paramIndex = 2;
        if (status) {
            query += ` AND status = $${paramIndex}`;
            params.push(status);
            paramIndex++;
        }
        if (compartment) {
            query += ` AND compartment = $${paramIndex}`;
            params.push(compartment);
            paramIndex++;
        }
        if (policyLabels && policyLabels.length > 0) {
            query += ` AND policy_labels && $${paramIndex}`;
            params.push(policyLabels);
            paramIndex++;
        }
        const { rows } = await this.pg.query(query, params);
        return parseInt(rows[0]?.count || '0', 10);
    }
    /**
     * Batch load cases by IDs (for DataLoader)
     */
    async batchByIds(ids, tenantId) {
        if (ids.length === 0)
            return [];
        const params = [ids];
        let query = `SELECT * FROM maestro.cases WHERE id = ANY($1)`;
        if (tenantId) {
            query += ` AND tenant_id = $2`;
            params.push(tenantId);
        }
        const { rows } = (await this.pg.query(query, params));
        const casesMap = new Map(rows.map((row) => [row.id, this.mapRow(row)]));
        return ids.map((id) => casesMap.get(id) || null);
    }
    /**
     * Get cases by policy label
     */
    async findByPolicyLabel(tenantId, policyLabel, limit = 50) {
        const { rows } = (await this.pg.query(`SELECT * FROM maestro.cases
       WHERE tenant_id = $1 AND $2 = ANY(policy_labels)
       ORDER BY created_at DESC
       LIMIT $3`, [tenantId, policyLabel, limit]));
        return rows.map(this.mapRow);
    }
    /**
     * Map database row to domain object
     */
    /**
     * Upsert a case tab
     */
    async upsertTab(caseId, tab) {
        const { rows } = await this.pg.query(`INSERT INTO maestro.case_tabs (id, case_id, name, state, updated_at)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (id) DO UPDATE SET
         name = EXCLUDED.name,
         state = EXCLUDED.state,
         updated_at = NOW()
       RETURNING *`, [tab.id, caseId, tab.name, JSON.stringify(tab.state)]);
        return this.mapTabRow(rows[0]);
    }
    /**
     * Get all tabs for a case
     */
    async getTabs(caseId) {
        const { rows } = await this.pg.query(`SELECT * FROM maestro.case_tabs WHERE case_id = $1 ORDER BY created_at ASC`, [caseId]);
        return rows.map(this.mapTabRow);
    }
    /**
     * Delete a case tab
     */
    async deleteTab(caseId, tabId) {
        const { rowCount } = await this.pg.query(`DELETE FROM maestro.case_tabs WHERE case_id = $1 AND id = $2`, [caseId, tabId]);
        return (rowCount || 0) > 0;
    }
    mapTabRow(row) {
        return {
            id: row.id,
            caseId: row.case_id,
            name: row.name,
            state: row.state,
            updatedAt: row.updated_at,
            createdAt: row.created_at,
        };
    }
    mapRow(row) {
        return {
            id: row.id,
            tenantId: row.tenant_id,
            title: row.title,
            description: row.description || undefined,
            status: row.status,
            priority: row.priority,
            compartment: row.compartment || undefined,
            policyLabels: row.policy_labels || [],
            metadata: row.metadata || {},
            createdAt: row.created_at,
            updatedAt: row.updated_at,
            createdBy: row.created_by,
            closedAt: row.closed_at || undefined,
            closedBy: row.closed_by || undefined,
        };
    }
}
exports.CaseRepo = CaseRepo;
