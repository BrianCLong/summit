/**
 * Role-Based Access Control (RBAC) Manager
 *
 * Manages roles, permissions, and user assignments
 */

import { Pool } from 'pg';

export interface Role {
  roleId: string;
  name: string;
  description: string;
  permissions: Permission[];
  inheritsFrom?: string[];
}

export interface Permission {
  resource: string;
  action: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE' | 'CREATE' | 'DROP' | 'ALTER';
  conditions?: Record<string, any>;
}

export interface User {
  userId: string;
  username: string;
  email: string;
  roles: string[];
  attributes?: Record<string, any>;
}

export class RBACManager {
  constructor(private pool: Pool) {}

  /**
   * Create a new role
   */
  async createRole(role: Omit<Role, 'roleId'>): Promise<string> {
    const result = await this.pool.query(
      `
      INSERT INTO warehouse_roles (name, description, permissions, inherits_from)
      VALUES ($1, $2, $3, $4)
      RETURNING role_id
    `,
      [
        role.name,
        role.description,
        JSON.stringify(role.permissions),
        JSON.stringify(role.inheritsFrom || []),
      ],
    );

    return result.rows[0].role_id;
  }

  /**
   * Assign role to user
   */
  async assignRole(userId: string, roleId: string): Promise<void> {
    await this.pool.query(
      `
      INSERT INTO warehouse_user_roles (user_id, role_id)
      VALUES ($1, $2)
      ON CONFLICT (user_id, role_id) DO NOTHING
    `,
      [userId, roleId],
    );
  }

  /**
   * Check if user has permission
   */
  async hasPermission(
    userId: string,
    resource: string,
    action: string,
  ): Promise<boolean> {
    // Get user roles (including inherited)
    const roles = await this.getUserRoles(userId);

    // Check permissions for each role
    for (const role of roles) {
      const hasPermission = role.permissions.some(
        (p) =>
          (p.resource === resource || p.resource === '*') &&
          (p.action === action || p.action === '*'),
      );

      if (hasPermission) return true;
    }

    return false;
  }

  /**
   * Get all roles for a user (including inherited)
   */
  async getUserRoles(userId: string): Promise<Role[]> {
    const result = await this.pool.query(
      `
      WITH RECURSIVE role_hierarchy AS (
        -- Base case: direct roles
        SELECT r.*
        FROM warehouse_roles r
        JOIN warehouse_user_roles ur ON r.role_id = ur.role_id
        WHERE ur.user_id = $1

        UNION

        -- Recursive case: inherited roles
        SELECT r.*
        FROM warehouse_roles r
        JOIN role_hierarchy rh ON r.role_id = ANY(
          SELECT jsonb_array_elements_text(rh.inherits_from::jsonb)::uuid
        )
      )
      SELECT DISTINCT * FROM role_hierarchy
    `,
      [userId],
    );

    return result.rows.map((row) => ({
      roleId: row.role_id,
      name: row.name,
      description: row.description,
      permissions: JSON.parse(row.permissions),
      inheritsFrom: JSON.parse(row.inherits_from || '[]'),
    }));
  }

  /**
   * Create user
   */
  async createUser(user: Omit<User, 'userId'>): Promise<string> {
    const result = await this.pool.query(
      `
      INSERT INTO warehouse_users (username, email, attributes)
      VALUES ($1, $2, $3)
      RETURNING user_id
    `,
      [user.username, user.email, JSON.stringify(user.attributes || {})],
    );

    const userId = result.rows[0].user_id;

    // Assign roles
    for (const roleId of user.roles) {
      await this.assignRole(userId, roleId);
    }

    return userId;
  }

  /**
   * Get user by username
   */
  async getUser(username: string): Promise<User | null> {
    const result = await this.pool.query(
      `
      SELECT u.*,
        ARRAY_AGG(ur.role_id) as roles
      FROM warehouse_users u
      LEFT JOIN warehouse_user_roles ur ON u.user_id = ur.user_id
      WHERE u.username = $1
      GROUP BY u.user_id
    `,
      [username],
    );

    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    return {
      userId: row.user_id,
      username: row.username,
      email: row.email,
      roles: row.roles.filter(Boolean),
      attributes: JSON.parse(row.attributes || '{}'),
    };
  }

  /**
   * Initialize security tables
   */
  async initializeTables(): Promise<void> {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS warehouse_roles (
        role_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) UNIQUE NOT NULL,
        description TEXT,
        permissions JSONB NOT NULL,
        inherits_from JSONB DEFAULT '[]',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS warehouse_users (
        user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        username VARCHAR(255) UNIQUE NOT NULL,
        email VARCHAR(255) NOT NULL,
        attributes JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS warehouse_user_roles (
        user_id UUID REFERENCES warehouse_users(user_id) ON DELETE CASCADE,
        role_id UUID REFERENCES warehouse_roles(role_id) ON DELETE CASCADE,
        assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (user_id, role_id)
      );

      CREATE INDEX IF NOT EXISTS idx_user_roles ON warehouse_user_roles(user_id);
      CREATE INDEX IF NOT EXISTS idx_role_permissions ON warehouse_roles USING GIN(permissions);
    `);
  }

  /**
   * Create default roles
   */
  async createDefaultRoles(): Promise<void> {
    const defaultRoles = [
      {
        name: 'admin',
        description: 'Full administrative access',
        permissions: [{ resource: '*', action: '*' as const }],
      },
      {
        name: 'analyst',
        description: 'Read-only access to all data',
        permissions: [{ resource: '*', action: 'SELECT' as const }],
      },
      {
        name: 'data_engineer',
        description: 'Can load and transform data',
        permissions: [
          { resource: '*', action: 'SELECT' as const },
          { resource: '*', action: 'INSERT' as const },
          { resource: '*', action: 'UPDATE' as const },
        ],
      },
      {
        name: 'restricted_analyst',
        description: 'Limited read access',
        permissions: [
          { resource: 'public.*', action: 'SELECT' as const },
          {
            resource: 'restricted.*',
            action: 'SELECT' as const,
            conditions: { department: 'user.department' },
          },
        ],
      },
    ];

    for (const role of defaultRoles) {
      try {
        await this.createRole(role);
      } catch (error) {
        // Role might already exist
      }
    }
  }
}
