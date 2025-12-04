/**
 * Service for managing Persisted GraphQL Queries in PostgreSQL
 * Replaces/Enhances the file-based allowlist
 */

import { Pool } from 'pg';
import { getPostgresPool } from '../db/postgres.js';
import logger from '../utils/logger.js';
import { normalizeQuery, generateQueryHash } from './persisted.js';

export interface PersistedQuery {
  id: string;
  sha256: string;
  query: string;
  createdBy?: string;
  createdAt: Date;
  tenantId?: string;
}

export interface PersistedQueryInput {
  query: string;
  sha256?: string; // Optional, if not provided it will be calculated
  tenantId?: string;
}

export class PersistedQueryService {
  private static instance: PersistedQueryService;
  private pool: Pool;

  private constructor() {
    this.pool = getPostgresPool();
  }

  public static getInstance(): PersistedQueryService {
    if (!PersistedQueryService.instance) {
      PersistedQueryService.instance = new PersistedQueryService();
    }
    return PersistedQueryService.instance;
  }

  /**
   * List persisted queries, optionally filtered by tenant
   */
  async listQueries(tenantId?: string): Promise<PersistedQuery[]> {
    try {
      let query = `
        SELECT id, sha256, query, created_by as "createdBy", created_at as "createdAt", tenant_id as "tenantId"
        FROM persisted_queries
      `;
      const params: any[] = [];

      if (tenantId) {
        query += ` WHERE tenant_id = $1 OR tenant_id IS NULL`;
        params.push(tenantId);
      }

      query += ` ORDER BY created_at DESC`;

      const result = await this.pool.query(query, params);
      return result.rows;
    } catch (error) {
      logger.error({ error, tenantId }, 'Failed to list persisted queries');
      throw error;
    }
  }

  /**
   * Upsert a persisted query
   */
  async upsertQuery(input: PersistedQueryInput, userId: string): Promise<string> {
    const normalized = normalizeQuery(input.query);
    const hash = input.sha256 || generateQueryHash(normalized);

    try {
      const result = await this.pool.query(
        `
        INSERT INTO persisted_queries (sha256, query, created_by, tenant_id)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (sha256) DO UPDATE SET
          query = EXCLUDED.query,
          created_by = EXCLUDED.created_by,
          created_at = NOW()
        RETURNING id
        `,
        [hash, normalized, userId, input.tenantId]
      );

      logger.info({ hash, userId }, 'Upserted persisted query');
      return result.rows[0].id;
    } catch (error) {
      logger.error({ error, hash }, 'Failed to upsert persisted query');
      throw error;
    }
  }

  /**
   * Delete a persisted query by ID
   */
  async deleteQuery(id: string): Promise<boolean> {
    try {
      const result = await this.pool.query(
        'DELETE FROM persisted_queries WHERE id = $1',
        [id]
      );
      return (result.rowCount ?? 0) > 0;
    } catch (error) {
      logger.error({ error, id }, 'Failed to delete persisted query');
      throw error;
    }
  }

  /**
   * Verify if a hash exists in the database
   * Used for runtime checks if cache miss
   */
  async getQueryByHash(hash: string): Promise<string | null> {
    try {
      const result = await this.pool.query(
        'SELECT query FROM persisted_queries WHERE sha256 = $1',
        [hash]
      );
      return result.rows[0]?.query || null;
    } catch (error) {
      logger.error({ error, hash }, 'Failed to get query by hash');
      return null;
    }
  }
}
