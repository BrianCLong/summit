// @ts-nocheck
import { Pool } from 'pg';
import { getPostgresPool } from '../config/database'; // Adjust import if needed
import { logger } from '../config/logger';

export interface SavedQuery {
  id: string;
  name: string;
  description?: string;
  cypher: string;
  parameters: any;
  tags: string[];
  scope: 'private' | 'team' | 'global';
  created_by: string;
  created_at: Date;
  updated_at: Date;
  tenant_id: string;
}

export type CreateSavedQueryInput = Omit<SavedQuery, 'id' | 'created_at' | 'updated_at' | 'created_by' | 'tenant_id'>;

export class SavedQueryService {
  private static instance: SavedQueryService;
  private pool: Pool;

  private constructor() {
     // Lazy load pool
     this.pool = getPostgresPool();
  }

  public static getInstance(): SavedQueryService {
    if (!SavedQueryService.instance) {
      SavedQueryService.instance = new SavedQueryService();
    }
    return SavedQueryService.instance;
  }

  // Ensure schema exists (In prod, this should be a migration)
  public async ensureSchema() {
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
      } catch (err: any) {
          logger.error({ err }, 'Failed to ensure saved_queries schema');
      } finally {
          client.release();
      }
  }

  public async create(input: CreateSavedQueryInput, userId: string, tenantId: string): Promise<SavedQuery> {
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
    } catch (error: any) {
      logger.error({ error, userId }, 'Failed to save query');
      throw error;
    }
  }

  public async list(userId: string, tenantId: string): Promise<SavedQuery[]> {
    const query = `
      SELECT * FROM saved_queries
      WHERE tenant_id = $1 AND (created_by = $2 OR scope IN ('team', 'global'))
      ORDER BY created_at DESC
    `;
    try {
      const res = await this.pool.query(query, [tenantId, userId]);
      return res.rows;
    } catch (error: any) {
      logger.error({ error, userId }, 'Failed to list saved queries');
      throw error;
    }
  }

  public async get(id: string, userId: string, tenantId: string): Promise<SavedQuery | null> {
      const query = `
        SELECT * FROM saved_queries
        WHERE id = $1 AND tenant_id = $2
      `;
      try {
        const res = await this.pool.query(query, [id, tenantId]);
        const found = res.rows[0];
        if (!found) return null;

        // Authorization check
        if (found.scope === 'private' && found.created_by !== userId) {
            throw new Error('Access denied to private query');
        }

        return found;
      } catch (error: any) {
        throw error;
      }
  }
}

export const savedQueryService = SavedQueryService.getInstance();
