/**
 * Identity Node Repository
 *
 * Data access layer for IdentityNode entities.
 */

import { v4 as uuidv4 } from 'uuid';
import pino from 'pino';
import type { IdentityNode, EntityType, SourceRecordRef } from '../types/index.js';
import { getDatabase } from './connection.js';

const logger = pino({ name: 'IdentityNodeRepository' });

export interface CreateNodeInput {
  tenantId: string;
  entityType: EntityType;
  sourceRef: SourceRecordRef;
  attributes: Record<string, unknown>;
  normalizedAttributes?: Record<string, string>;
  clusterId?: string;
}

export interface NodeSearchCriteria {
  tenantId: string;
  entityType?: EntityType;
  clusterId?: string;
  sourceSystem?: string;
  limit?: number;
  offset?: number;
}

export class IdentityNodeRepository {
  /**
   * Create a new identity node
   */
  async create(input: CreateNodeInput): Promise<IdentityNode> {
    const db = getDatabase();
    const nodeId = uuidv4();
    const now = new Date().toISOString();

    const node: IdentityNode = {
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

    await db.execute(
      `INSERT INTO er_identity_nodes (
        node_id, cluster_id, tenant_id, entity_type, source_ref,
        attributes, normalized_attributes, confidence,
        created_at, updated_at, version
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
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
      ]
    );

    logger.info({ nodeId, entityType: node.entityType }, 'Identity node created');
    return node;
  }

  /**
   * Get a node by ID
   */
  async getById(nodeId: string): Promise<IdentityNode | null> {
    const db = getDatabase();
    const row = await db.queryOne<{
      node_id: string;
      cluster_id: string | null;
      entity_type: EntityType;
      source_ref: SourceRecordRef;
      attributes: Record<string, unknown>;
      normalized_attributes: Record<string, string>;
      confidence: number;
      feature_vector: number[] | null;
      created_at: string;
      updated_at: string;
      version: number;
    }>(
      `SELECT * FROM er_identity_nodes WHERE node_id = $1`,
      [nodeId]
    );

    if (!row) return null;

    return this.rowToNode(row);
  }

  /**
   * Get nodes by cluster ID
   */
  async getByClusterId(clusterId: string): Promise<IdentityNode[]> {
    const db = getDatabase();
    const rows = await db.query<{
      node_id: string;
      cluster_id: string | null;
      entity_type: EntityType;
      source_ref: SourceRecordRef;
      attributes: Record<string, unknown>;
      normalized_attributes: Record<string, string>;
      confidence: number;
      feature_vector: number[] | null;
      created_at: string;
      updated_at: string;
      version: number;
    }>(
      `SELECT * FROM er_identity_nodes WHERE cluster_id = $1 ORDER BY created_at`,
      [clusterId]
    );

    return rows.map((row) => this.rowToNode(row));
  }

  /**
   * Search for nodes
   */
  async search(criteria: NodeSearchCriteria): Promise<IdentityNode[]> {
    const db = getDatabase();
    const conditions: string[] = ['tenant_id = $1'];
    const params: unknown[] = [criteria.tenantId];
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

    const rows = await db.query<{
      node_id: string;
      cluster_id: string | null;
      entity_type: EntityType;
      source_ref: SourceRecordRef;
      attributes: Record<string, unknown>;
      normalized_attributes: Record<string, string>;
      confidence: number;
      feature_vector: number[] | null;
      created_at: string;
      updated_at: string;
      version: number;
    }>(sql, params);

    return rows.map((row) => this.rowToNode(row));
  }

  /**
   * Update node's cluster assignment
   */
  async updateCluster(nodeId: string, clusterId: string | null): Promise<void> {
    const db = getDatabase();
    await db.execute(
      `UPDATE er_identity_nodes
       SET cluster_id = $1, updated_at = $2, version = version + 1
       WHERE node_id = $3`,
      [clusterId, new Date().toISOString(), nodeId]
    );
  }

  /**
   * Batch update cluster assignment for multiple nodes
   */
  async batchUpdateCluster(nodeIds: string[], clusterId: string): Promise<void> {
    if (nodeIds.length === 0) return;

    const db = getDatabase();
    await db.execute(
      `UPDATE er_identity_nodes
       SET cluster_id = $1, updated_at = $2, version = version + 1
       WHERE node_id = ANY($3)`,
      [clusterId, new Date().toISOString(), nodeIds]
    );

    logger.info({ nodeIds, clusterId }, 'Batch cluster update completed');
  }

  /**
   * Delete a node
   */
  async delete(nodeId: string): Promise<void> {
    const db = getDatabase();
    await db.execute(`DELETE FROM er_identity_nodes WHERE node_id = $1`, [nodeId]);
    logger.info({ nodeId }, 'Identity node deleted');
  }

  /**
   * Get nodes without cluster assignment
   */
  async getUnclusteredNodes(tenantId: string, entityType: EntityType, limit = 100): Promise<IdentityNode[]> {
    const db = getDatabase();
    const rows = await db.query<{
      node_id: string;
      cluster_id: string | null;
      entity_type: EntityType;
      source_ref: SourceRecordRef;
      attributes: Record<string, unknown>;
      normalized_attributes: Record<string, string>;
      confidence: number;
      feature_vector: number[] | null;
      created_at: string;
      updated_at: string;
      version: number;
    }>(
      `SELECT * FROM er_identity_nodes
       WHERE tenant_id = $1 AND entity_type = $2 AND cluster_id IS NULL
       ORDER BY created_at
       LIMIT $3`,
      [tenantId, entityType, limit]
    );

    return rows.map((row) => this.rowToNode(row));
  }

  private rowToNode(row: {
    node_id: string;
    cluster_id: string | null;
    entity_type: EntityType;
    source_ref: SourceRecordRef;
    attributes: Record<string, unknown>;
    normalized_attributes: Record<string, string>;
    confidence: number;
    feature_vector: number[] | null;
    created_at: string;
    updated_at: string;
    version: number;
  }): IdentityNode {
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

  private normalizeAttributes(attrs: Record<string, unknown>): Record<string, string> {
    const normalized: Record<string, string> = {};

    const flatten = (obj: Record<string, unknown>, prefix = ''): void => {
      for (const [key, value] of Object.entries(obj)) {
        const fullKey = prefix ? `${prefix}.${key}` : key;

        if (value === null || value === undefined) {
          continue;
        }

        if (typeof value === 'object' && !Array.isArray(value)) {
          flatten(value as Record<string, unknown>, fullKey);
        } else if (typeof value === 'string') {
          normalized[fullKey] = value.toLowerCase().trim();
        } else {
          normalized[fullKey] = String(value);
        }
      }
    };

    flatten(attrs);
    return normalized;
  }
}

export const identityNodeRepository = new IdentityNodeRepository();
