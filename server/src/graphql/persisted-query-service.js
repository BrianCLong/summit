"use strict";
/**
 * Service for managing Persisted GraphQL Queries in PostgreSQL
 * Replaces/Enhances the file-based allowlist
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PersistedQueryService = void 0;
const postgres_js_1 = require("../db/postgres.js");
const logger_js_1 = __importDefault(require("../utils/logger.js"));
const persisted_js_1 = require("./persisted.js");
class PersistedQueryService {
    static instance;
    pool;
    constructor() {
        this.pool = (0, postgres_js_1.getPostgresPool)();
    }
    static getInstance() {
        if (!PersistedQueryService.instance) {
            PersistedQueryService.instance = new PersistedQueryService();
        }
        return PersistedQueryService.instance;
    }
    /**
     * List persisted queries, optionally filtered by tenant
     */
    async listQueries(tenantId) {
        try {
            let query = `
        SELECT id, sha256, query, created_by as "createdBy", created_at as "createdAt", tenant_id as "tenantId"
        FROM persisted_queries
      `;
            const params = [];
            if (tenantId) {
                query += ` WHERE tenant_id = $1 OR tenant_id IS NULL`;
                params.push(tenantId);
            }
            query += ` ORDER BY created_at DESC`;
            const result = await this.pool.query(query, params);
            return result.rows;
        }
        catch (error) {
            logger_js_1.default.error({ error, tenantId }, 'Failed to list persisted queries');
            throw error;
        }
    }
    /**
     * Upsert a persisted query
     */
    async upsertQuery(input, userId) {
        const normalized = (0, persisted_js_1.normalizeQuery)(input.query);
        const hash = input.sha256 || (0, persisted_js_1.generateQueryHash)(normalized);
        try {
            const result = await this.pool.query(`
        INSERT INTO persisted_queries (sha256, query, created_by, tenant_id)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (sha256) DO UPDATE SET
          query = EXCLUDED.query,
          created_by = EXCLUDED.created_by,
          created_at = NOW()
        RETURNING id
        `, [hash, normalized, userId, input.tenantId]);
            logger_js_1.default.info({ hash, userId }, 'Upserted persisted query');
            return result.rows[0].id;
        }
        catch (error) {
            logger_js_1.default.error({ error, hash }, 'Failed to upsert persisted query');
            throw error;
        }
    }
    /**
     * Delete a persisted query by ID
     */
    async deleteQuery(id) {
        try {
            const result = await this.pool.query('DELETE FROM persisted_queries WHERE id = $1', [id]);
            return (result.rowCount ?? 0) > 0;
        }
        catch (error) {
            logger_js_1.default.error({ error, id }, 'Failed to delete persisted query');
            throw error;
        }
    }
    /**
     * Verify if a hash exists in the database
     * Used for runtime checks if cache miss
     */
    async getQueryByHash(hash) {
        try {
            const result = await this.pool.query('SELECT query FROM persisted_queries WHERE sha256 = $1', [hash]);
            return result.rows[0]?.query || null;
        }
        catch (error) {
            logger_js_1.default.error({ error, hash }, 'Failed to get query by hash');
            return null;
        }
    }
}
exports.PersistedQueryService = PersistedQueryService;
