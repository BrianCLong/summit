/**
 * Data Lineage Tracker
 *
 * Tracks data flow and transformations across the warehouse
 */

import { Pool } from 'pg';

export interface LineageNode {
  nodeId: string;
  assetName: string;
  assetType: string;
  timestamp: Date;
}

export interface LineageEdge {
  edgeId: string;
  sourceNode: string;
  targetNode: string;
  transformation?: string;
  timestamp: Date;
}

export class LineageTracker {
  constructor(private pool: Pool) {}

  /**
   * Record lineage relationship
   */
  async recordLineage(
    source: string,
    target: string,
    transformation?: string,
  ): Promise<void> {
    await this.pool.query(
      `
      INSERT INTO warehouse_lineage (source_asset, target_asset, transformation)
      VALUES ($1, $2, $3)
      ON CONFLICT (source_asset, target_asset) DO UPDATE
      SET transformation = EXCLUDED.transformation,
          updated_at = CURRENT_TIMESTAMP
    `,
      [source, target, transformation],
    );
  }

  /**
   * Get upstream lineage (sources)
   */
  async getUpstreamLineage(assetName: string, depth: number = 5): Promise<LineageNode[]> {
    const result = await this.pool.query(
      `
      WITH RECURSIVE lineage AS (
        SELECT source_asset, target_asset, transformation, 1 as depth
        FROM warehouse_lineage
        WHERE target_asset = $1

        UNION ALL

        SELECT l.source_asset, l.target_asset, l.transformation, lin.depth + 1
        FROM warehouse_lineage l
        JOIN lineage lin ON l.target_asset = lin.source_asset
        WHERE lin.depth < $2
      )
      SELECT DISTINCT source_asset as asset_name
      FROM lineage
    `,
      [assetName, depth],
    );

    return result.rows.map((row, idx) => ({
      nodeId: `node_${idx}`,
      assetName: row.asset_name,
      assetType: 'unknown',
      timestamp: new Date(),
    }));
  }

  /**
   * Get downstream lineage (dependencies)
   */
  async getDownstreamLineage(assetName: string, depth: number = 5): Promise<LineageNode[]> {
    const result = await this.pool.query(
      `
      WITH RECURSIVE lineage AS (
        SELECT source_asset, target_asset, transformation, 1 as depth
        FROM warehouse_lineage
        WHERE source_asset = $1

        UNION ALL

        SELECT l.source_asset, l.target_asset, l.transformation, lin.depth + 1
        FROM warehouse_lineage l
        JOIN lineage lin ON l.source_asset = lin.target_asset
        WHERE lin.depth < $2
      )
      SELECT DISTINCT target_asset as asset_name
      FROM lineage
    `,
      [assetName, depth],
    );

    return result.rows.map((row, idx) => ({
      nodeId: `node_${idx}`,
      assetName: row.asset_name,
      assetType: 'unknown',
      timestamp: new Date(),
    }));
  }

  /**
   * Get complete lineage graph
   */
  async getLineageGraph(assetName: string): Promise<{
    nodes: LineageNode[];
    edges: LineageEdge[];
  }> {
    const upstream = await this.getUpstreamLineage(assetName);
    const downstream = await this.getDownstreamLineage(assetName);

    const nodes = [
      ...upstream,
      { nodeId: 'center', assetName, assetType: 'focus', timestamp: new Date() },
      ...downstream,
    ];

    const edges: LineageEdge[] = [];

    // Get edges
    const edgeResult = await this.pool.query(`
      SELECT * FROM warehouse_lineage
      WHERE source_asset = ANY($1) OR target_asset = ANY($1)
    `, [[...upstream.map(n => n.assetName), assetName, ...downstream.map(n => n.assetName)]]);

    for (const row of edgeResult.rows) {
      edges.push({
        edgeId: row.lineage_id,
        sourceNode: row.source_asset,
        targetNode: row.target_asset,
        transformation: row.transformation,
        timestamp: row.created_at,
      });
    }

    return { nodes, edges };
  }

  /**
   * Analyze impact of changes
   */
  async analyzeImpact(assetName: string): Promise<{
    directImpact: string[];
    indirectImpact: string[];
    totalAffected: number;
  }> {
    const downstream = await this.getDownstreamLineage(assetName, 10);

    const directImpact = downstream.filter((_, idx) => idx < 5).map(n => n.assetName);
    const indirectImpact = downstream.filter((_, idx) => idx >= 5).map(n => n.assetName);

    return {
      directImpact,
      indirectImpact,
      totalAffected: downstream.length,
    };
  }

  /**
   * Initialize lineage tables
   */
  async initializeTables(): Promise<void> {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS warehouse_lineage (
        lineage_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        source_asset VARCHAR(255) NOT NULL,
        target_asset VARCHAR(255) NOT NULL,
        transformation TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (source_asset, target_asset)
      );

      CREATE INDEX IF NOT EXISTS idx_lineage_source ON warehouse_lineage(source_asset);
      CREATE INDEX IF NOT EXISTS idx_lineage_target ON warehouse_lineage(target_asset);
    `);
  }
}
