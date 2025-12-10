/**
 * Participant Repository - Data access layer for case participants and roles
 */

import { Pool } from 'pg';
import { randomUUID as uuidv4 } from 'crypto';
import logger from '../../../config/logger.js';
import {
  CaseParticipant,
  CaseParticipantInput,
  CaseRole,
  CaseRoleInput,
} from '../types.js';

const repoLogger = logger.child({ name: 'ParticipantRepo' });

export class ParticipantRepo {
  constructor(private pg: Pool) {}

  // ==================== PARTICIPANTS ====================

  /**
   * Add a participant to a case
   */
  async addParticipant(input: CaseParticipantInput): Promise<CaseParticipant> {
    const id = uuidv4();

    const { rows } = await this.pg.query(
      `INSERT INTO maestro.case_participants (
        id, case_id, user_id, role_id, assigned_by, metadata
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (case_id, user_id, role_id)
      WHERE is_active = true
      DO UPDATE SET
        is_active = true,
        removed_at = NULL,
        removed_by = NULL,
        assigned_at = NOW(),
        assigned_by = EXCLUDED.assigned_by
      RETURNING *`,
      [
        id,
        input.caseId,
        input.userId,
        input.roleId,
        input.assignedBy || null,
        JSON.stringify(input.metadata || {}),
      ],
    );

    repoLogger.info(
      {
        caseId: input.caseId,
        userId: input.userId,
        roleId: input.roleId,
      },
      'Participant added to case',
    );

    return this.mapParticipantRow(rows[0]);
  }

  /**
   * Remove a participant from a case
   */
  async removeParticipant(
    caseId: string,
    userId: string,
    roleId: string,
    removedBy: string,
  ): Promise<CaseParticipant | null> {
    const { rows } = await this.pg.query(
      `UPDATE maestro.case_participants
       SET is_active = false,
           removed_at = NOW(),
           removed_by = $4
       WHERE case_id = $1
       AND user_id = $2
       AND role_id = $3
       AND is_active = true
       RETURNING *`,
      [caseId, userId, roleId, removedBy],
    );

    if (rows[0]) {
      repoLogger.info(
        { caseId, userId, roleId },
        'Participant removed from case',
      );
    }

    return rows[0] ? this.mapParticipantRow(rows[0]) : null;
  }

  /**
   * Get all participants for a case
   */
  async getCaseParticipants(
    caseId: string,
    activeOnly = true,
  ): Promise<CaseParticipant[]> {
    let query = `
      SELECT * FROM maestro.case_participants
      WHERE case_id = $1
    `;

    if (activeOnly) {
      query += ` AND is_active = true`;
    }

    query += ` ORDER BY assigned_at DESC`;

    const { rows } = await this.pg.query(query, [caseId]);
    return rows.map(this.mapParticipantRow);
  }

  /**
   * Get participant by case and user
   */
  async getParticipant(
    caseId: string,
    userId: string,
  ): Promise<CaseParticipant[]> {
    const { rows } = await this.pg.query(
      `SELECT * FROM maestro.case_participants
       WHERE case_id = $1 AND user_id = $2 AND is_active = true
       ORDER BY assigned_at DESC`,
      [caseId, userId],
    );

    return rows.map(this.mapParticipantRow);
  }

  /**
   * Get user's role IDs in a case
   */
  async getUserRoleIds(caseId: string, userId: string): Promise<string[]> {
    const { rows } = await this.pg.query(
      `SELECT role_id FROM maestro.case_participants
       WHERE case_id = $1 AND user_id = $2 AND is_active = true`,
      [caseId, userId],
    );

    return rows.map((r) => r.role_id);
  }

  /**
   * Get cases for a user
   */
  async getUserCases(
    userId: string,
    tenantId?: string,
    activeOnly = true,
  ): Promise<string[]> {
    let query = `
      SELECT DISTINCT cp.case_id
      FROM maestro.case_participants cp
      JOIN maestro.cases c ON c.id = cp.case_id
      WHERE cp.user_id = $1
      AND cp.is_active = true
    `;
    const params: any[] = [userId];
    let paramIndex = 2;

    if (tenantId) {
      query += ` AND c.tenant_id = $${paramIndex}`;
      params.push(tenantId);
      paramIndex++;
    }

    if (activeOnly) {
      query += ` AND c.status NOT IN ('closed', 'archived')`;
    }

    const { rows } = await this.pg.query(query, params);
    return rows.map((r) => r.case_id);
  }

  // ==================== ROLES ====================

  /**
   * Create a custom role
   */
  async createRole(input: CaseRoleInput): Promise<CaseRole> {
    const id = uuidv4();

    const { rows } = await this.pg.query(
      `INSERT INTO maestro.case_roles (
        id, name, description, permissions, is_system_role
      )
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *`,
      [
        id,
        input.name,
        input.description || null,
        JSON.stringify(input.permissions || []),
        input.isSystemRole || false,
      ],
    );

    repoLogger.info({ roleId: id, name: input.name }, 'Role created');

    return this.mapRoleRow(rows[0]);
  }

  /**
   * Get role by ID
   */
  async getRole(id: string): Promise<CaseRole | null> {
    const { rows } = await this.pg.query(
      `SELECT * FROM maestro.case_roles WHERE id = $1`,
      [id],
    );

    return rows[0] ? this.mapRoleRow(rows[0]) : null;
  }

  /**
   * Get role by name
   */
  async getRoleByName(name: string): Promise<CaseRole | null> {
    const { rows } = await this.pg.query(
      `SELECT * FROM maestro.case_roles WHERE name = $1`,
      [name],
    );

    return rows[0] ? this.mapRoleRow(rows[0]) : null;
  }

  /**
   * Get all roles
   */
  async listRoles(systemOnly = false): Promise<CaseRole[]> {
    let query = `SELECT * FROM maestro.case_roles`;

    if (systemOnly) {
      query += ` WHERE is_system_role = true`;
    }

    query += ` ORDER BY name ASC`;

    const { rows } = await this.pg.query(query);
    return rows.map(this.mapRoleRow);
  }

  /**
   * Get system role IDs by names
   */
  async getSystemRoleIds(names: string[]): Promise<Record<string, string>> {
    const { rows } = await this.pg.query(
      `SELECT id, name FROM maestro.case_roles
       WHERE name = ANY($1) AND is_system_role = true`,
      [names],
    );

    const roleMap: Record<string, string> = {};
    rows.forEach((r) => {
      roleMap[r.name] = r.id;
    });

    return roleMap;
  }

  /**
   * Update role
   */
  async updateRole(
    id: string,
    updates: Partial<CaseRoleInput>,
  ): Promise<CaseRole | null> {
    // Don't allow updating system roles
    const role = await this.getRole(id);
    if (role?.isSystemRole) {
      throw new Error('Cannot update system roles');
    }

    const updateFields: string[] = [];
    const params: any[] = [id];
    let paramIndex = 2;

    if (updates.name !== undefined) {
      updateFields.push(`name = $${paramIndex}`);
      params.push(updates.name);
      paramIndex++;
    }

    if (updates.description !== undefined) {
      updateFields.push(`description = $${paramIndex}`);
      params.push(updates.description);
      paramIndex++;
    }

    if (updates.permissions !== undefined) {
      updateFields.push(`permissions = $${paramIndex}`);
      params.push(JSON.stringify(updates.permissions));
      paramIndex++;
    }

    if (updateFields.length === 0) {
      return role;
    }

    updateFields.push(`updated_at = NOW()`);

    const { rows } = await this.pg.query(
      `UPDATE maestro.case_roles
       SET ${updateFields.join(', ')}
       WHERE id = $1
       RETURNING *`,
      params,
    );

    return rows[0] ? this.mapRoleRow(rows[0]) : null;
  }

  /**
   * Delete role (only custom roles)
   */
  async deleteRole(id: string): Promise<boolean> {
    // Don't allow deleting system roles
    const role = await this.getRole(id);
    if (role?.isSystemRole) {
      throw new Error('Cannot delete system roles');
    }

    const { rowCount } = await this.pg.query(
      `DELETE FROM maestro.case_roles WHERE id = $1 AND is_system_role = false`,
      [id],
    );

    if (rowCount && rowCount > 0) {
      repoLogger.info({ roleId: id }, 'Role deleted');
    }

    return rowCount !== null && rowCount > 0;
  }

  // ==================== MAPPERS ====================

  private mapParticipantRow(row: any): CaseParticipant {
    return {
      id: row.id,
      caseId: row.case_id,
      userId: row.user_id,
      roleId: row.role_id,
      assignedAt: row.assigned_at,
      assignedBy: row.assigned_by,
      removedAt: row.removed_at,
      removedBy: row.removed_by,
      isActive: row.is_active,
      metadata: row.metadata || {},
    };
  }

  private mapRoleRow(row: any): CaseRole {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      permissions: row.permissions || [],
      isSystemRole: row.is_system_role,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
