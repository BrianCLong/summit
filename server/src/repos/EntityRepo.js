"use strict";
/**
 * Entity Repository - Production persistence layer
 * Replaces demo resolvers with PostgreSQL (canonical) + Neo4j (graph) dual-write
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EntityRepo = void 0;
const crypto_1 = require("crypto");
const logger_js_1 = __importDefault(require("../config/logger.js"));
const tenantScope_js_1 = require("../tenancy/tenantScope.js");
const neo4jBatchWriter_js_1 = require("../db/neo4jBatchWriter.js");
const repoLogger = logger_js_1.default.child({ name: 'EntityRepo' });
const ENTITY_COLUMNS = 'id, tenant_id, kind, labels, props, created_at, updated_at, created_by';
class EntityRepo {
    pg;
    neo4j;
    constructor(pg, neo4j) {
        this.pg = pg;
        this.neo4j = neo4j;
    }
    /**
     * Create new entity with dual-write to PG (canonical) + Neo4j (graph)
     */
    async create(input, userId) {
        const tenantId = (0, tenantScope_js_1.resolveTenantId)(input.tenantId, 'entity.create');
        const id = (0, crypto_1.randomUUID)();
        const client = await this.pg.connect();
        try {
            await client.query('BEGIN');
            // 1. Write to PostgreSQL (source of truth)
            const { rows } = (await client.query(`INSERT INTO entities (id, tenant_id, kind, labels, props, created_by)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING ${ENTITY_COLUMNS}`, [
                id,
                tenantId,
                input.kind,
                input.labels || [],
                JSON.stringify(input.props || {}),
                userId,
            ]));
            const entity = rows[0];
            // 2. Outbox event for Neo4j sync
            await client.query(`INSERT INTO outbox_events (id, topic, payload)
         VALUES ($1, $2, $3)`, [
                (0, crypto_1.randomUUID)(),
                'entity.upsert',
                JSON.stringify({ id: entity.id, tenantId: entity.tenant_id }),
            ]);
            await client.query('COMMIT');
            // 3. Queue Neo4j write (batched)
            try {
                (0, neo4jBatchWriter_js_1.getNeo4jBatchWriter)().queueCreateNode('Entity', {
                    id: entity.id,
                    kind: entity.kind,
                    labels: entity.labels,
                    props: entity.props,
                    createdAt: entity.created_at.toISOString(),
                    updatedAt: entity.updated_at.toISOString(),
                }, entity.tenant_id);
            }
            catch (neo4jError) {
                repoLogger.warn({ entityId: id, error: neo4jError }, 'Neo4j batch write queue failed, will retry via outbox');
            }
            return this.mapRow(entity);
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
     * Update entity with dual-write
     */
    async update(input) {
        const tenantId = (0, tenantScope_js_1.resolveTenantId)(input.tenantId, 'entity.update');
        const client = await this.pg.connect();
        try {
            await client.query('BEGIN');
            const updateFields = [];
            const params = [input.id];
            let paramIndex = 2;
            if (input.labels !== undefined) {
                updateFields.push(`labels = $${paramIndex}`);
                params.push(input.labels);
                paramIndex++;
            }
            if (input.props !== undefined) {
                updateFields.push(`props = $${paramIndex}`);
                params.push(JSON.stringify(input.props));
                paramIndex++;
            }
            updateFields.push(`updated_at = now()`);
            const tenantParamIndex = paramIndex;
            params.push(tenantId);
            const { rows } = (await client.query((0, tenantScope_js_1.appendTenantFilter)(`UPDATE entities SET ${updateFields.join(', ')}
           WHERE id = $1`, tenantParamIndex), params));
            if (rows.length === 0) {
                await client.query('ROLLBACK');
                return null;
            }
            const entity = rows[0];
            (0, tenantScope_js_1.assertTenantMatch)(entity.tenant_id, tenantId, 'entity');
            // Outbox event for Neo4j sync
            await client.query(`INSERT INTO outbox_events (id, topic, payload)
         VALUES ($1, $2, $3)`, [
                (0, crypto_1.randomUUID)(),
                'entity.upsert',
                JSON.stringify({ id: entity.id, tenantId: entity.tenant_id }),
            ]);
            await client.query('COMMIT');
            // Best effort Neo4j update
            try {
                await this.upsertNeo4jNode({
                    id: entity.id,
                    tenantId: entity.tenant_id,
                    kind: entity.kind,
                    labels: entity.labels,
                    props: entity.props,
                });
            }
            catch (neo4jError) {
                repoLogger.warn({ entityId: input.id, error: neo4jError }, 'Neo4j update failed, will retry via outbox');
            }
            return this.mapRow(entity);
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
     * Delete entity with dual-write
     */
    async delete(id, tenantId) {
        const scopedTenantId = (0, tenantScope_js_1.resolveTenantId)(tenantId, 'entity.delete');
        const client = await this.pg.connect();
        try {
            await client.query('BEGIN');
            const { rows } = await client.query(`DELETE FROM entities WHERE id = $1 AND tenant_id = $2 RETURNING tenant_id`, [id, scopedTenantId]);
            if (rows.length > 0) {
                (0, tenantScope_js_1.assertTenantMatch)(rows[0].tenant_id, scopedTenantId, 'entity');
                // Outbox event for Neo4j cleanup
                await client.query(`INSERT INTO outbox_events (id, topic, payload)
           VALUES ($1, $2, $3)`, [
                    (0, crypto_1.randomUUID)(),
                    'entity.delete',
                    JSON.stringify({ id, tenantId: scopedTenantId }),
                ]);
                await client.query('COMMIT');
                // Queue Neo4j delete (batched)
                try {
                    (0, neo4jBatchWriter_js_1.getNeo4jBatchWriter)().queueDeleteNode(id, scopedTenantId);
                }
                catch (neo4jError) {
                    repoLogger.warn({ entityId: id, error: neo4jError }, 'Neo4j batch delete queue failed, will retry via outbox');
                }
                return true;
            }
            else {
                await client.query('ROLLBACK');
                return false;
            }
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
     * Find entity by ID
     */
    async findById(id, tenantId) {
        const scopedTenantId = (0, tenantScope_js_1.resolveTenantId)(tenantId, 'entity.findById');
        const { rows } = (await this.pg.query((0, tenantScope_js_1.appendTenantFilter)(`SELECT ${ENTITY_COLUMNS} FROM entities WHERE id = $1`, 2), [id, scopedTenantId]));
        if (!rows[0]) {
            return null;
        }
        (0, tenantScope_js_1.assertTenantMatch)(rows[0].tenant_id, scopedTenantId, 'entity');
        return this.mapRow(rows[0]);
    }
    /**
     * Search entities with filters
     */
    async search({ tenantId, kind, props, limit = 100, offset = 0, }) {
        const scopedTenantId = (0, tenantScope_js_1.resolveTenantId)(tenantId, 'entity.search');
        const params = [scopedTenantId];
        let query = `SELECT ${ENTITY_COLUMNS} FROM entities WHERE tenant_id = $1`;
        let paramIndex = 2;
        if (kind) {
            query += ` AND kind = $${paramIndex}`;
            params.push(kind);
            paramIndex++;
        }
        if (props) {
            query += ` AND props @> $${paramIndex}::jsonb`;
            params.push(JSON.stringify(props));
            paramIndex++;
        }
        query += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
        params.push(Math.min(limit, 1000), offset); // Cap at 1000 for safety
        const { rows } = (await this.pg.query(query, params));
        return rows.map((row) => {
            (0, tenantScope_js_1.assertTenantMatch)(row.tenant_id, scopedTenantId, 'entity');
            return this.mapRow(row);
        });
    }
    /**
     * Batch load entities by IDs (for DataLoader)
     */
    async batchByIds(ids, tenantId) {
        if (ids.length === 0)
            return [];
        const scopedTenantId = (0, tenantScope_js_1.resolveTenantId)(tenantId, 'entity.batchByIds');
        const params = [ids, scopedTenantId];
        const query = (0, tenantScope_js_1.appendTenantFilter)(`SELECT ${ENTITY_COLUMNS} FROM entities WHERE id = ANY($1)`, 2);
        const { rows } = (await this.pg.query(query, params));
        const scopedEntities = rows.map((row) => {
            (0, tenantScope_js_1.assertTenantMatch)(row.tenant_id, scopedTenantId, 'entity');
            return this.mapRow(row);
        });
        const entitiesMap = new Map(scopedEntities.map((entity) => [entity.id, entity]));
        return ids.map((id) => entitiesMap.get(id) || null);
    }
    /**
     * Upsert entity node in Neo4j (idempotent)
     */
    async upsertNeo4jNode({ id, tenantId, kind, labels, props, }) {
        const session = this.neo4j.session();
        try {
            await session.executeWrite(async (tx) => {
                await tx.run(`MERGE (e:Entity {id: $id})
           ON CREATE SET e.createdAt = timestamp()
           SET e.tenantId = $tenantId,
               e.kind = $kind,
               e.labels = $labels,
               e.props = $props,
               e.updatedAt = timestamp()`, { id, tenantId, kind, labels, props });
            });
        }
        finally {
            await session.close();
        }
    }
    /**
     * Delete entity node from Neo4j
     */
    async deleteNeo4jNode(id) {
        const session = this.neo4j.session();
        try {
            await session.executeWrite(async (tx) => {
                await tx.run(`MATCH (e:Entity {id: $id})
           DETACH DELETE e`, { id });
            });
        }
        finally {
            await session.close();
        }
    }
    /**
     * Map database row to domain object
     */
    mapRow(row) {
        return {
            id: row.id,
            tenantId: row.tenant_id,
            kind: row.kind,
            labels: row.labels,
            props: row.props,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
            createdBy: row.created_by,
        };
    }
}
exports.EntityRepo = EntityRepo;
