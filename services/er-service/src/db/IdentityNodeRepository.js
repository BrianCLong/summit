"use strict";
/**
 * Identity Node Repository
 *
 * Data access layer for IdentityNode entities.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.identityNodeRepository = exports.IdentityNodeRepository = void 0;
const uuid_1 = require("uuid");
const pino_1 = __importDefault(require("pino"));
const connection_js_1 = require("./connection.js");
const logger = (0, pino_1.default)({ name: 'IdentityNodeRepository' });
class IdentityNodeRepository {
    /**
     * Create a new identity node
     */
    async create(input) {
        const db = (0, connection_js_1.getDatabase)();
        const nodeId = (0, uuid_1.v4)();
        const now = new Date().toISOString();
        const node = {
            nodeId,
            clusterId: input.clusterId ?? null,
            entityType: input.entityType,
            sourceRef: input.sourceRef,
            attributes: input.attributes,
            normalizedAttributes: input.normalizedAttributes ?? this.normalizeAttributes(input.attributes),
            confidence: input.sourceRef.confidence,
            createdAt: now,
            updatedAt: now,
            version: 1,
        };
        await db.execute(`INSERT INTO er_identity_nodes (
        node_id, cluster_id, tenant_id, entity_type, source_ref,
        attributes, normalized_attributes, confidence,
        created_at, updated_at, version
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`, [
            node.nodeId,
            node.clusterId,
            input.tenantId,
            node.entityType,
            JSON.stringify(node.sourceRef),
            JSON.stringify(node.attributes),
            JSON.stringify(node.normalizedAttributes),
            node.confidence,
            node.createdAt,
            node.updatedAt,
            node.version,
        ]);
        logger.info({ nodeId, entityType: node.entityType }, 'Identity node created');
        return node;
    }
    /**
     * Get a node by ID
     */
    async getById(nodeId) {
        const db = (0, connection_js_1.getDatabase)();
        const row = await db.queryOne(`SELECT * FROM er_identity_nodes WHERE node_id = $1`, [nodeId]);
        if (!row)
            return null;
        return this.rowToNode(row);
    }
    /**
     * Get nodes by cluster ID
     */
    async getByClusterId(clusterId) {
        const db = (0, connection_js_1.getDatabase)();
        const rows = await db.query(`SELECT * FROM er_identity_nodes WHERE cluster_id = $1 ORDER BY created_at`, [clusterId]);
        return rows.map((row) => this.rowToNode(row));
    }
    /**
     * Search for nodes
     */
    async search(criteria) {
        const db = (0, connection_js_1.getDatabase)();
        const conditions = ['tenant_id = $1'];
        const params = [criteria.tenantId];
        let paramIndex = 2;
        if (criteria.entityType) {
            conditions.push(`entity_type = $${paramIndex++}`);
            params.push(criteria.entityType);
        }
        if (criteria.clusterId) {
            conditions.push(`cluster_id = $${paramIndex++}`);
            params.push(criteria.clusterId);
        }
        if (criteria.sourceSystem) {
            conditions.push(`source_ref->>'sourceSystem' = $${paramIndex++}`);
            params.push(criteria.sourceSystem);
        }
        const limit = criteria.limit ?? 100;
        const offset = criteria.offset ?? 0;
        const sql = `
      SELECT * FROM er_identity_nodes
      WHERE ${conditions.join(' AND ')}
      ORDER BY created_at DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex}
    `;
        params.push(limit, offset);
        const rows = await db.query(sql, params);
        return rows.map((row) => this.rowToNode(row));
    }
    /**
     * Update node's cluster assignment
     */
    async updateCluster(nodeId, clusterId) {
        const db = (0, connection_js_1.getDatabase)();
        await db.execute(`UPDATE er_identity_nodes
       SET cluster_id = $1, updated_at = $2, version = version + 1
       WHERE node_id = $3`, [clusterId, new Date().toISOString(), nodeId]);
    }
    /**
     * Batch update cluster assignment for multiple nodes
     */
    async batchUpdateCluster(nodeIds, clusterId) {
        if (nodeIds.length === 0)
            return;
        const db = (0, connection_js_1.getDatabase)();
        await db.execute(`UPDATE er_identity_nodes
       SET cluster_id = $1, updated_at = $2, version = version + 1
       WHERE node_id = ANY($3)`, [clusterId, new Date().toISOString(), nodeIds]);
        logger.info({ nodeIds, clusterId }, 'Batch cluster update completed');
    }
    /**
     * Delete a node
     */
    async delete(nodeId) {
        const db = (0, connection_js_1.getDatabase)();
        await db.execute(`DELETE FROM er_identity_nodes WHERE node_id = $1`, [nodeId]);
        logger.info({ nodeId }, 'Identity node deleted');
    }
    /**
     * Get nodes without cluster assignment
     */
    async getUnclusteredNodes(tenantId, entityType, limit = 100) {
        const db = (0, connection_js_1.getDatabase)();
        const rows = await db.query(`SELECT * FROM er_identity_nodes
       WHERE tenant_id = $1 AND entity_type = $2 AND cluster_id IS NULL
       ORDER BY created_at
       LIMIT $3`, [tenantId, entityType, limit]);
        return rows.map((row) => this.rowToNode(row));
    }
    rowToNode(row) {
        return {
            nodeId: row.node_id,
            clusterId: row.cluster_id,
            entityType: row.entity_type,
            sourceRef: row.source_ref,
            attributes: row.attributes,
            normalizedAttributes: row.normalized_attributes,
            featureVector: row.feature_vector ?? undefined,
            confidence: row.confidence,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
            version: row.version,
        };
    }
    normalizeAttributes(attrs) {
        const normalized = {};
        const flatten = (obj, prefix = '') => {
            for (const [key, value] of Object.entries(obj)) {
                const fullKey = prefix ? `${prefix}.${key}` : key;
                if (value === null || value === undefined) {
                    continue;
                }
                if (typeof value === 'object' && !Array.isArray(value)) {
                    flatten(value, fullKey);
                }
                else if (typeof value === 'string') {
                    normalized[fullKey] = value.toLowerCase().trim();
                }
                else {
                    normalized[fullKey] = String(value);
                }
            }
        };
        flatten(attrs);
        return normalized;
    }
}
exports.IdentityNodeRepository = IdentityNodeRepository;
exports.identityNodeRepository = new IdentityNodeRepository();
