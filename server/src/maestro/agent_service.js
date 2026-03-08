"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MaestroAgentService = void 0;
class MaestroAgentService {
    db;
    constructor(db) {
        this.db = db;
    }
    async createAgent(agent) {
        await this.db.query(`INSERT INTO maestro_agents (id, tenant_id, name, description, capabilities, template_id, config, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`, [agent.id, agent.tenantId, agent.name, agent.description, agent.capabilities, agent.templateId, agent.config, agent.metadata]);
        return agent;
    }
    async getAgent(id, tenantId) {
        const res = await this.db.query(`SELECT * FROM maestro_agents WHERE id = $1 AND tenant_id = $2`, [id, tenantId]);
        if (res.rows.length === 0)
            return null;
        return res.rows[0];
    }
    async listAgents(tenantId) {
        const res = await this.db.query(`SELECT * FROM maestro_agents WHERE tenant_id = $1`, [tenantId]);
        return res.rows;
    }
}
exports.MaestroAgentService = MaestroAgentService;
