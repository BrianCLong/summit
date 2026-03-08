
import { Pool } from 'pg';
import { MaestroAgent, AgentId, TenantId } from './model.js';

export class MaestroAgentService {
  constructor(private db: Pool) {}

  async createAgent(agent: MaestroAgent): Promise<MaestroAgent> {
    await this.db.query(
      `INSERT INTO maestro_agents (id, tenant_id, name, description, capabilities, template_id, config, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [agent.id, agent.tenantId, agent.name, agent.description, agent.capabilities, agent.templateId, agent.config, agent.metadata]
    );
    return agent;
  }

  async getAgent(id: AgentId, tenantId: TenantId): Promise<MaestroAgent | null> {
    const res = await this.db.query(
      `SELECT * FROM maestro_agents WHERE id = $1 AND tenant_id = $2`,
      [id, tenantId]
    );
    if (res.rows.length === 0) return null;
    return res.rows[0];
  }

  async listAgents(tenantId: TenantId): Promise<MaestroAgent[]> {
    const res = await this.db.query(
      `SELECT * FROM maestro_agents WHERE tenant_id = $1`,
      [tenantId]
    );
    return res.rows;
  }
}
