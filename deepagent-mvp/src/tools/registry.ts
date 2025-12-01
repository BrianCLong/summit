import { Pool } from 'pg';
import { config } from '../config';
import { Tool } from './schemas';

export class ToolRegistry {
  private pool: Pool;

  constructor() {
    this.pool = new Pool(config.postgres);
  }

  public async registerTool(
    tenantId: string,
    name: string,
    description: string,
    openapi: any,
    auth: any,
    tags: string[]
  ): Promise<Tool> {
    const query = 'INSERT INTO tools (tenant_id, name, description, openapi, auth, tags) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *';
    const result = await this.pool.query(query, [tenantId, name, description, openapi, auth, tags]);
    return result.rows[0];
  }

  public async getTool(tenantId: string, id: string): Promise<Tool | null> {
    const query = 'SELECT * FROM tools WHERE tenant_id = $1 AND id = $2';
    const result = await this.pool.query(query, [tenantId, id]);
    return result.rows[0] || null;
  }
}
