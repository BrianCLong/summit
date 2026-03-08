"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ToolRegistry = void 0;
const pg_1 = require("pg");
const config_1 = require("../config");
class ToolRegistry {
    pool;
    constructor() {
        this.pool = new pg_1.Pool(config_1.config.postgres);
    }
    async registerTool(tenantId, name, description, openapi, auth, tags) {
        const query = 'INSERT INTO tools (tenant_id, name, description, openapi, auth, tags) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *';
        const result = await this.pool.query(query, [tenantId, name, description, openapi, auth, tags]);
        return result.rows[0];
    }
    async getTool(tenantId, id) {
        const query = 'SELECT * FROM tools WHERE tenant_id = $1 AND id = $2';
        const result = await this.pool.query(query, [tenantId, id]);
        return result.rows[0] || null;
    }
}
exports.ToolRegistry = ToolRegistry;
