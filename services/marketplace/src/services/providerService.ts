import { v4 as uuidv4 } from 'uuid';
import { db } from '../utils/db.js';
import { cache } from '../utils/cache.js';
import { logger } from '../utils/logger.js';
import type { DataProvider } from '../models/types.js';

const CACHE_TTL = 300; // 5 minutes

export const providerService = {
  async create(params: {
    tenantId: string;
    name: string;
    type: 'individual' | 'organization' | 'government';
    description?: string;
    contactEmail?: string;
  }): Promise<DataProvider> {
    const id = uuidv4();
    const now = new Date();

    const provider: DataProvider = {
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

    await db.query(
      `INSERT INTO data_providers (
        id, tenant_id, name, type, description, contact_email,
        verified, total_transactions, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
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
      ]
    );

    logger.info('Provider created', { providerId: id, name: params.name });
    return provider;
  },

  async findById(id: string): Promise<DataProvider | null> {
    // Check cache first
    const cached = await cache.get<DataProvider>(`provider:${id}`);
    if (cached) return cached;

    const result = await db.query(
      'SELECT * FROM data_providers WHERE id = $1',
      [id]
    );

    if (!result.rows[0]) return null;

    const provider = mapRowToProvider(result.rows[0]);
    await cache.set(`provider:${id}`, provider, CACHE_TTL);
    return provider;
  },

  async findByTenant(tenantId: string): Promise<DataProvider[]> {
    const result = await db.query(
      'SELECT * FROM data_providers WHERE tenant_id = $1 ORDER BY created_at DESC',
      [tenantId]
    );
    return result.rows.map(mapRowToProvider);
  },

  async verify(
    id: string,
    method: string
  ): Promise<DataProvider | null> {
    const result = await db.query(
      `UPDATE data_providers
       SET verified = true, verification_date = NOW(),
           verification_method = $1, status = 'active', updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [method, id]
    );

    if (result.rows[0]) {
      const provider = mapRowToProvider(result.rows[0]);
      await cache.del(`provider:${id}`);
      logger.info('Provider verified', { providerId: id, method });
      return provider;
    }
    return null;
  },

  async updateRating(id: string): Promise<void> {
    // Recalculate average rating from reviews
    const result = await db.query(
      `UPDATE data_providers p
       SET rating = (
         SELECT AVG(overall_rating)::DECIMAL(3,2)
         FROM reviews r
         WHERE r.provider_id = p.id AND r.status = 'approved'
       ),
       updated_at = NOW()
       WHERE id = $1`,
      [id]
    );

    if (result.rowCount && result.rowCount > 0) {
      await cache.del(`provider:${id}`);
    }
  },

  async incrementTransactions(id: string, amount: number): Promise<void> {
    await db.query(
      `UPDATE data_providers
       SET total_transactions = total_transactions + 1,
           total_revenue_cents = total_revenue_cents + $1,
           updated_at = NOW()
       WHERE id = $2`,
      [amount, id]
    );
    await cache.del(`provider:${id}`);
  },

  async search(params: {
    query?: string;
    type?: string;
    verifiedOnly?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<{ providers: DataProvider[]; total: number }> {
    const conditions: string[] = ["status = 'active'"];
    const values: unknown[] = [];
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

    const countResult = await db.query(
      `SELECT COUNT(*) FROM data_providers WHERE ${whereClause}`,
      values
    );

    const result = await db.query(
      `SELECT * FROM data_providers WHERE ${whereClause}
       ORDER BY rating DESC NULLS LAST, total_transactions DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...values, limit, offset]
    );

    return {
      providers: result.rows.map(mapRowToProvider),
      total: parseInt(countResult.rows[0].count, 10),
    };
  },
};

function mapRowToProvider(row: Record<string, unknown>): DataProvider {
  return {
    id: row.id as string,
    tenantId: row.tenant_id as string,
    name: row.name as string,
    type: row.type as DataProvider['type'],
    verified: row.verified as boolean,
    verificationDate: row.verification_date as Date | undefined,
    rating: row.rating as number | undefined,
    totalTransactions: row.total_transactions as number,
    createdAt: row.created_at as Date,
    updatedAt: row.updated_at as Date,
  };
}
