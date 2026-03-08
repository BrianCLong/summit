"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.providerService = void 0;
const uuid_1 = require("uuid");
const db_js_1 = require("../utils/db.js");
const cache_js_1 = require("../utils/cache.js");
const logger_js_1 = require("../utils/logger.js");
const CACHE_TTL = 300; // 5 minutes
exports.providerService = {
    async create(params) {
        const id = (0, uuid_1.v4)();
        const now = new Date();
        const provider = {
            id,
            tenantId: params.tenantId,
            name: params.name,
            type: params.type,
            verified: false,
            rating: undefined,
            totalTransactions: 0,
            createdAt: now,
            updatedAt: now,
        };
        await db_js_1.db.query(`INSERT INTO data_providers (
        id, tenant_id, name, type, description, contact_email,
        verified, total_transactions, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`, [
            provider.id,
            provider.tenantId,
            provider.name,
            provider.type,
            params.description,
            params.contactEmail,
            provider.verified,
            provider.totalTransactions,
            provider.createdAt,
            provider.updatedAt,
        ]);
        logger_js_1.logger.info('Provider created', { providerId: id, name: params.name });
        return provider;
    },
    async findById(id) {
        // Check cache first
        const cached = await cache_js_1.cache.get(`provider:${id}`);
        if (cached) {
            return cached;
        }
        const result = await db_js_1.db.query('SELECT * FROM data_providers WHERE id = $1', [id]);
        if (!result.rows[0]) {
            return null;
        }
        const provider = mapRowToProvider(result.rows[0]);
        await cache_js_1.cache.set(`provider:${id}`, provider, CACHE_TTL);
        return provider;
    },
    async findByTenant(tenantId) {
        const result = await db_js_1.db.query('SELECT * FROM data_providers WHERE tenant_id = $1 ORDER BY created_at DESC', [tenantId]);
        return result.rows.map(mapRowToProvider);
    },
    async verify(id, method) {
        const result = await db_js_1.db.query(`UPDATE data_providers
       SET verified = true, verification_date = NOW(),
           verification_method = $1, status = 'active', updated_at = NOW()
       WHERE id = $2
       RETURNING *`, [method, id]);
        if (result.rows[0]) {
            const provider = mapRowToProvider(result.rows[0]);
            await cache_js_1.cache.del(`provider:${id}`);
            logger_js_1.logger.info('Provider verified', { providerId: id, method });
            return provider;
        }
        return null;
    },
    async updateRating(id) {
        // Recalculate average rating from reviews
        const result = await db_js_1.db.query(`UPDATE data_providers p
       SET rating = (
         SELECT AVG(overall_rating)::DECIMAL(3,2)
         FROM reviews r
         WHERE r.provider_id = p.id AND r.status = 'approved'
       ),
       updated_at = NOW()
       WHERE id = $1`, [id]);
        if (result.rowCount && result.rowCount > 0) {
            await cache_js_1.cache.del(`provider:${id}`);
        }
    },
    async incrementTransactions(id, amount) {
        await db_js_1.db.query(`UPDATE data_providers
       SET total_transactions = total_transactions + 1,
           total_revenue_cents = total_revenue_cents + $1,
           updated_at = NOW()
       WHERE id = $2`, [amount, id]);
        await cache_js_1.cache.del(`provider:${id}`);
    },
    async search(params) {
        const conditions = ["status = 'active'"];
        const values = [];
        let paramIndex = 1;
        if (params.query) {
            conditions.push(`name ILIKE $${paramIndex}`);
            values.push(`%${params.query}%`);
            paramIndex++;
        }
        if (params.type) {
            conditions.push(`type = $${paramIndex}`);
            values.push(params.type);
            paramIndex++;
        }
        if (params.verifiedOnly) {
            conditions.push('verified = true');
        }
        const whereClause = conditions.join(' AND ');
        const limit = params.limit || 20;
        const offset = params.offset || 0;
        const countResult = await db_js_1.db.query(`SELECT COUNT(*) FROM data_providers WHERE ${whereClause}`, values);
        const result = await db_js_1.db.query(`SELECT * FROM data_providers WHERE ${whereClause}
       ORDER BY rating DESC NULLS LAST, total_transactions DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`, [...values, limit, offset]);
        return {
            providers: result.rows.map(mapRowToProvider),
            total: parseInt(countResult.rows[0].count, 10),
        };
    },
};
function mapRowToProvider(row) {
    return {
        id: row.id,
        tenantId: row.tenant_id,
        name: row.name,
        type: row.type,
        verified: row.verified,
        verificationDate: row.verification_date,
        rating: row.rating,
        totalTransactions: row.total_transactions,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}
