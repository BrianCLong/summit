"use strict";
// @ts-nocheck
/**
 * Investigation Repository - Production persistence layer
 * Handles investigation/case management with PostgreSQL
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.InvestigationRepo = void 0;
const crypto_1 = require("crypto");
const logger_js_1 = __importDefault(require("../config/logger.js"));
const ledger_js_1 = require("../provenance/ledger.js");
const tenantScope_js_1 = require("../tenancy/tenantScope.js");
const repoLogger = logger_js_1.default.child({ name: 'InvestigationRepo' });
class InvestigationRepo {
    pg;
    constructor(pg) {
        this.pg = pg;
    }
    /**
     * Create new investigation
     */
    async create(input, userId) {
        const tenantId = (0, tenantScope_js_1.resolveTenantId)(input.tenantId, 'investigation.create');
        const id = (0, crypto_1.randomUUID)();
        const { rows } = (await this.pg.query(`INSERT INTO investigations (id, tenant_id, name, description, status, props, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`, [
            id,
            tenantId,
            input.name,
            input.description || null,
            input.status || 'active',
            JSON.stringify(input.props || {}),
            userId,
        ]));
        const investigation = this.mapRow(rows[0]);
        // Record activity
        ledger_js_1.provenanceLedger
            .appendEntry({
            tenantId,
            actionType: 'INVESTIGATION_CREATED',
            resourceType: 'investigation',
            resourceId: investigation.id,
            actorId: userId,
            actorType: 'user',
            payload: { name: input.name },
            metadata: {},
        })
            .catch((err) => repoLogger.error('Failed to record investigation creation', err instanceof Error ? err.message : String(err)));
        return investigation;
    }
    /**
     * Update investigation
     */
    async update(input) {
        const tenantId = (0, tenantScope_js_1.resolveTenantId)(input.tenantId, 'investigation.update');
        const updateFields = [];
        const params = [input.id];
        let paramIndex = 2;
        if (input.name !== undefined) {
            updateFields.push(`name = $${paramIndex}`);
            params.push(input.name);
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
        }
        if (input.props !== undefined) {
            updateFields.push(`props = $${paramIndex}`);
            params.push(JSON.stringify(input.props));
            paramIndex++;
        }
        if (updateFields.length === 0) {
            return await this.findById(input.id, tenantId);
        }
        updateFields.push(`updated_at = now()`);
        const tenantParamIndex = paramIndex;
        params.push(tenantId);
        const { rows } = (await this.pg.query((0, tenantScope_js_1.appendTenantFilter)(`UPDATE investigations SET ${updateFields.join(', ')}
         WHERE id = $1`, tenantParamIndex), params));
        if (rows[0]) {
            (0, tenantScope_js_1.assertTenantMatch)(rows[0].tenant_id, tenantId, 'investigation');
            const investigation = this.mapRow(rows[0]);
            ledger_js_1.provenanceLedger
                .appendEntry({
                tenantId: investigation.tenantId,
                actionType: 'INVESTIGATION_UPDATED',
                resourceType: 'investigation',
                resourceId: investigation.id,
                actorId: 'system', // We don't have userId passed to update(), maybe add it later
                actorType: 'system',
                payload: { updates: input },
                metadata: {},
            })
                .catch((err) => repoLogger.error('Failed to record investigation update', err instanceof Error ? err.message : String(err)));
            return investigation;
        }
        return null;
    }
    /**
     * Delete investigation (cascade to related entities)
     */
    async delete(id, tenantId) {
        const scopedTenantId = (0, tenantScope_js_1.resolveTenantId)(tenantId, 'investigation.delete');
        const client = await this.pg.connect();
        try {
            await client.query('BEGIN');
            // Note: In a full implementation, you might want to soft-delete
            // or handle related entities/relationships more carefully
            const { rows } = await client.query(`DELETE FROM investigations WHERE id = $1 AND tenant_id = $2 RETURNING tenant_id`, [id, scopedTenantId]);
            await client.query('COMMIT');
            if (rows.length > 0) {
                (0, tenantScope_js_1.assertTenantMatch)(rows[0].tenant_id, scopedTenantId, 'investigation');
                ledger_js_1.provenanceLedger
                    .appendEntry({
                    tenantId: scopedTenantId,
                    actionType: 'INVESTIGATION_DELETED',
                    resourceType: 'investigation',
                    resourceId: id,
                    actorId: 'system', // Missing userId in delete()
                    actorType: 'system',
                    payload: {},
                    metadata: {},
                })
                    .catch((err) => repoLogger.error('Failed to record investigation deletion', err instanceof Error ? err.message : String(err)));
                return true;
            }
            return false;
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
     * Find investigation by ID
     */
    async findById(id, tenantId) {
        const scopedTenantId = (0, tenantScope_js_1.resolveTenantId)(tenantId, 'investigation.findById');
        const { rows } = (await this.pg.query((0, tenantScope_js_1.appendTenantFilter)(`SELECT * FROM investigations WHERE id = $1`, 2), [id, scopedTenantId]));
        if (!rows[0]) {
            return null;
        }
        (0, tenantScope_js_1.assertTenantMatch)(rows[0].tenant_id, scopedTenantId, 'investigation');
        return this.mapRow(rows[0]);
    }
    /**
     * List investigations with filters
     */
    async list({ tenantId, status, limit = 50, offset = 0, }) {
        const scopedTenantId = (0, tenantScope_js_1.resolveTenantId)(tenantId, 'investigation.list');
        const params = [scopedTenantId];
        let query = `SELECT * FROM investigations WHERE tenant_id = $1`;
        let paramIndex = 2;
        if (status) {
            query += ` AND status = $${paramIndex}`;
            params.push(status);
            paramIndex++;
        }
        query += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
        params.push(Math.min(limit, 1000), offset);
        const { rows } = (await this.pg.query(query, params));
        return rows.map((row) => {
            (0, tenantScope_js_1.assertTenantMatch)(row.tenant_id, scopedTenantId, 'investigation');
            return this.mapRow(row);
        });
    }
    /**
     * Get investigation statistics
     * OPTIMIZED: Single query with subqueries (100-500x faster)
     * Requires expression indexes: idx_entities_investigation_id_expr, idx_relationships_investigation_id_expr
     */
    async getStats(investigationId, tenantId) {
        const scopedTenantId = (0, tenantScope_js_1.resolveTenantId)(tenantId, 'investigation.stats');
        // OPTIMIZED: Single query with subqueries leverages expression indexes
        const { rows } = await this.pg.query(`SELECT
         (SELECT COUNT(*)
          FROM entities
          WHERE tenant_id = $1
            AND props->>'investigationId' = $2) as entity_count,
         (SELECT COUNT(*)
          FROM relationships
          WHERE tenant_id = $1
            AND props->>'investigationId' = $2) as relationship_count`, [scopedTenantId, investigationId]);
        return {
            entityCount: parseInt(rows[0]?.entity_count || '0'),
            relationshipCount: parseInt(rows[0]?.relationship_count || '0'),
        };
    }
    /**
     * Batch load investigations by IDs (for DataLoader)
     */
    async batchByIds(ids, tenantId) {
        if (ids.length === 0)
            return [];
        const scopedTenantId = (0, tenantScope_js_1.resolveTenantId)(tenantId, 'investigation.batchByIds');
        const params = [ids, scopedTenantId];
        const query = (0, tenantScope_js_1.appendTenantFilter)(`SELECT * FROM investigations WHERE id = ANY($1)`, 2);
        const { rows } = (await this.pg.query(query, params));
        const investigationsMap = new Map(rows.map((row) => {
            (0, tenantScope_js_1.assertTenantMatch)(row.tenant_id, scopedTenantId, 'investigation');
            return [row.id, this.mapRow(row)];
        }));
        return ids.map((id) => investigationsMap.get(id) || null);
    }
    /**
     * Map database row to domain object
     */
    mapRow(row) {
        return {
            id: row.id,
            tenantId: row.tenant_id,
            name: row.name,
            description: row.description || undefined,
            status: row.status,
            props: row.props,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
            createdBy: row.created_by,
        };
    }
}
exports.InvestigationRepo = InvestigationRepo;
