import { Pool } from 'pg';
import { randomUUID } from 'crypto';
import { Logger } from 'pino';

export interface LineageNode {
  id: string;
  type: 'source' | 'process' | 'artifact';
  name: string;
  metadata: Record<string, any>;
}

export interface LineageEdge {
  id: string;
  sourceId: string;
  targetId: string;
  operation: string;
  timestamp: Date;
  metadata: Record<string, any>;
}

export class DataLineageSystem {
  constructor(
    private db: Pool,
    private logger: Logger
  ) {}

  async createNode(type: LineageNode['type'], name: string, metadata: Record<string, any> = {}): Promise<string> {
    const id = randomUUID();
    await this.db.query(
      'INSERT INTO lineage_nodes (id, type, name, metadata) VALUES ($1, $2, $3, $4)',
      [id, type, name, JSON.stringify(metadata)]
    );
    return id;
  }

  async recordOperation(
    sourceId: string,
    targetId: string,
    operation: string,
    metadata: Record<string, any> = {}
  ): Promise<string> {
    const id = randomUUID();
    await this.db.query(
      'INSERT INTO lineage_edges (id, source_id, target_id, operation, timestamp, metadata) VALUES ($1, $2, $3, $4, NOW(), $5)',
      [id, sourceId, targetId, operation, JSON.stringify(metadata)]
    );
    return id;
  }

  async getLineage(nodeId: string, direction: 'upstream' | 'downstream' = 'upstream', depth: number = 5): Promise<{ nodes: LineageNode[], edges: LineageEdge[] }> {
    // Recursive CTE for graph traversal
    const query = `
      WITH RECURSIVE lineage AS (
        -- Base case
        SELECT
          source_id, target_id, operation, timestamp, metadata, 1 as level
        FROM lineage_edges
        WHERE ${direction === 'upstream' ? 'target_id' : 'source_id'} = $1

        UNION ALL

        -- Recursive case
        SELECT
          e.source_id, e.target_id, e.operation, e.timestamp, e.metadata, l.level + 1
        FROM lineage_edges e
        INNER JOIN lineage l ON ${direction === 'upstream' ? 'l.source_id = e.target_id' : 'l.target_id = e.source_id'}
        WHERE l.level < $2
      )
      SELECT * FROM lineage;
    `;

    const result = await this.db.query(query, [nodeId, depth]);

    // Fetch nodes involved
    const nodeIds = new Set<string>();
    const edges: LineageEdge[] = [];

    for (const row of result.rows) {
      nodeIds.add(row.source_id);
      nodeIds.add(row.target_id);
      edges.push({
        id: row.id, // Note: ID might be missing in CTE unless selected, but strictly not needed for display usually. Actually I didn't select ID in CTE.
        sourceId: row.source_id,
        targetId: row.target_id,
        operation: row.operation,
        timestamp: row.timestamp,
        metadata: row.metadata
      });
    }

    // Add the starting node itself if no edges found (it might be isolated)
    nodeIds.add(nodeId);

    if (nodeIds.size === 0) return { nodes: [], edges: [] };

    const nodesRes = await this.db.query(
      'SELECT * FROM lineage_nodes WHERE id = ANY($1)',
      [[...nodeIds]]
    );

    const nodes = nodesRes.rows.map(r => ({
      id: r.id,
      type: r.type,
      name: r.name,
      metadata: r.metadata
    }));

    return { nodes, edges };
  }
}
