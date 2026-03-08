"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.accessGrantService = void 0;
const uuid_1 = require("uuid");
const crypto_1 = __importDefault(require("crypto"));
const db_js_1 = require("../utils/db.js");
const cache_js_1 = require("../utils/cache.js");
const logger_js_1 = require("../utils/logger.js");
exports.accessGrantService = {
    async createFromTransaction(transaction) {
        const id = (0, uuid_1.v4)();
        const now = new Date();
        // Generate API key
        const apiKey = this.generateApiKey();
        const apiKeyHash = this.hashApiKey(apiKey);
        const apiKeyPrefix = apiKey.substring(0, 8);
        // Calculate expiration based on transaction terms
        let expiresAt;
        if (transaction.durationDays) {
            expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + transaction.durationDays);
        }
        // Default limits based on license type
        const limits = this.getLimitsForLicense(transaction.licenseType);
        const grant = {
            id,
            transactionId: transaction.id,
            productId: transaction.productId,
            granteeId: transaction.buyerId,
            accessType: 'api',
            permissions: {
                read: true,
                download: transaction.licenseType !== 'usage_based',
                ...transaction.usageTerms,
            },
            apiCallsUsed: 0,
            apiCallsLimit: limits.apiCalls,
            downloadsUsed: 0,
            downloadsLimit: limits.downloads,
            dataTransferredBytes: 0,
            apiKeyPrefix,
            grantedAt: now,
            expiresAt,
            status: 'active',
        };
        await db_js_1.db.query(`INSERT INTO access_grants (
        id, transaction_id, product_id, grantee_id,
        access_type, permissions, api_calls_used, api_calls_limit,
        downloads_used, downloads_limit, data_transferred_bytes,
        api_key_hash, api_key_prefix, granted_at, expires_at, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`, [
            grant.id,
            grant.transactionId,
            grant.productId,
            grant.granteeId,
            grant.accessType,
            JSON.stringify(grant.permissions),
            grant.apiCallsUsed,
            grant.apiCallsLimit,
            grant.downloadsUsed,
            grant.downloadsLimit,
            grant.dataTransferredBytes,
            apiKeyHash,
            grant.apiKeyPrefix,
            grant.grantedAt,
            grant.expiresAt,
            grant.status,
        ]);
        logger_js_1.logger.info('Access grant created', {
            grantId: id,
            transactionId: transaction.id,
            granteeId: transaction.buyerId,
        });
        return { grant, apiKey };
    },
    async validateApiKey(apiKey) {
        const prefix = apiKey.substring(0, 8);
        const hash = this.hashApiKey(apiKey);
        // Check cache first
        const cached = await cache_js_1.cache.get(`grant:${prefix}`);
        if (cached) {
            if (cached.status !== 'active') {
                return null;
            }
            if (cached.expiresAt && new Date(cached.expiresAt) < new Date()) {
                return null;
            }
            return cached;
        }
        const result = await db_js_1.db.query(`SELECT * FROM access_grants
       WHERE api_key_prefix = $1 AND api_key_hash = $2`, [prefix, hash]);
        if (!result.rows[0]) {
            return null;
        }
        const grant = mapRowToGrant(result.rows[0]);
        // Validate status and expiration
        if (grant.status !== 'active') {
            return null;
        }
        if (grant.expiresAt && grant.expiresAt < new Date()) {
            await this.expire(grant.id);
            return null;
        }
        // Cache for 5 minutes
        await cache_js_1.cache.set(`grant:${prefix}`, grant, 300);
        return grant;
    },
    async recordUsage(grantId, usage) {
        const grant = await this.findById(grantId);
        if (!grant || grant.status !== 'active') {
            return { allowed: false, remaining: {} };
        }
        // Check limits
        if (grant.apiCallsLimit !== undefined) {
            const newApiCalls = grant.apiCallsUsed + (usage.apiCalls || 0);
            if (newApiCalls > grant.apiCallsLimit) {
                return {
                    allowed: false,
                    remaining: { apiCalls: Math.max(0, grant.apiCallsLimit - grant.apiCallsUsed) },
                };
            }
        }
        if (grant.downloadsLimit !== undefined && usage.downloads) {
            const newDownloads = grant.downloadsUsed + usage.downloads;
            if (newDownloads > grant.downloadsLimit) {
                return {
                    allowed: false,
                    remaining: { downloads: Math.max(0, grant.downloadsLimit - grant.downloadsUsed) },
                };
            }
        }
        // Update usage
        await db_js_1.db.query(`UPDATE access_grants
       SET api_calls_used = api_calls_used + $1,
           downloads_used = downloads_used + $2,
           data_transferred_bytes = data_transferred_bytes + $3
       WHERE id = $4`, [usage.apiCalls || 0, usage.downloads || 0, usage.bytes || 0, grantId]);
        // Invalidate cache
        await cache_js_1.cache.del(`grant:${grant.apiKeyPrefix}`);
        return {
            allowed: true,
            remaining: {
                apiCalls: grant.apiCallsLimit ? grant.apiCallsLimit - grant.apiCallsUsed - (usage.apiCalls || 0) : -1,
                downloads: grant.downloadsLimit ? grant.downloadsLimit - grant.downloadsUsed - (usage.downloads || 0) : -1,
            },
        };
    },
    async findById(id) {
        const result = await db_js_1.db.query('SELECT * FROM access_grants WHERE id = $1', [id]);
        return result.rows[0] ? mapRowToGrant(result.rows[0]) : null;
    },
    async findByGrantee(granteeId) {
        const result = await db_js_1.db.query(`SELECT * FROM access_grants
       WHERE grantee_id = $1 AND status = 'active'
       ORDER BY granted_at DESC`, [granteeId]);
        return result.rows.map(mapRowToGrant);
    },
    async revoke(id, reason) {
        const result = await db_js_1.db.query(`UPDATE access_grants
       SET status = 'revoked', revoked_at = NOW(), revocation_reason = $1
       WHERE id = $2
       RETURNING *`, [reason, id]);
        if (result.rows[0]) {
            const grant = mapRowToGrant(result.rows[0]);
            await cache_js_1.cache.del(`grant:${grant.apiKeyPrefix}`);
            logger_js_1.logger.info('Access grant revoked', { grantId: id, reason });
            return grant;
        }
        return null;
    },
    async expire(id) {
        await db_js_1.db.query("UPDATE access_grants SET status = 'expired' WHERE id = $1", [id]);
        logger_js_1.logger.info('Access grant expired', { grantId: id });
    },
    // Check and expire all expired grants
    async expireStale() {
        const result = await db_js_1.db.query(`UPDATE access_grants
       SET status = 'expired'
       WHERE status = 'active' AND expires_at < NOW()
       RETURNING id`);
        const count = result.rowCount || 0;
        if (count > 0) {
            logger_js_1.logger.info('Expired stale access grants', { count });
        }
        return count;
    },
    generateApiKey() {
        const prefix = 'mk_'; // marketplace key
        const random = crypto_1.default.randomBytes(32).toString('base64url');
        return `${prefix}${random}`;
    },
    hashApiKey(apiKey) {
        return crypto_1.default.createHash('sha256').update(apiKey).digest('hex');
    },
    getLimitsForLicense(licenseType) {
        switch (licenseType) {
            case 'single_use':
                return { apiCalls: 100, downloads: 1 };
            case 'time_limited':
                return { apiCalls: 10000, downloads: 10 };
            case 'usage_based':
                return { apiCalls: 1000 }; // Pay per additional
            case 'enterprise':
                return {}; // Unlimited
            case 'unlimited':
                return {}; // Unlimited
            default:
                return { apiCalls: 1000, downloads: 5 };
        }
    },
};
function mapRowToGrant(row) {
    return {
        id: row.id,
        transactionId: row.transaction_id,
        productId: row.product_id,
        granteeId: row.grantee_id,
        accessType: row.access_type,
        permissions: row.permissions,
        apiCallsUsed: row.api_calls_used,
        apiCallsLimit: row.api_calls_limit,
        downloadsUsed: row.downloads_used,
        downloadsLimit: row.downloads_limit,
        dataTransferredBytes: row.data_transferred_bytes,
        apiKeyPrefix: row.api_key_prefix,
        grantedAt: row.granted_at,
        expiresAt: row.expires_at,
        revokedAt: row.revoked_at,
        status: row.status,
    };
}
