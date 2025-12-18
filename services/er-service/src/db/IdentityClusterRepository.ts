/**
 * Identity Cluster Repository
 *
 * Data access layer for IdentityCluster entities.
 */

import { v4 as uuidv4 } from 'uuid';
import pino from 'pino';
import type {
  IdentityCluster,
  EntityType,
  MatchEdge,
  CanonicalAttribute,
  ClusterMergeHistory,
} from '../types/index.js';
import { getDatabase } from './connection.js';

const logger = pino({ name: 'IdentityClusterRepository' });

export interface CreateClusterInput {
  tenantId: string;
  entityType: EntityType;
  nodeIds: string[];
  primaryNodeId: string;
  canonicalAttributes: CanonicalAttribute[];
  edges: MatchEdge[];
  cohesionScore: number;
  confidence: number;
}

export interface ClusterSearchCriteria {
  tenantId: string;
  entityType?: EntityType;
  minSize?: number;
  maxSize?: number;
  minCohesion?: number;
  limit?: number;
  offset?: number;
}

export class IdentityClusterRepository {
  /**
   * Create a new identity cluster
   */
  async create(input: CreateClusterInput): Promise<IdentityCluster> {
    const db = getDatabase();
    const clusterId = uuidv4();
    const now = new Date().toISOString();

    const cluster: IdentityCluster = {
      clusterId,
      tenantId: input.tenantId,
      entityType: input.entityType,
      nodeIds: input.nodeIds,
      primaryNodeId: input.primaryNodeId,
      canonicalAttributes: input.canonicalAttributes,
      edges: input.edges,
      cohesionScore: input.cohesionScore,
      confidence: input.confidence,
      mergeHistory: [],
      createdAt: now,
      updatedAt: now,
      version: 1,
      locked: false,
    };

    await db.execute(
      `INSERT INTO er_identity_clusters (
        cluster_id, tenant_id, entity_type, node_ids, primary_node_id,
        canonical_attributes, edges, cohesion_score, confidence,
        merge_history, created_at, updated_at, version, locked
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
      [
        cluster.clusterId,
        cluster.tenantId,
        cluster.entityType,
        JSON.stringify(cluster.nodeIds),
        cluster.primaryNodeId,
        JSON.stringify(cluster.canonicalAttributes),
        JSON.stringify(cluster.edges),
        cluster.cohesionScore,
        cluster.confidence,
        JSON.stringify(cluster.mergeHistory),
        cluster.createdAt,
        cluster.updatedAt,
        cluster.version,
        cluster.locked,
      ]
    );

    logger.info(
      { clusterId, entityType: cluster.entityType, nodeCount: input.nodeIds.length },
      'Identity cluster created'
    );

    return cluster;
  }

  /**
   * Get a cluster by ID
   */
  async getById(clusterId: string): Promise<IdentityCluster | null> {
    const db = getDatabase();
    const row = await db.queryOne<ClusterRow>(
      `SELECT * FROM er_identity_clusters WHERE cluster_id = $1`,
      [clusterId]
    );

    if (!row) return null;
    return this.rowToCluster(row);
  }

  /**
   * Get cluster by node ID
   */
  async getByNodeId(nodeId: string): Promise<IdentityCluster | null> {
    const db = getDatabase();
    const row = await db.queryOne<ClusterRow>(
      `SELECT * FROM er_identity_clusters WHERE $1 = ANY(node_ids::text[])`,
      [nodeId]
    );

    if (!row) return null;
    return this.rowToCluster(row);
  }

  /**
   * Search for clusters
   */
  async search(criteria: ClusterSearchCriteria): Promise<IdentityCluster[]> {
    const db = getDatabase();
    const conditions: string[] = ['tenant_id = $1'];
    const params: unknown[] = [criteria.tenantId];
    let paramIndex = 2;

    if (criteria.entityType) {
      conditions.push(`entity_type = $${paramIndex++}`);
      params.push(criteria.entityType);
    }

    if (criteria.minSize !== undefined) {
      conditions.push(`jsonb_array_length(node_ids) >= $${paramIndex++}`);
      params.push(criteria.minSize);
    }

    if (criteria.maxSize !== undefined) {
      conditions.push(`jsonb_array_length(node_ids) <= $${paramIndex++}`);
      params.push(criteria.maxSize);
    }

    if (criteria.minCohesion !== undefined) {
      conditions.push(`cohesion_score >= $${paramIndex++}`);
      params.push(criteria.minCohesion);
    }

    const limit = criteria.limit ?? 100;
    const offset = criteria.offset ?? 0;

    const sql = `
      SELECT * FROM er_identity_clusters
      WHERE ${conditions.join(' AND ')}
      ORDER BY updated_at DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex}
    `;
    params.push(limit, offset);

    const rows = await db.query<ClusterRow>(sql, params);
    return rows.map((row) => this.rowToCluster(row));
  }

  /**
   * Update a cluster
   */
  async update(cluster: IdentityCluster): Promise<void> {
    const db = getDatabase();
    const now = new Date().toISOString();

    await db.execute(
      `UPDATE er_identity_clusters SET
        node_ids = $1,
        primary_node_id = $2,
        canonical_attributes = $3,
        edges = $4,
        cohesion_score = $5,
        confidence = $6,
        merge_history = $7,
        updated_at = $8,
        version = version + 1,
        locked = $9,
        locked_by = $10,
        locked_at = $11,
        locked_reason = $12
      WHERE cluster_id = $13`,
      [
        JSON.stringify(cluster.nodeIds),
        cluster.primaryNodeId,
        JSON.stringify(cluster.canonicalAttributes),
        JSON.stringify(cluster.edges),
        cluster.cohesionScore,
        cluster.confidence,
        JSON.stringify(cluster.mergeHistory),
        now,
        cluster.locked,
        cluster.lockedBy ?? null,
        cluster.lockedAt ?? null,
        cluster.lockedReason ?? null,
        cluster.clusterId,
      ]
    );

    logger.debug({ clusterId: cluster.clusterId }, 'Cluster updated');
  }

  /**
   * Merge two clusters
   */
  async merge(
    targetClusterId: string,
    sourceClusterId: string,
    decidedBy: string,
    reason: string
  ): Promise<IdentityCluster> {
    const db = getDatabase();

    return db.transaction(async (client) => {
      // Get both clusters
      const [targetResult, sourceResult] = await Promise.all([
        client.query(`SELECT * FROM er_identity_clusters WHERE cluster_id = $1 FOR UPDATE`, [targetClusterId]),
        client.query(`SELECT * FROM er_identity_clusters WHERE cluster_id = $1 FOR UPDATE`, [sourceClusterId]),
      ]);

      const targetRow = targetResult.rows[0] as ClusterRow | undefined;
      const sourceRow = sourceResult.rows[0] as ClusterRow | undefined;

      if (!targetRow || !sourceRow) {
        throw new Error('One or both clusters not found');
      }

      const target = this.rowToCluster(targetRow);
      const source = this.rowToCluster(sourceRow);

      // Merge node IDs
      const mergedNodeIds = [...new Set([...target.nodeIds, ...source.nodeIds])];

      // Merge edges
      const mergedEdges = [...target.edges, ...source.edges];

      // Record merge history
      const mergeRecord: ClusterMergeHistory = {
        mergeId: uuidv4(),
        fromClusterId: sourceClusterId,
        toClusterId: targetClusterId,
        nodeIds: source.nodeIds,
        reason,
        decision: 'AUTO_MERGE',
        decidedBy,
        decidedAt: new Date().toISOString(),
        revertible: true,
      };

      target.nodeIds = mergedNodeIds;
      target.edges = mergedEdges;
      target.mergeHistory = [...target.mergeHistory, mergeRecord];
      target.updatedAt = new Date().toISOString();

      // Recalculate cohesion
      target.cohesionScore = this.calculateCohesion(mergedEdges, mergedNodeIds.length);

      // Update target cluster
      await client.query(
        `UPDATE er_identity_clusters SET
          node_ids = $1, edges = $2, merge_history = $3,
          cohesion_score = $4, updated_at = $5, version = version + 1
        WHERE cluster_id = $6`,
        [
          JSON.stringify(target.nodeIds),
          JSON.stringify(target.edges),
          JSON.stringify(target.mergeHistory),
          target.cohesionScore,
          target.updatedAt,
          targetClusterId,
        ]
      );

      // Delete source cluster
      await client.query(`DELETE FROM er_identity_clusters WHERE cluster_id = $1`, [sourceClusterId]);

      // Update nodes to point to target cluster
      await client.query(
        `UPDATE er_identity_nodes SET cluster_id = $1, updated_at = $2 WHERE cluster_id = $3`,
        [targetClusterId, target.updatedAt, sourceClusterId]
      );

      logger.info(
        { targetClusterId, sourceClusterId, mergedNodeCount: mergedNodeIds.length },
        'Clusters merged'
      );

      return target;
    });
  }

  /**
   * Split a cluster
   */
  async split(
    clusterId: string,
    nodeIdsToSplit: string[],
    splitBy: string,
    reason: string
  ): Promise<IdentityCluster[]> {
    const db = getDatabase();

    return db.transaction(async (client) => {
      const result = await client.query(
        `SELECT * FROM er_identity_clusters WHERE cluster_id = $1 FOR UPDATE`,
        [clusterId]
      );

      const row = result.rows[0] as ClusterRow | undefined;
      if (!row) {
        throw new Error('Cluster not found');
      }

      const original = this.rowToCluster(row);

      // Validate split request
      const validNodeIds = nodeIdsToSplit.filter((id) => original.nodeIds.includes(id));
      if (validNodeIds.length === 0) {
        throw new Error('No valid node IDs to split');
      }

      const remainingNodeIds = original.nodeIds.filter((id) => !validNodeIds.includes(id));
      if (remainingNodeIds.length === 0) {
        throw new Error('Cannot split all nodes from cluster');
      }

      // Create new cluster for split nodes
      const newClusterId = uuidv4();
      const now = new Date().toISOString();

      const splitRecord: ClusterMergeHistory = {
        mergeId: uuidv4(),
        fromClusterId: clusterId,
        toClusterId: newClusterId,
        nodeIds: validNodeIds,
        reason,
        decision: 'MANUAL_SPLIT',
        decidedBy: splitBy,
        decidedAt: now,
        revertible: true,
      };

      // Filter edges for each cluster
      const remainingEdges = original.edges.filter(
        (e) => remainingNodeIds.includes(e.nodeAId) && remainingNodeIds.includes(e.nodeBId)
      );
      const splitEdges = original.edges.filter(
        (e) => validNodeIds.includes(e.nodeAId) && validNodeIds.includes(e.nodeBId)
      );

      // Update original cluster
      await client.query(
        `UPDATE er_identity_clusters SET
          node_ids = $1, edges = $2, merge_history = $3,
          cohesion_score = $4, updated_at = $5, version = version + 1
        WHERE cluster_id = $6`,
        [
          JSON.stringify(remainingNodeIds),
          JSON.stringify(remainingEdges),
          JSON.stringify([...original.mergeHistory, splitRecord]),
          this.calculateCohesion(remainingEdges, remainingNodeIds.length),
          now,
          clusterId,
        ]
      );

      // Create new cluster
      await client.query(
        `INSERT INTO er_identity_clusters (
          cluster_id, tenant_id, entity_type, node_ids, primary_node_id,
          canonical_attributes, edges, cohesion_score, confidence,
          merge_history, created_at, updated_at, version, locked
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
        [
          newClusterId,
          original.tenantId,
          original.entityType,
          JSON.stringify(validNodeIds),
          validNodeIds[0],
          JSON.stringify([]),
          JSON.stringify(splitEdges),
          this.calculateCohesion(splitEdges, validNodeIds.length),
          original.confidence,
          JSON.stringify([]),
          now,
          now,
          1,
          false,
        ]
      );

      // Update node cluster assignments
      await client.query(
        `UPDATE er_identity_nodes SET cluster_id = $1, updated_at = $2 WHERE node_id = ANY($3)`,
        [newClusterId, now, validNodeIds]
      );

      logger.info(
        { originalClusterId: clusterId, newClusterId, splitNodeCount: validNodeIds.length },
        'Cluster split'
      );

      // Fetch and return both clusters
      const [updatedOriginal, newCluster] = await Promise.all([
        this.getById(clusterId),
        this.getById(newClusterId),
      ]);

      return [updatedOriginal!, newCluster!];
    });
  }

  /**
   * Lock a cluster for editing
   */
  async lock(clusterId: string, lockedBy: string, reason: string): Promise<boolean> {
    const db = getDatabase();
    const now = new Date().toISOString();

    const result = await db.execute(
      `UPDATE er_identity_clusters
       SET locked = true, locked_by = $1, locked_at = $2, locked_reason = $3
       WHERE cluster_id = $4 AND locked = false`,
      [lockedBy, now, reason, clusterId]
    );

    return result > 0;
  }

  /**
   * Unlock a cluster
   */
  async unlock(clusterId: string): Promise<void> {
    const db = getDatabase();
    await db.execute(
      `UPDATE er_identity_clusters
       SET locked = false, locked_by = NULL, locked_at = NULL, locked_reason = NULL
       WHERE cluster_id = $1`,
      [clusterId]
    );
  }

  /**
   * Delete a cluster
   */
  async delete(clusterId: string): Promise<void> {
    const db = getDatabase();
    await db.transaction(async (client) => {
      // Unassign nodes first
      await client.query(
        `UPDATE er_identity_nodes SET cluster_id = NULL WHERE cluster_id = $1`,
        [clusterId]
      );

      // Delete cluster
      await client.query(`DELETE FROM er_identity_clusters WHERE cluster_id = $1`, [clusterId]);
    });

    logger.info({ clusterId }, 'Cluster deleted');
  }

  /**
   * Get cluster statistics
   */
  async getStats(tenantId: string, entityType?: EntityType): Promise<{
    totalClusters: number;
    totalNodes: number;
    avgClusterSize: number;
    avgCohesion: number;
  }> {
    const db = getDatabase();
    const conditions = ['tenant_id = $1'];
    const params: unknown[] = [tenantId];

    if (entityType) {
      conditions.push('entity_type = $2');
      params.push(entityType);
    }

    const result = await db.queryOne<{
      total_clusters: string;
      total_nodes: string;
      avg_cluster_size: string;
      avg_cohesion: string;
    }>(
      `SELECT
        COUNT(*) as total_clusters,
        SUM(jsonb_array_length(node_ids)) as total_nodes,
        AVG(jsonb_array_length(node_ids)) as avg_cluster_size,
        AVG(cohesion_score) as avg_cohesion
      FROM er_identity_clusters
      WHERE ${conditions.join(' AND ')}`,
      params
    );

    return {
      totalClusters: parseInt(result?.total_clusters ?? '0', 10),
      totalNodes: parseInt(result?.total_nodes ?? '0', 10),
      avgClusterSize: parseFloat(result?.avg_cluster_size ?? '0'),
      avgCohesion: parseFloat(result?.avg_cohesion ?? '0'),
    };
  }

  private calculateCohesion(edges: MatchEdge[], nodeCount: number): number {
    if (nodeCount <= 1 || edges.length === 0) return 1.0;

    const maxPossibleEdges = (nodeCount * (nodeCount - 1)) / 2;
    const edgeDensity = edges.length / maxPossibleEdges;
    const avgEdgeScore = edges.reduce((sum, e) => sum + e.overallScore, 0) / edges.length;

    return edgeDensity * 0.4 + avgEdgeScore * 0.6;
  }

  private rowToCluster(row: ClusterRow): IdentityCluster {
    return {
      clusterId: row.cluster_id,
      tenantId: row.tenant_id,
      entityType: row.entity_type,
      nodeIds: row.node_ids,
      primaryNodeId: row.primary_node_id,
      canonicalAttributes: row.canonical_attributes,
      edges: row.edges,
      cohesionScore: row.cohesion_score,
      confidence: row.confidence,
      mergeHistory: row.merge_history,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      version: row.version,
      locked: row.locked,
      lockedBy: row.locked_by ?? undefined,
      lockedAt: row.locked_at ?? undefined,
      lockedReason: row.locked_reason ?? undefined,
    };
  }
}

interface ClusterRow {
  cluster_id: string;
  tenant_id: string;
  entity_type: EntityType;
  node_ids: string[];
  primary_node_id: string;
  canonical_attributes: CanonicalAttribute[];
  edges: MatchEdge[];
  cohesion_score: number;
  confidence: number;
  merge_history: ClusterMergeHistory[];
  created_at: string;
  updated_at: string;
  version: number;
  locked: boolean;
  locked_by: string | null;
  locked_at: string | null;
  locked_reason: string | null;
}

export const identityClusterRepository = new IdentityClusterRepository();
