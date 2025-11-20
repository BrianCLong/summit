/**
 * Case Repository - Case Spaces management with compartmentalization
 * Handles CRUD operations for cases with policy-based access control
 */

// @ts-ignore - pg type imports
import { Pool, PoolClient } from 'pg';
import { randomUUID as uuidv4 } from 'crypto';
import logger from '../config/logger.js';

const repoLogger = logger.child({ name: 'CaseRepo' });

export type CaseStatus = 'open' | 'active' | 'closed' | 'archived';

export interface Case {
  id: string;
  tenantId: string;
  title: string;
  description?: string;
  status: CaseStatus;
  compartment?: string;
  policyLabels: string[];
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  closedAt?: Date;
  closedBy?: string;
}

export interface CaseInput {
  tenantId: string;
  title: string;
  description?: string;
  status?: CaseStatus;
  compartment?: string;
  policyLabels?: string[];
  metadata?: Record<string, any>;
}

export interface CaseUpdateInput {
  id: string;
  title?: string;
  description?: string;
  status?: CaseStatus;
  compartment?: string;
  policyLabels?: string[];
  metadata?: Record<string, any>;
}

interface CaseRow {
  id: string;
  tenant_id: string;
  title: string;
  description: string | null;
  status: string;
  compartment: string | null;
  policy_labels: string[];
  metadata: any;
  created_at: Date;
  updated_at: Date;
  created_by: string;
  closed_at: Date | null;
  closed_by: string | null;
}

export class CaseRepo {
  constructor(private pg: Pool) {}

  /**
   * Create a new case
   */
  async create(input: CaseInput, userId: string): Promise<Case> {
    const id = uuidv4();

    const { rows } = (await this.pg.query(
      `INSERT INTO maestro.cases (
        id, tenant_id, title, description, status, compartment,
        policy_labels, metadata, created_by
      )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        id,
        input.tenantId,
        input.title,
        input.description || null,
        input.status || 'open',
        input.compartment || null,
        input.policyLabels || [],
        JSON.stringify(input.metadata || {}),
        userId,
      ],
    )) as { rows: CaseRow[] };

    repoLogger.info(
      {
        caseId: id,
        tenantId: input.tenantId,
        title: input.title,
        compartment: input.compartment,
      },
      'Case created',
    );

    return this.mapRow(rows[0]);
  }

  /**
   * Update an existing case
   */
  async update(input: CaseUpdateInput, userId?: string): Promise<Case | null> {
    const updateFields: string[] = [];
    const params: any[] = [input.id];
    let paramIndex = 2;

    if (input.title !== undefined) {
      updateFields.push(`title = $${paramIndex}`);
      params.push(input.title);
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

      // Auto-set closed_at and closed_by when status changes to 'closed'
      if (input.status === 'closed' && userId) {
        updateFields.push(`closed_at = NOW()`);
        updateFields.push(`closed_by = $${paramIndex}`);
        params.push(userId);
        paramIndex++;
      }
    }

    if (input.compartment !== undefined) {
      updateFields.push(`compartment = $${paramIndex}`);
      params.push(input.compartment);
      paramIndex++;
    }

    if (input.policyLabels !== undefined) {
      updateFields.push(`policy_labels = $${paramIndex}`);
      params.push(input.policyLabels);
      paramIndex++;
    }

    if (input.metadata !== undefined) {
      updateFields.push(`metadata = $${paramIndex}`);
      params.push(JSON.stringify(input.metadata));
      paramIndex++;
    }

    if (updateFields.length === 0) {
      return await this.findById(input.id);
    }

    updateFields.push(`updated_at = NOW()`);

    const { rows } = (await this.pg.query(
      `UPDATE maestro.cases SET ${updateFields.join(', ')}
       WHERE id = $1
       RETURNING *`,
      params,
    )) as { rows: CaseRow[] };

    if (rows[0]) {
      repoLogger.info(
        {
          caseId: input.id,
          updatedFields: Object.keys(input).filter((k) => k !== 'id'),
        },
        'Case updated',
      );
    }

    return rows[0] ? this.mapRow(rows[0]) : null;
  }

  /**
   * Delete a case (soft delete by archiving recommended, but hard delete supported)
   */
  async delete(id: string): Promise<boolean> {
    const client = await this.pg.connect();

    try {
      await client.query('BEGIN');

      // Check if case has audit logs (should not delete if it does)
      const { rows: auditLogs } = await client.query(
        `SELECT id FROM maestro.audit_access_logs WHERE case_id = $1 LIMIT 1`,
        [id],
      );

      if (auditLogs.length > 0) {
        throw new Error(
          'Cannot delete case with existing audit logs. Archive the case instead.',
        );
      }

      const { rowCount } = await client.query(
        `DELETE FROM maestro.cases WHERE id = $1`,
        [id],
      );

      await client.query('COMMIT');

      if (rowCount && rowCount > 0) {
        repoLogger.warn({ caseId: id }, 'Case deleted');
      }

      return rowCount !== null && rowCount > 0;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Archive a case (soft delete - preferred method)
   */
  async archive(id: string, userId: string): Promise<Case | null> {
    return this.update({ id, status: 'archived' }, userId);
  }

  /**
   * Find case by ID
   */
  async findById(id: string, tenantId?: string): Promise<Case | null> {
    const params = [id];
    let query = `SELECT * FROM maestro.cases WHERE id = $1`;

    if (tenantId) {
      query += ` AND tenant_id = $2`;
      params.push(tenantId);
    }

    const { rows } = (await this.pg.query(query, params)) as {
      rows: CaseRow[];
    };
    return rows[0] ? this.mapRow(rows[0]) : null;
  }

  /**
   * List cases with filters
   */
  async list({
    tenantId,
    status,
    compartment,
    policyLabels,
    limit = 50,
    offset = 0,
  }: {
    tenantId: string;
    status?: CaseStatus;
    compartment?: string;
    policyLabels?: string[];
    limit?: number;
    offset?: number;
  }): Promise<Case[]> {
    const params: any[] = [tenantId];
    let query = `SELECT * FROM maestro.cases WHERE tenant_id = $1`;
    let paramIndex = 2;

    if (status) {
      query += ` AND status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (compartment) {
      query += ` AND compartment = $${paramIndex}`;
      params.push(compartment);
      paramIndex++;
    }

    if (policyLabels && policyLabels.length > 0) {
      query += ` AND policy_labels && $${paramIndex}`;
      params.push(policyLabels);
      paramIndex++;
    }

    query += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(Math.min(limit, 1000), offset);

    const { rows } = (await this.pg.query(query, params)) as {
      rows: CaseRow[];
    };
    return rows.map(this.mapRow);
  }

  /**
   * Count cases with filters
   */
  async count({
    tenantId,
    status,
    compartment,
    policyLabels,
  }: {
    tenantId: string;
    status?: CaseStatus;
    compartment?: string;
    policyLabels?: string[];
  }): Promise<number> {
    const params: any[] = [tenantId];
    let query = `SELECT COUNT(*) as count FROM maestro.cases WHERE tenant_id = $1`;
    let paramIndex = 2;

    if (status) {
      query += ` AND status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (compartment) {
      query += ` AND compartment = $${paramIndex}`;
      params.push(compartment);
      paramIndex++;
    }

    if (policyLabels && policyLabels.length > 0) {
      query += ` AND policy_labels && $${paramIndex}`;
      params.push(policyLabels);
      paramIndex++;
    }

    const { rows } = await this.pg.query(query, params);
    return parseInt(rows[0]?.count || '0', 10);
  }

  /**
   * Batch load cases by IDs (for DataLoader)
   */
  async batchByIds(
    ids: readonly string[],
    tenantId?: string,
  ): Promise<(Case | null)[]> {
    if (ids.length === 0) return [];

    const params: any[] = [ids];
    let query = `SELECT * FROM maestro.cases WHERE id = ANY($1)`;

    if (tenantId) {
      query += ` AND tenant_id = $2`;
      params.push(tenantId);
    }

    const { rows } = (await this.pg.query(query, params)) as {
      rows: CaseRow[];
    };
    const casesMap = new Map(rows.map((row) => [row.id, this.mapRow(row)]));

    return ids.map((id) => casesMap.get(id) || null);
  }

  /**
   * Get cases by policy label
   */
  async findByPolicyLabel(
    tenantId: string,
    policyLabel: string,
    limit = 50,
  ): Promise<Case[]> {
    const { rows } = (await this.pg.query(
      `SELECT * FROM maestro.cases
       WHERE tenant_id = $1 AND $2 = ANY(policy_labels)
       ORDER BY created_at DESC
       LIMIT $3`,
      [tenantId, policyLabel, limit],
    )) as { rows: CaseRow[] };

    return rows.map(this.mapRow);
  }

  /**
   * Map database row to domain object
   */
  private mapRow(row: CaseRow): Case {
    return {
      id: row.id,
      tenantId: row.tenant_id,
      title: row.title,
      description: row.description || undefined,
      status: row.status as CaseStatus,
      compartment: row.compartment || undefined,
      policyLabels: row.policy_labels || [],
      metadata: row.metadata || {},
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      createdBy: row.created_by,
      closedAt: row.closed_at || undefined,
      closedBy: row.closed_by || undefined,
    };
  }
}
