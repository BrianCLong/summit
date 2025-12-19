
import { getPostgresPool } from '../../db/postgres.js';
import { v4 as uuidv4 } from 'uuid';

export interface LineageNode {
  id: string;
  assetId: string; // Foreign key to DataCatalogAsset
  name: string;
  type: string;
  tenantId: string;
}

export interface LineageEdge {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  relationType: 'derivedFrom' | 'dependsOn' | 'contains';
  tenantId: string;
}

export class DataLineageService {
  private static instance: DataLineageService;

  private constructor() {}

  static getInstance(): DataLineageService {
    if (!DataLineageService.instance) {
      DataLineageService.instance = new DataLineageService();
    }
    return DataLineageService.instance;
  }

  async createNode(node: Omit<LineageNode, 'id'>): Promise<LineageNode> {
    const pool = getPostgresPool();
    const id = uuidv4();
    const newNode = { ...node, id };

    await pool.query(
      `INSERT INTO lineage_nodes (id, asset_id, name, type, tenant_id)
       VALUES ($1, $2, $3, $4, $5)`,
      [id, newNode.assetId, newNode.name, newNode.type, newNode.tenantId]
    );

    return newNode;
  }

  async createEdge(edge: Omit<LineageEdge, 'id'>): Promise<LineageEdge> {
    const pool = getPostgresPool();
    const id = uuidv4();
    const newEdge = { ...edge, id };

    await pool.query(
      `INSERT INTO lineage_edges (id, source_node_id, target_node_id, relation_type, tenant_id)
       VALUES ($1, $2, $3, $4, $5)`,
      [id, newEdge.sourceNodeId, newEdge.targetNodeId, newEdge.relationType, newEdge.tenantId]
    );

    return newEdge;
  }

  async getLineage(assetId: string): Promise<{ nodes: LineageNode[], edges: LineageEdge[] }> {
    const pool = getPostgresPool();
    // Simplified lineage: get direct upstream and downstream
    // A proper recursive CTE is better for full lineage, but this starts us off.

    // Find node for asset
    const nodeRes = await pool.query('SELECT * FROM lineage_nodes WHERE asset_id = $1', [assetId]);
    if (nodeRes.rows.length === 0) return { nodes: [], edges: [] };
    const rootNode = nodeRes.rows[0];

    // Find edges connected to this node
    const edgesRes = await pool.query(
        `SELECT * FROM lineage_edges
         WHERE source_node_id = $1 OR target_node_id = $1`,
        [rootNode.id]
    );

    const edges = edgesRes.rows.map(this.mapRowToEdge);
    const relatedNodeIds = new Set<string>();
    edges.forEach(e => {
        relatedNodeIds.add(e.sourceNodeId);
        relatedNodeIds.add(e.targetNodeId);
    });

    const relatedNodesRes = await pool.query(
        `SELECT * FROM lineage_nodes WHERE id = ANY($1)`,
        [[...relatedNodeIds]]
    );

    return {
        nodes: relatedNodesRes.rows.map(this.mapRowToNode),
        edges: edges
    };
  }

  private mapRowToNode(row: any): LineageNode {
      return {
          id: row.id,
          assetId: row.asset_id,
          name: row.name,
          type: row.type,
          tenantId: row.tenant_id
      };
  }

  private mapRowToEdge(row: any): LineageEdge {
      return {
          id: row.id,
          sourceNodeId: row.source_node_id,
          targetNodeId: row.target_node_id,
          relationType: row.relation_type,
          tenantId: row.tenant_id
      };
  }
}
