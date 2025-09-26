/**
 * Investigation Repository - Production persistence layer
 * Handles investigation/case management with PostgreSQL
 */

import { Pool } from 'pg';
import { randomUUID as uuidv4 } from 'crypto';
import { withTenantConnection } from '../db/tenants/postgresTenancy.js';

export interface Investigation {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  status: 'active' | 'archived' | 'completed';
  props: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

export interface InvestigationInput {
  tenantId: string;
  name: string;
  description?: string;
  status?: 'active' | 'archived' | 'completed';
  props?: Record<string, any>;
}

export interface InvestigationUpdateInput {
  id: string;
  tenantId: string;
  name?: string;
  description?: string;
  status?: 'active' | 'archived' | 'completed';
  props?: Record<string, any>;
}

interface InvestigationRow {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  status: string;
  props: any;
  created_at: Date;
  updated_at: Date;
  created_by: string;
}

export class InvestigationRepo {
  constructor(private pg: Pool) {}

  /**
   * Create new investigation
   */
  async create(input: InvestigationInput, userId: string): Promise<Investigation> {
    const id = uuidv4();

    const row = await withTenantConnection(
      input.tenantId,
      async (client) => {
        const { rows } = await client.query<InvestigationRow>(
          `INSERT INTO investigations (id, tenant_id, name, description, status, props, created_by)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           RETURNING *`,
          [
            id,
            input.tenantId,
            input.name,
            input.description || null,
            input.status || 'active',
            JSON.stringify(input.props || {}),
            userId,
          ],
        );

        return rows[0];
      },
      { pool: this.pg }
    );

    return this.mapRow(row);
  }

  /**
   * Update investigation
   */
  async update(input: InvestigationUpdateInput): Promise<Investigation | null> {
    const row = await withTenantConnection(
      input.tenantId,
      async (client) => {
        const updateFields: string[] = [];
        const params: any[] = [input.id];
        let paramIndex = 2;

        if (input.name !== undefined) {
          updateFields.push(`name = $${paramIndex}`);
          params.push(input.name);
          paramIndex++;
        }

        if (input.description !== undefined) {
          updateFields.push(`description = $${paramIndex}`);
          params.push(input.description);
          paramIndex++;
        }

        if (input.status !== undefined) {
          updateFields.push(`status = $${paramIndex}`);
          params.push(input.status);
          paramIndex++;
        }

        if (input.props !== undefined) {
          updateFields.push(`props = $${paramIndex}`);
          params.push(JSON.stringify(input.props));
          paramIndex++;
        }

        if (updateFields.length === 0) {
          const { rows } = await client.query<InvestigationRow>(
            `SELECT * FROM investigations WHERE id = $1`,
            [input.id],
          );
          return rows[0] ?? null;
        }

        updateFields.push(`updated_at = now()`);

        const { rows } = await client.query<InvestigationRow>(
          `UPDATE investigations SET ${updateFields.join(', ')}
           WHERE id = $1
           RETURNING *`,
          params,
        );

        return rows[0] ?? null;
      },
      { pool: this.pg }
    );

    return row ? this.mapRow(row) : null;
  }

  /**
   * Delete investigation (cascade to related entities)
   */
  async delete(id: string, tenantId: string): Promise<boolean> {
    return await withTenantConnection(
      tenantId,
      async (client) => {
        const { rowCount } = await client.query(`DELETE FROM investigations WHERE id = $1`, [id]);
        return rowCount !== null && rowCount > 0;
      },
      { pool: this.pg }
    );
  }

  /**
   * Find investigation by ID
   */
  async findById(id: string, tenantId: string): Promise<Investigation | null> {
    const row = await withTenantConnection(
      tenantId,
      async (client) => {
        const { rows } = await client.query<InvestigationRow>(
          `SELECT * FROM investigations WHERE id = $1`,
          [id],
        );
        return rows[0] ?? null;
      },
      { pool: this.pg }
    );

    return row ? this.mapRow(row) : null;
  }

  /**
   * List investigations with filters
   */
  async list({
    tenantId,
    status,
    limit = 50,
    offset = 0,
  }: {
    tenantId: string;
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<Investigation[]> {
    const rows = await withTenantConnection(
      tenantId,
      async (client) => {
        const params: any[] = [];
        let query = `SELECT * FROM investigations`;
        const conditions: string[] = ['TRUE'];

        if (status) {
          params.push(status);
          conditions.push(`status = $${params.length}`);
        }

        query += ` WHERE ${conditions.join(' AND ')}`;
        params.push(Math.min(limit, 1000));
        params.push(offset);
        query += ` ORDER BY created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`;

        const { rows } = await client.query<InvestigationRow>(query, params);
        return rows;
      },
      { pool: this.pg }
    );

    return rows.map(this.mapRow);
  }

  /**
   * Get investigation statistics
   */
  async getStats(
    investigationId: string,
    tenantId: string,
  ): Promise<{
    entityCount: number;
    relationshipCount: number;
  }> {
    // This assumes you'll add investigation_id to entities/relationships tables
    // or implement a different association mechanism
    const results = await withTenantConnection(
      tenantId,
      async (client) => {
        const entityQuery = `
          SELECT COUNT(*) as count
          FROM entities
          WHERE props->>'investigationId' = $1
        `;

        const relationshipQuery = `
          SELECT COUNT(*) as count
          FROM relationships
          WHERE props->>'investigationId' = $1
        `;

        const [entityResult, relationshipResult] = await Promise.all([
          client.query(entityQuery, [investigationId]),
          client.query(relationshipQuery, [investigationId]),
        ]);

        return {
          entity: entityResult.rows[0]?.count || '0',
          relationships: relationshipResult.rows[0]?.count || '0',
        };
      },
      { pool: this.pg }
    );

    return {
      entityCount: parseInt(results.entity || '0'),
      relationshipCount: parseInt(results.relationships || '0'),
    };
  }

  /**
   * Batch load investigations by IDs (for DataLoader)
   */
  async batchByIds(ids: readonly string[], tenantId: string): Promise<(Investigation | null)[]> {
    if (ids.length === 0) return [];

    const rows = await withTenantConnection(
      tenantId,
      async (client) => {
        const { rows } = await client.query<InvestigationRow>(
          `SELECT * FROM investigations WHERE id = ANY($1)`,
          [ids],
        );
        return rows;
      },
      { pool: this.pg }
    );

    const investigationsMap = new Map(rows.map((row) => [row.id, this.mapRow(row)]));

    return ids.map((id) => investigationsMap.get(id) || null);
  }

  /**
   * Map database row to domain object
   */
  private mapRow(row: InvestigationRow): Investigation {
    return {
      id: row.id,
      tenantId: row.tenant_id,
      name: row.name,
      description: row.description || undefined,
      status: row.status as 'active' | 'archived' | 'completed',
      props: row.props,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      createdBy: row.created_by,
    };
  }
}
