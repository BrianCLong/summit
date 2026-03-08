"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.savedQueryService = exports.SavedQueryService = void 0;
const database_js_1 = require("../config/database.js"); // Adjust import if needed
const logger_js_1 = require("../config/logger.js");
class SavedQueryService {
    static instance;
    pool;
    constructor() {
        // Lazy load pool
        this.pool = (0, database_js_1.getPostgresPool)();
    }
    static getInstance() {
        if (!SavedQueryService.instance) {
            SavedQueryService.instance = new SavedQueryService();
        }
        return SavedQueryService.instance;
    }
    // Ensure schema exists (In prod, this should be a migration)
    async ensureSchema() {
        const client = await this.pool.connect();
        try {
            await client.query(`
            CREATE TABLE IF NOT EXISTS saved_queries (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                name TEXT NOT NULL,
                description TEXT,
                cypher TEXT NOT NULL,
                parameters JSONB DEFAULT '{}',
                tags TEXT[] DEFAULT '{}',
                scope TEXT CHECK (scope IN ('private', 'team', 'global')),
                created_by TEXT NOT NULL,
                tenant_id TEXT NOT NULL,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
            CREATE INDEX IF NOT EXISTS idx_saved_queries_tenant_user ON saved_queries(tenant_id, created_by);
          `);
        }
        catch (err) {
            logger_js_1.logger.error({ err }, 'Failed to ensure saved_queries schema');
        }
        finally {
            client.release();
        }
    }
    async create(input, userId, tenantId) {
        const query = `
      INSERT INTO saved_queries (name, description, cypher, parameters, tags, scope, created_by, tenant_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;
        const values = [
            input.name,
            input.description,
            input.cypher,
            JSON.stringify(input.parameters),
            input.tags,
            input.scope,
            userId,
            tenantId
        ];
        try {
            const res = await this.pool.query(query, values);
            return res.rows[0];
        }
        catch (error) {
            logger_js_1.logger.error({ error, userId }, 'Failed to save query');
            throw error;
        }
    }
    async list(userId, tenantId) {
        const query = `
      SELECT * FROM saved_queries
      WHERE tenant_id = $1 AND (created_by = $2 OR scope IN ('team', 'global'))
      ORDER BY created_at DESC
    `;
        try {
            const res = await this.pool.query(query, [tenantId, userId]);
            return res.rows;
        }
        catch (error) {
            logger_js_1.logger.error({ error, userId }, 'Failed to list saved queries');
            throw error;
        }
    }
    async get(id, userId, tenantId) {
        const query = `
        SELECT * FROM saved_queries
        WHERE id = $1 AND tenant_id = $2
      `;
        try {
            const res = await this.pool.query(query, [id, tenantId]);
            const found = res.rows[0];
            if (!found)
                return null;
            // Authorization check
            if (found.scope === 'private' && found.created_by !== userId) {
                throw new Error('Access denied to private query');
            }
            return found;
        }
        catch (error) {
            throw error;
        }
    }
}
exports.SavedQueryService = SavedQueryService;
exports.savedQueryService = SavedQueryService.getInstance();
