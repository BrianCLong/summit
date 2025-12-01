import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import { db } from '../utils/db.js';
import { cache } from '../utils/cache.js';
import { logger } from '../utils/logger.js';
import type { Transaction } from '../models/types.js';

export interface AccessGrant {
  id: string;
  transactionId: string;
  productId: string;
  granteeId: string;
  accessType: string;
  permissions: Record<string, unknown>;
  apiCallsUsed: number;
  apiCallsLimit?: number;
  downloadsUsed: number;
  downloadsLimit?: number;
  dataTransferredBytes: number;
  apiKeyPrefix: string;
  grantedAt: Date;
  expiresAt?: Date;
  revokedAt?: Date;
  status: 'active' | 'expired' | 'revoked' | 'suspended';
}

export const accessGrantService = {
  async createFromTransaction(transaction: Transaction): Promise<{
    grant: AccessGrant;
    apiKey: string;
  }> {
    const id = uuidv4();
    const now = new Date();

    // Generate API key
    const apiKey = this.generateApiKey();
    const apiKeyHash = this.hashApiKey(apiKey);
    const apiKeyPrefix = apiKey.substring(0, 8);

    // Calculate expiration based on transaction terms
    let expiresAt: Date | undefined;
    if (transaction.durationDays) {
      expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + transaction.durationDays);
    }

    // Default limits based on license type
    const limits = this.getLimitsForLicense(transaction.licenseType);

    const grant: AccessGrant = {
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

    await db.query(
      `INSERT INTO access_grants (
        id, transaction_id, product_id, grantee_id,
        access_type, permissions, api_calls_used, api_calls_limit,
        downloads_used, downloads_limit, data_transferred_bytes,
        api_key_hash, api_key_prefix, granted_at, expires_at, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`,
      [
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
      ]
    );

    logger.info('Access grant created', {
      grantId: id,
      transactionId: transaction.id,
      granteeId: transaction.buyerId,
    });

    return { grant, apiKey };
  },

  async validateApiKey(apiKey: string): Promise<AccessGrant | null> {
    const prefix = apiKey.substring(0, 8);
    const hash = this.hashApiKey(apiKey);

    // Check cache first
    const cached = await cache.get<AccessGrant>(`grant:${prefix}`);
    if (cached) {
      if (cached.status !== 'active') return null;
      if (cached.expiresAt && new Date(cached.expiresAt) < new Date()) return null;
      return cached;
    }

    const result = await db.query(
      `SELECT * FROM access_grants
       WHERE api_key_prefix = $1 AND api_key_hash = $2`,
      [prefix, hash]
    );

    if (!result.rows[0]) return null;

    const grant = mapRowToGrant(result.rows[0]);

    // Validate status and expiration
    if (grant.status !== 'active') return null;
    if (grant.expiresAt && grant.expiresAt < new Date()) {
      await this.expire(grant.id);
      return null;
    }

    // Cache for 5 minutes
    await cache.set(`grant:${prefix}`, grant, 300);

    return grant;
  },

  async recordUsage(
    grantId: string,
    usage: { apiCalls?: number; downloads?: number; bytes?: number }
  ): Promise<{ allowed: boolean; remaining: Record<string, number> }> {
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
    await db.query(
      `UPDATE access_grants
       SET api_calls_used = api_calls_used + $1,
           downloads_used = downloads_used + $2,
           data_transferred_bytes = data_transferred_bytes + $3
       WHERE id = $4`,
      [usage.apiCalls || 0, usage.downloads || 0, usage.bytes || 0, grantId]
    );

    // Invalidate cache
    await cache.del(`grant:${grant.apiKeyPrefix}`);

    return {
      allowed: true,
      remaining: {
        apiCalls: grant.apiCallsLimit ? grant.apiCallsLimit - grant.apiCallsUsed - (usage.apiCalls || 0) : -1,
        downloads: grant.downloadsLimit ? grant.downloadsLimit - grant.downloadsUsed - (usage.downloads || 0) : -1,
      },
    };
  },

  async findById(id: string): Promise<AccessGrant | null> {
    const result = await db.query(
      'SELECT * FROM access_grants WHERE id = $1',
      [id]
    );
    return result.rows[0] ? mapRowToGrant(result.rows[0]) : null;
  },

  async findByGrantee(granteeId: string): Promise<AccessGrant[]> {
    const result = await db.query(
      `SELECT * FROM access_grants
       WHERE grantee_id = $1 AND status = 'active'
       ORDER BY granted_at DESC`,
      [granteeId]
    );
    return result.rows.map(mapRowToGrant);
  },

  async revoke(id: string, reason: string): Promise<AccessGrant | null> {
    const result = await db.query(
      `UPDATE access_grants
       SET status = 'revoked', revoked_at = NOW(), revocation_reason = $1
       WHERE id = $2
       RETURNING *`,
      [reason, id]
    );

    if (result.rows[0]) {
      const grant = mapRowToGrant(result.rows[0]);
      await cache.del(`grant:${grant.apiKeyPrefix}`);
      logger.info('Access grant revoked', { grantId: id, reason });
      return grant;
    }
    return null;
  },

  async expire(id: string): Promise<void> {
    await db.query(
      "UPDATE access_grants SET status = 'expired' WHERE id = $1",
      [id]
    );
    logger.info('Access grant expired', { grantId: id });
  },

  // Check and expire all expired grants
  async expireStale(): Promise<number> {
    const result = await db.query(
      `UPDATE access_grants
       SET status = 'expired'
       WHERE status = 'active' AND expires_at < NOW()
       RETURNING id`
    );
    const count = result.rowCount || 0;
    if (count > 0) {
      logger.info('Expired stale access grants', { count });
    }
    return count;
  },

  generateApiKey(): string {
    const prefix = 'mk_'; // marketplace key
    const random = crypto.randomBytes(32).toString('base64url');
    return `${prefix}${random}`;
  },

  hashApiKey(apiKey: string): string {
    return crypto.createHash('sha256').update(apiKey).digest('hex');
  },

  getLimitsForLicense(licenseType: string): {
    apiCalls?: number;
    downloads?: number;
  } {
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

function mapRowToGrant(row: Record<string, unknown>): AccessGrant {
  return {
    id: row.id as string,
    transactionId: row.transaction_id as string,
    productId: row.product_id as string,
    granteeId: row.grantee_id as string,
    accessType: row.access_type as string,
    permissions: row.permissions as Record<string, unknown>,
    apiCallsUsed: row.api_calls_used as number,
    apiCallsLimit: row.api_calls_limit as number | undefined,
    downloadsUsed: row.downloads_used as number,
    downloadsLimit: row.downloads_limit as number | undefined,
    dataTransferredBytes: row.data_transferred_bytes as number,
    apiKeyPrefix: row.api_key_prefix as string,
    grantedAt: row.granted_at as Date,
    expiresAt: row.expires_at as Date | undefined,
    revokedAt: row.revoked_at as Date | undefined,
    status: row.status as AccessGrant['status'],
  };
}
