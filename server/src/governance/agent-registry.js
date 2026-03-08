"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.agentRegistry = void 0;
const crypto_1 = require("crypto");
const database_js_1 = require("../config/database.js");
class AgentRegistry {
    pool;
    constructor() {
        this.pool = (0, database_js_1.getPostgresPool)();
    }
    async createAgent(input) {
        const id = (0, crypto_1.randomUUID)();
        const query = `
      INSERT INTO agents (
        id, tenant_id, name, description, capabilities, compliance_tags, owner_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
        const values = [
            id,
            input.tenantId,
            input.name,
            input.description || null,
            input.capabilities || [],
            input.complianceTags || [],
            input.ownerId || null,
        ];
        const res = await this.pool.query(query, values);
        return this.mapRowToAgent(res.rows[0]);
    }
    async getAgent(id, tenantId) {
        const query = `SELECT * FROM agents WHERE id = $1 AND tenant_id = $2`;
        const res = await this.pool.query(query, [id, tenantId]);
        return res.rows[0] ? this.mapRowToAgent(res.rows[0]) : null;
    }
    async listAgents(tenantId) {
        const query = `SELECT * FROM agents WHERE tenant_id = $1 ORDER BY created_at DESC`;
        const res = await this.pool.query(query, [tenantId]);
        return res.rows.map(this.mapRowToAgent);
    }
    async updateAgent(id, tenantId, input) {
        const updates = [];
        const values = [id, tenantId];
        let paramIndex = 3;
        if (input.name) {
            updates.push(`name = $${paramIndex++}`);
            values.push(input.name);
        }
        if (input.status) {
            updates.push(`status = $${paramIndex++}`);
            values.push(input.status);
        }
        if (input.capabilities) {
            updates.push(`capabilities = $${paramIndex++}`);
            values.push(input.capabilities);
        }
        if (input.complianceTags) {
            updates.push(`compliance_tags = $${paramIndex++}`);
            values.push(input.complianceTags);
        }
        updates.push(`updated_at = NOW()`);
        const query = `
      UPDATE agents
      SET ${updates.join(', ')}
      WHERE id = $1 AND tenant_id = $2
      RETURNING *
    `;
        const res = await this.pool.query(query, values);
        return res.rows[0] ? this.mapRowToAgent(res.rows[0]) : null;
    }
    async addPolicy(agentId, policy) {
        const id = (0, crypto_1.randomUUID)();
        const query = `
      INSERT INTO agent_policies (
        id, agent_id, name, policy_type, configuration, is_blocking
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
        const values = [
            id,
            agentId,
            policy.name,
            policy.policyType,
            JSON.stringify(policy.configuration),
            policy.isBlocking,
        ];
        const res = await this.pool.query(query, values);
        return this.mapRowToPolicy(res.rows[0]);
    }
    async getPolicies(agentId) {
        const query = `SELECT * FROM agent_policies WHERE agent_id = $1`;
        const res = await this.pool.query(query, [agentId]);
        return res.rows.map(this.mapRowToPolicy);
    }
    mapRowToAgent(row) {
        return {
            id: row.id,
            tenantId: row.tenant_id,
            name: row.name,
            description: row.description,
            version: row.version,
            capabilities: row.capabilities,
            complianceTags: row.compliance_tags,
            status: row.status,
            ownerId: row.owner_id,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
        };
    }
    mapRowToPolicy(row) {
        return {
            id: row.id,
            agentId: row.agent_id,
            name: row.name,
            policyType: row.policy_type,
            configuration: row.configuration, // pg driver automatically parses JSONB
            isBlocking: row.is_blocking,
            createdAt: row.created_at,
        };
    }
}
exports.agentRegistry = new AgentRegistry();
