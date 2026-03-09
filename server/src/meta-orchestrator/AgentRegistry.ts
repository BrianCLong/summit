import { Pool } from 'pg';
import { getPostgresPool } from '../config/database.js';
import { Agent, AgentHealth, AgentStatus } from './types.js';

export class AgentRegistry {
  private static instance: AgentRegistry;
  private pool: Pool;

  private constructor() {
    this.pool = getPostgresPool();
  }

  public static getInstance(): AgentRegistry {
    if (!AgentRegistry.instance) {
      AgentRegistry.instance = new AgentRegistry();
    }
    return AgentRegistry.instance;
  }

  public async registerAgent(agent: Omit<Agent, 'status' | 'health'>): Promise<Agent> {
    const query = `
      INSERT INTO agents (
        id, tenant_id, name, description, capabilities, compliance_tags, owner_id, status, config
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (id) DO UPDATE SET
        tenant_id = EXCLUDED.tenant_id,
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        capabilities = EXCLUDED.capabilities,
        compliance_tags = EXCLUDED.compliance_tags,
        owner_id = EXCLUDED.owner_id,
        status = EXCLUDED.status,
        config = EXCLUDED.config,
        updated_at = NOW()
      RETURNING *
    `;
    const values = [
      agent.id,
      agent.tenantId,
      agent.name,
      agent.role, // Mapping role to description for now or could alter table
      agent.capabilities || [],
      [], // complianceTags
      null, // ownerId
      AgentStatus.IDLE,
      JSON.stringify(agent.config || {})
    ];

    const res = await this.pool.query(query, values);
    return this.mapRowToAgent(res.rows[0]);
  }

  public async getAgent(id: string): Promise<Agent | undefined> {
    const query = `SELECT * FROM agents WHERE id = $1`;
    const res = await this.pool.query(query, [id]);
    return res.rows[0] ? this.mapRowToAgent(res.rows[0]) : undefined;
  }

  public async getAllAgents(tenantId?: string): Promise<Agent[]> {
    let query = `SELECT * FROM agents`;
    const params: any[] = [];
    if (tenantId) {
      query += ` WHERE tenant_id = $1`;
      params.push(tenantId);
    }
    query += ` ORDER BY created_at DESC`;
    const res = await this.pool.query(query, params);
    return res.rows.map(this.mapRowToAgent);
  }

  public async updateStatus(id: string, status: AgentStatus): Promise<void> {
    const query = `UPDATE agents SET status = $1, updated_at = NOW() WHERE id = $2`;
    await this.pool.query(query, [status, id]);
  }

  public async updateHealth(id: string, health: Partial<AgentHealth>): Promise<void> {
    const query = `
        UPDATE agents
        SET config = jsonb_set(COALESCE(config, '{}'::jsonb), '{health}', $1::jsonb), updated_at = NOW()
        WHERE id = $2
    `;
    const healthData = JSON.stringify({ ...health, lastHeartbeat: new Date() });
    await this.pool.query(query, [healthData, id]);
  }

  public async removeAgent(id: string): Promise<boolean> {
    const query = `DELETE FROM agents WHERE id = $1`;
    const res = await this.pool.query(query, [id]);
    return (res.rowCount ?? 0) > 0;
  }

  private mapRowToAgent(row: any): Agent {
    const config = row.config || {};
    return {
      id: row.id,
      tenantId: row.tenant_id,
      name: row.name,
      role: row.description || 'agent', // mapping back
      capabilities: row.capabilities || [],
      status: row.status as AgentStatus,
      health: config.health || {
        cpuUsage: 0,
        memoryUsage: 0,
        lastHeartbeat: new Date(),
        activeTasks: 0,
        errorRate: 0
      },
      config: config
    };
  }
}
