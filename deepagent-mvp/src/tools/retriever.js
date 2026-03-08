"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ToolRetriever = void 0;
const pg_1 = require("pg");
const config_1 = require("../config");
class ToolRetriever {
    pool;
    constructor() {
        this.pool = new pg_1.Pool(config_1.config.postgres);
    }
    async retrieve(tenantId, query, topK = 5) {
        // a very simple BM25-like scoring
        const searchQuery = `
      SELECT *, ts_rank_cd(to_tsvector('english', name || ' ' || description || ' ' || array_to_string(tags, ' ')), to_tsquery('english', $1)) as score
      FROM tools
      WHERE tenant_id = $2 AND enabled = true
      ORDER BY score DESC
      LIMIT $3
    `;
        const result = await this.pool.query(searchQuery, [query, tenantId, topK]);
        return result.rows;
    }
}
exports.ToolRetriever = ToolRetriever;
