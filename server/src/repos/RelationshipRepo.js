"use strict";
/**
 * Relationship Repository - Production persistence layer
 * Handles relationships between entities with PostgreSQL + Neo4j dual-write
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RelationshipRepo = void 0;
const crypto_1 = require("crypto");
const logger_js_1 = __importDefault(require("../config/logger.js"));
const neo4jBatchWriter_js_1 = require("../db/neo4jBatchWriter.js");
const repoLogger = logger_js_1.default.child({ name: 'RelationshipRepo' });
const RELATIONSHIP_COLUMNS = 'id, tenant_id, src_id, dst_id, type, props, created_at, updated_at, created_by';
class RelationshipRepo {
    pg;
    neo4j;
    constructor(pg, neo4j) {
        this.pg = pg;
        this.neo4j = neo4j;
    }
    /**
     * Create new relationship with dual-write
     */
    async create(input, userId) {
        const id = (0, crypto_1.randomUUID)();
        const client = await this.pg.connect();
        try {
            await client.query('BEGIN');
            // 1. Verify both entities exist in PostgreSQL
            const { rows: srcCheck } = await client.query(`SELECT id FROM entities WHERE id = $1 AND tenant_id = $2`, [input.srcId, input.tenantId]);
            const { rows: dstCheck } = await client.query(`SELECT id FROM entities WHERE id = $1 AND tenant_id = $2`, [input.dstId, input.tenantId]);
            if (srcCheck.length === 0) {
                throw new Error(`Source entity ${input.srcId} not found`);
            }
            if (dstCheck.length === 0) {
                throw new Error(`Destination entity ${input.dstId} not found`);
            }
            // 2. Insert relationship
            const { rows } = (await client.query(`INSERT INTO relationships (id, tenant_id, src_id, dst_id, type, props, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`, [
                id,
                input.tenantId,
                input.srcId,
                input.dstId,
                input.type,
                JSON.stringify(input.props || {}),
                userId,
            ]));
            const relationship = rows[0];
            // 3. Outbox event for Neo4j sync
            await client.query(`INSERT INTO outbox_events (id, topic, payload)
         VALUES ($1, $2, $3)`, [
                (0, crypto_1.randomUUID)(),
                'relationship.upsert',
                JSON.stringify({
                    id: relationship.id,
                    tenantId: relationship.tenant_id,
                }),
            ]);
            await client.query('COMMIT');
            // 4. Queue Neo4j write (batched)
            try {
                (0, neo4jBatchWriter_js_1.getNeo4jBatchWriter)().queueCreateRelationship(relationship.src_id, relationship.dst_id, relationship.type, {
                    id: relationship.id,
                    props: relationship.props,
                    createdAt: relationship.created_at.toISOString(),
                    updatedAt: relationship.updated_at.toISOString(),
                }, relationship.tenant_id);
            }
            catch (neo4jError) {
                repoLogger.warn({ relationshipId: id, error: neo4jError }, 'Neo4j batch write queue failed, will retry via outbox');
            }
            return this.mapRow(relationship);
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
     * Delete relationship with dual-write
     */
    async delete(id) {
        const client = await this.pg.connect();
        try {
            await client.query('BEGIN');
            const { rows } = (await client.query(`DELETE FROM relationships WHERE id = $1 RETURNING *`, [id]));
            if (rows.length > 0) {
                const deletedRel = rows[0];
                // Outbox event for Neo4j cleanup
                await client.query(`INSERT INTO outbox_events (id, topic, payload)
           VALUES ($1, $2, $3)`, [(0, crypto_1.randomUUID)(), 'relationship.delete', JSON.stringify({ id })]);
                await client.query('COMMIT');
                // Queue Neo4j delete (batched)
                try {
                    (0, neo4jBatchWriter_js_1.getNeo4jBatchWriter)().queueDeleteRelationship(deletedRel.src_id, deletedRel.dst_id, deletedRel.type, deletedRel.tenant_id);
                }
                catch (neo4jError) {
                    repoLogger.warn({ relationshipId: id, error: neo4jError }, 'Neo4j batch delete queue failed, will retry via outbox');
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
     * Find relationship by ID
     */
    async findById(id, tenantId) {
        const params = [id];
        let query = `SELECT ${RELATIONSHIP_COLUMNS} FROM relationships WHERE id = $1`;
        if (tenantId) {
            query += ` AND tenant_id = $2`;
            params.push(tenantId);
        }
        const { rows } = (await this.pg.query(query, params));
        return rows[0] ? this.mapRow(rows[0]) : null;
    }
    /**
     * Find relationships for an entity
     * OPTIMIZED: Uses UNION ALL instead of OR for better index usage
     */
    async findByEntityId(entityId, tenantId, direction = 'both') {
        if (direction === 'outgoing') {
            const { rows } = (await this.pg.query(`SELECT ${RELATIONSHIP_COLUMNS} FROM relationships
         WHERE tenant_id = $1 AND src_id = $2
         ORDER BY created_at DESC`, [tenantId, entityId]));
            return rows.map(this.mapRow);
        }
        if (direction === 'incoming') {
            const { rows } = (await this.pg.query(`SELECT ${RELATIONSHIP_COLUMNS} FROM relationships
         WHERE tenant_id = $1 AND dst_id = $2
         ORDER BY created_at DESC`, [tenantId, entityId]));
            return rows.map(this.mapRow);
        }
        // OPTIMIZED: Use UNION ALL instead of OR clause
        // This allows PostgreSQL to use separate index scans (5-20x faster)
        const { rows } = (await this.pg.query(`SELECT ${RELATIONSHIP_COLUMNS} FROM relationships
       WHERE tenant_id = $1 AND src_id = $2

       UNION ALL

       SELECT ${RELATIONSHIP_COLUMNS} FROM relationships
       WHERE tenant_id = $1 AND dst_id = $2

       ORDER BY created_at DESC`, [tenantId, entityId, tenantId, entityId]));
        // Deduplicate in case same relationship appears in both results
        const uniqueRows = Array.from(new Map(rows.map((row) => [row.id, row])).values());
        return uniqueRows.map(this.mapRow);
    }
    /**
     * Search relationships with filters
     */
    async search({ tenantId, type, srcId, dstId, limit = 100, offset = 0, }) {
        const params = [tenantId];
        let query = `SELECT ${RELATIONSHIP_COLUMNS} FROM relationships WHERE tenant_id = $1`;
        let paramIndex = 2;
        if (type) {
            query += ` AND type = $${paramIndex}`;
            params.push(type);
            paramIndex++;
        }
        if (srcId) {
            query += ` AND src_id = $${paramIndex}`;
            params.push(srcId);
            paramIndex++;
        }
        if (dstId) {
            query += ` AND dst_id = $${paramIndex}`;
            params.push(dstId);
            paramIndex++;
        }
        query += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
        params.push(Math.min(limit, 1000), offset);
        const { rows } = (await this.pg.query(query, params));
        return rows.map(this.mapRow);
    }
    /**
     * Get relationship count for an entity (for graph analysis)
     * OPTIMIZED: Parallel queries instead of OR clause (10-50x faster)
     */
    async getEntityRelationshipCount(entityId, tenantId) {
        // OPTIMIZED: Run two queries in parallel, each uses its own index efficiently
        const [outgoingResult, incomingResult] = await Promise.all([
            this.pg.query(`SELECT COUNT(*) as count FROM relationships
         WHERE tenant_id = $1 AND src_id = $2`, [tenantId, entityId]),
            this.pg.query(`SELECT COUNT(*) as count FROM relationships
         WHERE tenant_id = $1 AND dst_id = $2`, [tenantId, entityId]),
        ]);
        return {
            outgoing: parseInt(outgoingResult.rows[0]?.count || '0'),
            incoming: parseInt(incomingResult.rows[0]?.count || '0'),
        };
    }
    /**
     * Upsert relationship in Neo4j (idempotent)
     */
    async upsertNeo4jRelationship({ id, tenantId, srcId, dstId, type, props, }) {
        const session = this.neo4j.session();
        try {
            await session.executeWrite(async (tx) => {
                await tx.run(`MATCH (src:Entity {id: $srcId}), (dst:Entity {id: $dstId})
           MERGE (src)-[r:REL {id: $id}]->(dst)
           ON CREATE SET r.createdAt = timestamp()
           SET r.tenantId = $tenantId,
               r.type = $type,
               r.props = $props,
               r.updatedAt = timestamp()`, { id, tenantId, srcId, dstId, type, props });
            });
        }
        finally {
            await session.close();
        }
    }
    /**
     * Delete relationship from Neo4j
     */
    async deleteNeo4jRelationship(id) {
        const session = this.neo4j.session();
        try {
            await session.executeWrite(async (tx) => {
                await tx.run(`MATCH ()-[r:REL {id: $id}]-()
           DELETE r`, { id });
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
            srcId: row.src_id,
            dstId: row.dst_id,
            type: row.type,
            props: row.props,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
            createdBy: row.created_by,
        };
    }
}
exports.RelationshipRepo = RelationshipRepo;
