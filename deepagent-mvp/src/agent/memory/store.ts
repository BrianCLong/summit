import { Pool } from 'pg';
import { config } from '../../config';
import { EpisodicMemory, WorkingMemory, ToolMemory } from './schemas';

export class MemoryStore {
  private pool: Pool;

  constructor() {
    this.pool = new Pool(config.postgres);
  }

  public async addEpisodicMemory(tenantId: string, memory: EpisodicMemory): Promise<void> {
    const query = 'INSERT INTO episodic_memory (tenant_id, run_id, step, event_json) VALUES ($1, $2, $3, $4)';
    await this.pool.query(query, [tenantId, memory.run_id, memory.step, memory.event_json]);
  }

  public async getEpisodicMemory(tenantId: string, runId: string): Promise<EpisodicMemory[]> {
    const query = 'SELECT * FROM episodic_memory WHERE tenant_id = $1 AND run_id = $2 ORDER BY step ASC';
    const result = await this.pool.query(query, [tenantId, runId]);
    return result.rows;
  }

  public async updateWorkingMemory(tenantId: string, memory: WorkingMemory): Promise<void> {
    const query = 'INSERT INTO working_memory (tenant_id, run_id, summary, key_facts) VALUES ($1, $2, $3, $4) ON CONFLICT (run_id) DO UPDATE SET summary = $3, key_facts = $4';
    await this.pool.query(query, [tenantId, memory.run_id, memory.summary, memory.key_facts]);
  }

  public async getWorkingMemory(tenantId: string, runId: string): Promise<WorkingMemory | null> {
    const query = 'SELECT * FROM working_memory WHERE tenant_id = $1 AND run_id = $2';
    const result = await this.pool.query(query, [tenantId, runId]);
    return result.rows[0] || null;
  }

  public async updateToolMemory(tenantId: string, memory: ToolMemory): Promise<void> {
    const query = 'INSERT INTO tool_memory (tenant_id, run_id, tool_id, usage_stats, last_result) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (run_id, tool_id) DO UPDATE SET usage_stats = $4, last_result = $5';
    await this.pool.query(query, [tenantId, memory.run_id, memory.tool_id, memory.usage_stats, memory.last_result]);
  }

  public async getToolMemory(tenantId: string, runId: string, toolId: string): Promise<ToolMemory | null> {
    const query = 'SELECT * FROM tool_memory WHERE tenant_id = $1 AND run_id = $2 AND tool_id = $3';
    const result = await this.pool.query(query, [tenantId, runId, toolId]);
    return result.rows[0] || null;
  }
}
