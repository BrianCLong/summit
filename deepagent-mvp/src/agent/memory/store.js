"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MemoryStore = void 0;
const pg_1 = require("pg");
const config_1 = require("../../config");
class MemoryStore {
    pool;
    constructor() {
        this.pool = new pg_1.Pool(config_1.config.postgres);
    }
    async addEpisodicMemory(tenantId, memory) {
        const query = 'INSERT INTO episodic_memory (tenant_id, run_id, step, event_json) VALUES ($1, $2, $3, $4)';
        await this.pool.query(query, [tenantId, memory.run_id, memory.step, memory.event_json]);
    }
    async getEpisodicMemory(tenantId, runId) {
        const query = 'SELECT * FROM episodic_memory WHERE tenant_id = $1 AND run_id = $2 ORDER BY step ASC';
        const result = await this.pool.query(query, [tenantId, runId]);
        return result.rows;
    }
    async updateWorkingMemory(tenantId, memory, retentionTier = 'standard') {
        const query = 'INSERT INTO working_memory (tenant_id, run_id, summary, key_facts, retention_tier) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (run_id) DO UPDATE SET summary = $3, key_facts = $4, retention_tier = $5';
        await this.pool.query(query, [tenantId, memory.run_id, memory.summary, memory.key_facts, retentionTier]);
    }
    async getWorkingMemory(tenantId, runId) {
        const query = 'SELECT * FROM working_memory WHERE tenant_id = $1 AND run_id = $2';
        const result = await this.pool.query(query, [tenantId, runId]);
        return result.rows[0] || null;
    }
    async updateToolMemory(tenantId, memory) {
        const query = 'INSERT INTO tool_memory (tenant_id, run_id, tool_id, usage_stats, last_result) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (run_id, tool_id) DO UPDATE SET usage_stats = $4, last_result = $5';
        await this.pool.query(query, [tenantId, memory.run_id, memory.tool_id, memory.usage_stats, memory.last_result]);
    }
    async getToolMemory(tenantId, runId, toolId) {
        const query = 'SELECT * FROM tool_memory WHERE tenant_id = $1 AND run_id = $2 AND tool_id = $3';
        const result = await this.pool.query(query, [tenantId, runId, toolId]);
        return result.rows[0] || null;
    }
    async pruneEpisodicMemory(tenantId, runId, keep = 10) {
        const query = `
      DELETE FROM episodic_memory
      WHERE (run_id, step) IN (
        SELECT run_id, step
        FROM episodic_memory
        WHERE tenant_id = $1 AND run_id = $2
        ORDER BY step DESC
        OFFSET $3
      )
    `;
        await this.pool.query(query, [tenantId, runId, keep]);
    }
    async purge(retentionTier, days) {
        const query = `
      DELETE FROM working_memory
      WHERE retention_tier = $1 AND ts < NOW() - INTERVAL '${days} days'
    `;
        await this.pool.query(query, [retentionTier]);
    }
}
exports.MemoryStore = MemoryStore;
