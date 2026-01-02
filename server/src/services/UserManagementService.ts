// @ts-nocheck
/**
 * User Management Service
 *
 * Provides comprehensive user management capabilities for admin operations:
 * - User CRUD operations with multi-tenant support
 * - Role assignment and revocation
 * - User status management (activate, deactivate, lock)
 * - Bulk operations with governance audit trail
 *
 * All outputs are wrapped in DataEnvelope with mandatory GovernanceVerdict
 * for SOC 2 compliance (CC6.1, CC7.2, PI1.1).
 *
 * @module services/UserManagementService
 */

import { Pool, PoolClient } from 'pg';
import { randomUUID, createHash } from 'crypto';
import * as argon2 from 'argon2';
import { z } from 'zod';
import { getPostgresPool } from '../config/database.js';
import logger from '../utils/logger.js';
import { provenanceLedger } from '../provenance/ledger.js';
import {
  createDataEnvelope,
  DataEnvelope,
  DataClassification,
  GovernanceVerdict,
  GovernanceResult,
} from '../types/data-envelope.js';

// ============================================================================
// Input Validation Schemas
// ============================================================================

export const createUserSchema = z.object({
  email: z.string().email('Invalid email format'),
  username: z.string().min(3).max(50).optional(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  role: z.enum(['ADMIN', 'ANALYST', 'VIEWER', 'DEVELOPER', 'COMPLIANCE_OFFICER']).default('ANALYST'),
  tenantId: z.string().uuid().optional(),
});

export const updateUserSchema = z.object({
  email: z.string().email().optional(),
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  role: z.enum(['ADMIN', 'ANALYST', 'VIEWER', 'DEVELOPER', 'COMPLIANCE_OFFICER']).optional(),
  isActive: z.boolean().optional(),
});

export const listUsersSchema = z.object({
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  role: z.string().optional(),
  isActive: z.boolean().optional(),
  sortBy: z.enum(['email', 'firstName', 'lastName', 'createdAt', 'lastLogin']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type ListUsersInput = z.infer<typeof listUsersSchema>;

// ============================================================================
// Types
// ============================================================================

export interface ManagedUser {
  id: string;
  email: string;
  username?: string;
  firstName: string;
  lastName: string;
  fullName: string;
  role: string;
  tenantId: string;
  tenantIds: string[];
  isActive: boolean;
  isLocked: boolean;
  lockReason?: string;
  lastLogin?: Date;
  mfaEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
}

export interface UserListResult {
  users: ManagedUser[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface UserOperationResult {
  success: boolean;
  user?: ManagedUser;
  message: string;
}

interface DatabaseUser {
  id: string;
  email: string;
  username?: string;
  first_name: string;
  last_name: string;
  role: string;
  tenant_id: string;
  is_active: boolean;
  is_locked: boolean;
  lock_reason?: string;
  last_login?: Date;
  mfa_enabled: boolean;
  created_at: Date;
  updated_at: Date;
  created_by?: string;
}

// ============================================================================
// Service Implementation
// ============================================================================

export class UserManagementService {
  private pool: Pool;

  constructor() {
    this.pool = getPostgresPool();
  }

  /**
   * Create a governance verdict for user management operations
   */
  private createVerdict(
    action: string,
    result: GovernanceResult,
    actorId: string,
    reason?: string
  ): GovernanceVerdict {
    return {
      verdictId: `verdict-${randomUUID()}`,
      policyId: 'policy:user-management:v1',
      result,
      decidedAt: new Date(),
      reason: reason || `User management action: ${action}`,
      evaluator: 'UserManagementService',
    };
  }

  /**
   * List users with pagination and filtering
   * Returns DataEnvelope with GovernanceVerdict
   */
  async listUsers(
    tenantId: string,
    input: ListUsersInput,
    actorId: string
  ): Promise<DataEnvelope<UserListResult>> {
    const validated = listUsersSchema.parse(input);
    const { page, pageSize, search, role, isActive, sortBy, sortOrder } = validated;
    const offset = (page - 1) * pageSize;

    try {
      // Build WHERE clause
      const conditions: string[] = ['tenant_id = $1'];
      const params: any[] = [tenantId];
      let paramIndex = 2;

      if (search) {
        conditions.push(`(email ILIKE $${paramIndex} OR first_name ILIKE $${paramIndex} OR last_name ILIKE $${paramIndex})`);
        params.push(`%${search}%`);
        paramIndex++;
      }

      if (role) {
        conditions.push(`role = $${paramIndex}`);
        params.push(role);
        paramIndex++;
      }

      if (isActive !== undefined) {
        conditions.push(`is_active = $${paramIndex}`);
        params.push(isActive);
        paramIndex++;
      }

      const whereClause = conditions.join(' AND ');

      // Column mapping for sort
      const sortColumnMap: Record<string, string> = {
        email: 'email',
        firstName: 'first_name',
        lastName: 'last_name',
        createdAt: 'created_at',
        lastLogin: 'last_login',
      };
      const sortColumn = sortColumnMap[sortBy] || 'created_at';

      // Count query
      const countResult = await this.pool.query(
        `SELECT COUNT(*) FROM users WHERE ${whereClause}`,
        params
      );
      const total = parseInt(countResult.rows[0].count, 10);

      // Data query
      const dataResult = await this.pool.query(
        `SELECT * FROM users WHERE ${whereClause}
         ORDER BY ${sortColumn} ${sortOrder.toUpperCase()}
         LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
        [...params, pageSize, offset]
      );

      const users = dataResult.rows.map((row: DatabaseUser) => this.mapToManagedUser(row));

      // Get tenant memberships for each user
      const userIds = users.map(u => u.id);
      if (userIds.length > 0) {
        const memberships = await this.pool.query(
          `SELECT user_id, array_agg(tenant_id) as tenant_ids
           FROM user_tenants
           WHERE user_id = ANY($1)
           GROUP BY user_id`,
          [userIds]
        );
        const membershipMap = new Map(
          memberships.rows.map((r: any) => [r.user_id, r.tenant_ids])
        );
        users.forEach(u => {
          u.tenantIds = membershipMap.get(u.id) || [u.tenantId];
        });
      }

      const result: UserListResult = {
        users,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      };

      // Create governance verdict
      const verdict = this.createVerdict(
        'list_users',
        GovernanceResult.ALLOW,
        actorId,
        `Listed ${users.length} users from tenant ${tenantId}`
      );

      // Log to provenance
      await provenanceLedger.appendEntry({
        action: 'USER_LIST_ACCESSED',
        actor: { id: actorId, role: 'admin' },
        metadata: {
          tenantId,
          resultCount: users.length,
          filters: { search, role, isActive },
          verdictId: verdict.verdictId,
        },
        artifacts: [],
      });

      return createDataEnvelope(result, {
        source: 'UserManagementService',
        actor: actorId,
        version: '1.0.0',
        classification: DataClassification.RESTRICTED,
        governanceVerdict: verdict,
        warnings: [],
      });
    } catch (error: any) {
      logger.error('Error listing users:', error);
      throw error;
    }
  }

  /**
   * Get a single user by ID
   * Returns DataEnvelope with GovernanceVerdict
   */
  async getUser(
    tenantId: string,
    userId: string,
    actorId: string
  ): Promise<DataEnvelope<ManagedUser | null>> {
    try {
      const result = await this.pool.query(
        'SELECT * FROM users WHERE id = $1 AND tenant_id = $2',
        [userId, tenantId]
      );

      if (result.rows.length === 0) {
        const verdict = this.createVerdict(
          'get_user',
          GovernanceResult.FLAG,
          actorId,
          `User ${userId} not found in tenant ${tenantId}`
        );

        return createDataEnvelope(null, {
          source: 'UserManagementService',
          actor: actorId,
          version: '1.0.0',
          classification: DataClassification.RESTRICTED,
          governanceVerdict: verdict,
          warnings: ['User not found'],
        });
      }

      const user = this.mapToManagedUser(result.rows[0]);

      // Get tenant memberships
      const memberships = await this.pool.query(
        'SELECT tenant_id FROM user_tenants WHERE user_id = $1',
        [userId]
      );
      user.tenantIds = memberships.rows.map((r: any) => r.tenant_id);

      const verdict = this.createVerdict(
        'get_user',
        GovernanceResult.ALLOW,
        actorId,
        `Retrieved user ${userId}`
      );

      await provenanceLedger.appendEntry({
        action: 'USER_ACCESSED',
        actor: { id: actorId, role: 'admin' },
        metadata: {
          tenantId,
          targetUserId: userId,
          verdictId: verdict.verdictId,
        },
        artifacts: [],
      });

      return createDataEnvelope(user, {
        source: 'UserManagementService',
        actor: actorId,
        version: '1.0.0',
        classification: DataClassification.RESTRICTED,
        governanceVerdict: verdict,
        warnings: [],
      });
    } catch (error: any) {
      logger.error('Error getting user:', error);
      throw error;
    }
  }

  /**
   * Create a new user
   * Returns DataEnvelope with GovernanceVerdict
   */
  async createUser(
    tenantId: string,
    input: CreateUserInput,
    actorId: string
  ): Promise<DataEnvelope<UserOperationResult>> {
    const validated = createUserSchema.parse(input);
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // Check for existing user
      const existing = await client.query(
        'SELECT id FROM users WHERE email = $1',
        [validated.email]
      );

      if (existing.rows.length > 0) {
        const verdict = this.createVerdict(
          'create_user',
          GovernanceResult.DENY,
          actorId,
          `User with email ${validated.email} already exists`
        );

        await client.query('ROLLBACK');

        return createDataEnvelope(
          {
            success: false,
            message: 'User with this email already exists',
          },
          {
            source: 'UserManagementService',
            actor: actorId,
            version: '1.0.0',
            classification: DataClassification.RESTRICTED,
            governanceVerdict: verdict,
            warnings: ['Duplicate email'],
          }
        );
      }

      // Hash password
      const passwordHash = await argon2.hash(validated.password);
      const userId = randomUUID();

      // Create user
      const result = await client.query(
        `INSERT INTO users (
          id, email, username, password_hash, first_name, last_name,
          role, tenant_id, is_active, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true, $9)
        RETURNING *`,
        [
          userId,
          validated.email,
          validated.username,
          passwordHash,
          validated.firstName,
          validated.lastName,
          validated.role,
          validated.tenantId || tenantId,
          actorId,
        ]
      );

      // Add tenant membership
      await client.query(
        `INSERT INTO user_tenants (user_id, tenant_id, roles)
         VALUES ($1, $2, $3)
         ON CONFLICT DO NOTHING`,
        [userId, validated.tenantId || tenantId, [validated.role]]
      );

      await client.query('COMMIT');

      const user = this.mapToManagedUser(result.rows[0]);
      user.tenantIds = [validated.tenantId || tenantId];

      const verdict = this.createVerdict(
        'create_user',
        GovernanceResult.ALLOW,
        actorId,
        `Created user ${userId} with role ${validated.role}`
      );

      await provenanceLedger.appendEntry({
        action: 'USER_CREATED',
        actor: { id: actorId, role: 'admin' },
        metadata: {
          tenantId,
          newUserId: userId,
          role: validated.role,
          verdictId: verdict.verdictId,
        },
        artifacts: [],
      });

      logger.info('User created successfully', { userId, tenantId, role: validated.role });

      return createDataEnvelope(
        {
          success: true,
          user,
          message: 'User created successfully',
        },
        {
          source: 'UserManagementService',
          actor: actorId,
          version: '1.0.0',
          classification: DataClassification.RESTRICTED,
          governanceVerdict: verdict,
          warnings: [],
        }
      );
    } catch (error: any) {
      await client.query('ROLLBACK');
      logger.error('Error creating user:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Update an existing user
   * Returns DataEnvelope with GovernanceVerdict
   */
  async updateUser(
    tenantId: string,
    userId: string,
    input: UpdateUserInput,
    actorId: string
  ): Promise<DataEnvelope<UserOperationResult>> {
    const validated = updateUserSchema.parse(input);
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // Check user exists in tenant
      const existing = await client.query(
        'SELECT * FROM users WHERE id = $1 AND tenant_id = $2',
        [userId, tenantId]
      );

      if (existing.rows.length === 0) {
        const verdict = this.createVerdict(
          'update_user',
          GovernanceResult.DENY,
          actorId,
          `User ${userId} not found in tenant ${tenantId}`
        );

        await client.query('ROLLBACK');

        return createDataEnvelope(
          {
            success: false,
            message: 'User not found',
          },
          {
            source: 'UserManagementService',
            actor: actorId,
            version: '1.0.0',
            classification: DataClassification.RESTRICTED,
            governanceVerdict: verdict,
            warnings: ['User not found'],
          }
        );
      }

      // Build update query dynamically
      const updates: string[] = [];
      const params: any[] = [];
      let paramIndex = 1;

      if (validated.email !== undefined) {
        updates.push(`email = $${paramIndex++}`);
        params.push(validated.email);
      }
      if (validated.firstName !== undefined) {
        updates.push(`first_name = $${paramIndex++}`);
        params.push(validated.firstName);
      }
      if (validated.lastName !== undefined) {
        updates.push(`last_name = $${paramIndex++}`);
        params.push(validated.lastName);
      }
      if (validated.role !== undefined) {
        updates.push(`role = $${paramIndex++}`);
        params.push(validated.role);
      }
      if (validated.isActive !== undefined) {
        updates.push(`is_active = $${paramIndex++}`);
        params.push(validated.isActive);
      }

      updates.push(`updated_at = NOW()`);

      params.push(userId, tenantId);

      const result = await client.query(
        `UPDATE users SET ${updates.join(', ')}
         WHERE id = $${paramIndex++} AND tenant_id = $${paramIndex}
         RETURNING *`,
        params
      );

      await client.query('COMMIT');

      const user = this.mapToManagedUser(result.rows[0]);

      const verdict = this.createVerdict(
        'update_user',
        GovernanceResult.ALLOW,
        actorId,
        `Updated user ${userId}`
      );

      await provenanceLedger.appendEntry({
        action: 'USER_UPDATED',
        actor: { id: actorId, role: 'admin' },
        metadata: {
          tenantId,
          targetUserId: userId,
          updatedFields: Object.keys(validated),
          verdictId: verdict.verdictId,
        },
        artifacts: [],
      });

      logger.info('User updated successfully', { userId, tenantId });

      return createDataEnvelope(
        {
          success: true,
          user,
          message: 'User updated successfully',
        },
        {
          source: 'UserManagementService',
          actor: actorId,
          version: '1.0.0',
          classification: DataClassification.RESTRICTED,
          governanceVerdict: verdict,
          warnings: [],
        }
      );
    } catch (error: any) {
      await client.query('ROLLBACK');
      logger.error('Error updating user:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Delete (deactivate) a user
   * Returns DataEnvelope with GovernanceVerdict
   */
  async deleteUser(
    tenantId: string,
    userId: string,
    actorId: string,
    hardDelete: boolean = false
  ): Promise<DataEnvelope<UserOperationResult>> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // Check user exists
      const existing = await client.query(
        'SELECT * FROM users WHERE id = $1 AND tenant_id = $2',
        [userId, tenantId]
      );

      if (existing.rows.length === 0) {
        const verdict = this.createVerdict(
          'delete_user',
          GovernanceResult.DENY,
          actorId,
          `User ${userId} not found`
        );

        await client.query('ROLLBACK');

        return createDataEnvelope(
          {
            success: false,
            message: 'User not found',
          },
          {
            source: 'UserManagementService',
            actor: actorId,
            version: '1.0.0',
            classification: DataClassification.RESTRICTED,
            governanceVerdict: verdict,
            warnings: [],
          }
        );
      }

      // Prevent self-deletion
      if (userId === actorId) {
        const verdict = this.createVerdict(
          'delete_user',
          GovernanceResult.DENY,
          actorId,
          'Cannot delete own account'
        );

        await client.query('ROLLBACK');

        return createDataEnvelope(
          {
            success: false,
            message: 'Cannot delete your own account',
          },
          {
            source: 'UserManagementService',
            actor: actorId,
            version: '1.0.0',
            classification: DataClassification.RESTRICTED,
            governanceVerdict: verdict,
            warnings: ['Self-deletion prevented'],
          }
        );
      }

      if (hardDelete) {
        // Hard delete - remove from database
        await client.query('DELETE FROM user_tenants WHERE user_id = $1', [userId]);
        await client.query('DELETE FROM user_sessions WHERE user_id = $1', [userId]);
        await client.query('DELETE FROM users WHERE id = $1', [userId]);
      } else {
        // Soft delete - deactivate
        await client.query(
          'UPDATE users SET is_active = false, updated_at = NOW() WHERE id = $1',
          [userId]
        );
      }

      await client.query('COMMIT');

      const verdict = this.createVerdict(
        'delete_user',
        GovernanceResult.ALLOW,
        actorId,
        `${hardDelete ? 'Hard' : 'Soft'} deleted user ${userId}`
      );

      await provenanceLedger.appendEntry({
        action: hardDelete ? 'USER_DELETED' : 'USER_DEACTIVATED',
        actor: { id: actorId, role: 'admin' },
        metadata: {
          tenantId,
          targetUserId: userId,
          hardDelete,
          verdictId: verdict.verdictId,
        },
        artifacts: [],
      });

      logger.info('User deleted successfully', { userId, tenantId, hardDelete });

      return createDataEnvelope(
        {
          success: true,
          message: hardDelete ? 'User deleted permanently' : 'User deactivated',
        },
        {
          source: 'UserManagementService',
          actor: actorId,
          version: '1.0.0',
          classification: DataClassification.RESTRICTED,
          governanceVerdict: verdict,
          warnings: hardDelete ? ['User data permanently removed'] : [],
        }
      );
    } catch (error: any) {
      await client.query('ROLLBACK');
      logger.error('Error deleting user:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Lock a user account
   */
  async lockUser(
    tenantId: string,
    userId: string,
    actorId: string,
    reason: string
  ): Promise<DataEnvelope<UserOperationResult>> {
    try {
      const result = await this.pool.query(
        `UPDATE users SET is_locked = true, lock_reason = $1, updated_at = NOW()
         WHERE id = $2 AND tenant_id = $3
         RETURNING *`,
        [reason, userId, tenantId]
      );

      if (result.rows.length === 0) {
        const verdict = this.createVerdict(
          'lock_user',
          GovernanceResult.DENY,
          actorId,
          `User ${userId} not found`
        );

        return createDataEnvelope(
          {
            success: false,
            message: 'User not found',
          },
          {
            source: 'UserManagementService',
            actor: actorId,
            version: '1.0.0',
            classification: DataClassification.RESTRICTED,
            governanceVerdict: verdict,
            warnings: [],
          }
        );
      }

      const user = this.mapToManagedUser(result.rows[0]);

      const verdict = this.createVerdict(
        'lock_user',
        GovernanceResult.ALLOW,
        actorId,
        `Locked user ${userId}: ${reason}`
      );

      await provenanceLedger.appendEntry({
        action: 'USER_LOCKED',
        actor: { id: actorId, role: 'admin' },
        metadata: {
          tenantId,
          targetUserId: userId,
          reason,
          verdictId: verdict.verdictId,
        },
        artifacts: [],
      });

      logger.info('User locked', { userId, tenantId, reason });

      return createDataEnvelope(
        {
          success: true,
          user,
          message: 'User account locked',
        },
        {
          source: 'UserManagementService',
          actor: actorId,
          version: '1.0.0',
          classification: DataClassification.RESTRICTED,
          governanceVerdict: verdict,
          warnings: [],
        }
      );
    } catch (error: any) {
      logger.error('Error locking user:', error);
      throw error;
    }
  }

  /**
   * Unlock a user account
   */
  async unlockUser(
    tenantId: string,
    userId: string,
    actorId: string
  ): Promise<DataEnvelope<UserOperationResult>> {
    try {
      const result = await this.pool.query(
        `UPDATE users SET is_locked = false, lock_reason = NULL, updated_at = NOW()
         WHERE id = $1 AND tenant_id = $2
         RETURNING *`,
        [userId, tenantId]
      );

      if (result.rows.length === 0) {
        const verdict = this.createVerdict(
          'unlock_user',
          GovernanceResult.DENY,
          actorId,
          `User ${userId} not found`
        );

        return createDataEnvelope(
          {
            success: false,
            message: 'User not found',
          },
          {
            source: 'UserManagementService',
            actor: actorId,
            version: '1.0.0',
            classification: DataClassification.RESTRICTED,
            governanceVerdict: verdict,
            warnings: [],
          }
        );
      }

      const user = this.mapToManagedUser(result.rows[0]);

      const verdict = this.createVerdict(
        'unlock_user',
        GovernanceResult.ALLOW,
        actorId,
        `Unlocked user ${userId}`
      );

      await provenanceLedger.appendEntry({
        action: 'USER_UNLOCKED',
        actor: { id: actorId, role: 'admin' },
        metadata: {
          tenantId,
          targetUserId: userId,
          verdictId: verdict.verdictId,
        },
        artifacts: [],
      });

      logger.info('User unlocked', { userId, tenantId });

      return createDataEnvelope(
        {
          success: true,
          user,
          message: 'User account unlocked',
        },
        {
          source: 'UserManagementService',
          actor: actorId,
          version: '1.0.0',
          classification: DataClassification.RESTRICTED,
          governanceVerdict: verdict,
          warnings: [],
        }
      );
    } catch (error: any) {
      logger.error('Error unlocking user:', error);
      throw error;
    }
  }

  /**
   * Add user to additional tenant
   */
  async addUserToTenant(
    userId: string,
    targetTenantId: string,
    roles: string[],
    actorId: string
  ): Promise<DataEnvelope<UserOperationResult>> {
    try {
      await this.pool.query(
        `INSERT INTO user_tenants (user_id, tenant_id, roles)
         VALUES ($1, $2, $3)
         ON CONFLICT (user_id, tenant_id)
         DO UPDATE SET roles = EXCLUDED.roles`,
        [userId, targetTenantId, roles]
      );

      const verdict = this.createVerdict(
        'add_user_to_tenant',
        GovernanceResult.ALLOW,
        actorId,
        `Added user ${userId} to tenant ${targetTenantId}`
      );

      await provenanceLedger.appendEntry({
        action: 'USER_TENANT_ADDED',
        actor: { id: actorId, role: 'admin' },
        metadata: {
          targetUserId: userId,
          targetTenantId,
          roles,
          verdictId: verdict.verdictId,
        },
        artifacts: [],
      });

      return createDataEnvelope(
        {
          success: true,
          message: 'User added to tenant',
        },
        {
          source: 'UserManagementService',
          actor: actorId,
          version: '1.0.0',
          classification: DataClassification.RESTRICTED,
          governanceVerdict: verdict,
          warnings: [],
        }
      );
    } catch (error: any) {
      logger.error('Error adding user to tenant:', error);
      throw error;
    }
  }

  /**
   * Remove user from tenant
   */
  async removeUserFromTenant(
    userId: string,
    targetTenantId: string,
    actorId: string
  ): Promise<DataEnvelope<UserOperationResult>> {
    try {
      await this.pool.query(
        'DELETE FROM user_tenants WHERE user_id = $1 AND tenant_id = $2',
        [userId, targetTenantId]
      );

      const verdict = this.createVerdict(
        'remove_user_from_tenant',
        GovernanceResult.ALLOW,
        actorId,
        `Removed user ${userId} from tenant ${targetTenantId}`
      );

      await provenanceLedger.appendEntry({
        action: 'USER_TENANT_REMOVED',
        actor: { id: actorId, role: 'admin' },
        metadata: {
          targetUserId: userId,
          targetTenantId,
          verdictId: verdict.verdictId,
        },
        artifacts: [],
      });

      return createDataEnvelope(
        {
          success: true,
          message: 'User removed from tenant',
        },
        {
          source: 'UserManagementService',
          actor: actorId,
          version: '1.0.0',
          classification: DataClassification.RESTRICTED,
          governanceVerdict: verdict,
          warnings: [],
        }
      );
    } catch (error: any) {
      logger.error('Error removing user from tenant:', error);
      throw error;
    }
  }

  /**
   * Map database row to ManagedUser
   */
  private mapToManagedUser(row: DatabaseUser): ManagedUser {
    return {
      id: row.id,
      email: row.email,
      username: row.username,
      firstName: row.first_name,
      lastName: row.last_name,
      fullName: `${row.first_name} ${row.last_name}`.trim(),
      role: row.role,
      tenantId: row.tenant_id,
      tenantIds: [row.tenant_id], // Will be populated separately
      isActive: row.is_active,
      isLocked: row.is_locked || false,
      lockReason: row.lock_reason,
      lastLogin: row.last_login,
      mfaEnabled: row.mfa_enabled || false,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      createdBy: row.created_by,
    };
  }
}

export const userManagementService = new UserManagementService();
export default UserManagementService;
