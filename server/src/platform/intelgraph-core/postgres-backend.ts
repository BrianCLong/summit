import { GraphBackend, GraphNode, GraphEdge } from './backend.js';
import pg from 'pg';

export class PostgresGraphBackend implements GraphBackend {
  constructor(private pool: pg.Pool) {}

  async createNode(nodeData: Omit<GraphNode, 'createdAt' | 'updatedAt'>): Promise<GraphNode> {
    const query = `
      INSERT INTO intelgraph_nodes (id, tenant_id, type, props, created_at, updated_at)
      VALUES ($1, $2, $3, $4, NOW(), NOW())
      RETURNING *;
    `;
    const values = [nodeData.id, nodeData.tenantId, nodeData.type, JSON.stringify(nodeData.props)];

    const res = await this.pool.query(query, values);
    return this.mapRowToNode(res.rows[0]);
  }

  async getNode(id: string, tenantId: string): Promise<GraphNode | null> {
    const query = `SELECT * FROM intelgraph_nodes WHERE id = $1 AND tenant_id = $2`;
    const res = await this.pool.query(query, [id, tenantId]);
    return res.rows[0] ? this.mapRowToNode(res.rows[0]) : null;
  }

  async updateNode(id: string, tenantId: string, props: Record<string, any>): Promise<GraphNode | null> {
    const query = `
      UPDATE intelgraph_nodes
      SET props = props || $3::jsonb, updated_at = NOW()
      WHERE id = $1 AND tenant_id = $2
      RETURNING *;
    `;
    const res = await this.pool.query(query, [id, tenantId, JSON.stringify(props)]);
    return res.rows[0] ? this.mapRowToNode(res.rows[0]) : null;
  }

  async createEdge(edgeData: Omit<GraphEdge, 'createdAt'>): Promise<GraphEdge> {
     const query = `
      INSERT INTO intelgraph_edges (id, tenant_id, from_id, to_id, type, props, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, NOW())
      RETURNING *;
    `;
    const values = [
      edgeData.id,
      edgeData.tenantId,
      edgeData.fromId,
      edgeData.toId,
      edgeData.type,
      JSON.stringify(edgeData.props)
    ];
    const res = await this.pool.query(query, values);
    return this.mapRowToEdge(res.rows[0]);
  }

  async getEdges(fromId: string, tenantId: string): Promise<GraphEdge[]> {
    const query = `SELECT * FROM intelgraph_edges WHERE from_id = $1 AND tenant_id = $2`;
    const res = await this.pool.query(query, [fromId, tenantId]);
    return res.rows.map(this.mapRowToEdge);
  }

  async queryNodes(tenantId: string, type?: string, props?: Record<string, any>): Promise<GraphNode[]> {
    let query = `SELECT * FROM intelgraph_nodes WHERE tenant_id = $1`;
    const values: any[] = [tenantId];
    let idx = 2;

    if (type) {
      query += ` AND type = $${idx++}`;
      values.push(type);
    }

    if (props) {
      query += ` AND props @> $${idx++}::jsonb`;
      values.push(JSON.stringify(props));
    }

    const res = await this.pool.query(query, values);
    return res.rows.map(this.mapRowToNode);
  }

  private mapRowToNode(row: any): GraphNode {
    return {
      id: row.id,
      tenantId: row.tenant_id,
      type: row.type,
      props: row.props, // pg driver parses JSON automatically
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  private mapRowToEdge(row: any): GraphEdge {
    return {
      id: row.id,
      tenantId: row.tenant_id,
      fromId: row.from_id,
      toId: row.to_id,
      type: row.type,
      props: row.props,
      createdAt: row.created_at
    };
  }
}
