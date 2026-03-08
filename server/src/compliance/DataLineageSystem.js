"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DataLineageSystem = void 0;
const crypto_1 = require("crypto");
const database_js_1 = require("../config/database.js");
const crypto_2 = require("crypto");
class DataLineageSystem {
    static instance;
    pool;
    constructor() {
        this.pool = (0, database_js_1.getPostgresPool)();
    }
    static getInstance() {
        if (!DataLineageSystem.instance) {
            DataLineageSystem.instance = new DataLineageSystem();
        }
        return DataLineageSystem.instance;
    }
    /**
     * Register or update a lineage node (dataset, job, etc.)
     */
    async upsertNode(name, type, metadata, schemaDefinition) {
        const id = (0, crypto_1.randomUUID)(); // Note: Ideally should be deterministic based on name/type or lookup first.
        // For this implementation, we will check if it exists by name/type first.
        // Check if exists
        const existing = await this.pool.query(`SELECT id FROM lineage_nodes WHERE name = $1 AND type = $2`, [name, type]);
        let nodeId = existing.rows[0]?.id;
        let schemaHash = null;
        if (schemaDefinition) {
            schemaHash = (0, crypto_2.createHash)('sha256').update(JSON.stringify(schemaDefinition)).digest('hex');
        }
        if (nodeId) {
            await this.pool.query(`UPDATE lineage_nodes SET metadata = $1, schema_hash = $2, updated_at = NOW() WHERE id = $3`, [metadata || {}, schemaHash, nodeId]);
        }
        else {
            nodeId = (0, crypto_1.randomUUID)();
            await this.pool.query(`INSERT INTO lineage_nodes (id, name, type, metadata, schema_hash) VALUES ($1, $2, $3, $4, $5)`, [nodeId, name, type, metadata || {}, schemaHash]);
        }
        return nodeId;
    }
    /**
     * Add a lineage edge (e.g. Job X reads Dataset Y)
     */
    async addEdge(sourceId, targetId, type, metadata) {
        await this.pool.query(`INSERT INTO lineage_edges (source_id, target_id, type, metadata)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (source_id, target_id, type) DO NOTHING`, [sourceId, targetId, type, metadata || {}]);
    }
    /**
     * Get upstream lineage (where data comes from)
     */
    async getUpstream(nodeId, depth = 5) {
        // Recursive CTE for upstream
        const query = `
      WITH RECURSIVE upstream AS (
        SELECT source_id, target_id, type, 1 as depth
        FROM lineage_edges
        WHERE target_id = $1
        UNION ALL
        SELECT e.source_id, e.target_id, e.type, u.depth + 1
        FROM lineage_edges e
        JOIN upstream u ON e.target_id = u.source_id
        WHERE u.depth < $2
      )
      SELECT * FROM upstream;
    `;
        const res = await this.pool.query(query, [nodeId, depth]);
        const edges = res.rows.map((row) => ({
            sourceId: row.source_id,
            targetId: row.target_id,
            type: row.type,
            createdAt: new Date() // Placeholder as CTE doesn't select it, can optimize
        }));
        const sourceIds = [...new Set(edges.map((e) => e.sourceId))];
        if (sourceIds.length === 0)
            return { nodes: [], edges: [] };
        const nodesRes = await this.pool.query(`SELECT * FROM lineage_nodes WHERE id = ANY($1)`, [sourceIds]);
        const nodes = nodesRes.rows.map(this.mapRowToNode);
        return { nodes, edges };
    }
    /**
     * Get downstream lineage (impact analysis)
     */
    async getDownstream(nodeId, depth = 5) {
        // Recursive CTE for downstream
        const query = `
        WITH RECURSIVE downstream AS (
          SELECT source_id, target_id, type, 1 as depth
          FROM lineage_edges
          WHERE source_id = $1
          UNION ALL
          SELECT e.source_id, e.target_id, e.type, d.depth + 1
          FROM lineage_edges e
          JOIN downstream d ON e.source_id = d.target_id
          WHERE d.depth < $2
        )
        SELECT * FROM downstream;
      `;
        const res = await this.pool.query(query, [nodeId, depth]);
        const edges = res.rows.map((row) => ({
            sourceId: row.source_id,
            targetId: row.target_id,
            type: row.type,
            createdAt: new Date()
        }));
        const targetIds = [...new Set(edges.map((e) => e.targetId))];
        if (targetIds.length === 0)
            return { nodes: [], edges: [] };
        const nodesRes = await this.pool.query(`SELECT * FROM lineage_nodes WHERE id = ANY($1)`, [targetIds]);
        const nodes = nodesRes.rows.map(this.mapRowToNode);
        return { nodes, edges };
    }
    mapRowToNode(row) {
        return {
            id: row.id,
            name: row.name,
            type: row.type,
            schemaHash: row.schema_hash,
            metadata: row.metadata,
            createdAt: row.created_at,
            updatedAt: row.updated_at
        };
    }
}
exports.DataLineageSystem = DataLineageSystem;
