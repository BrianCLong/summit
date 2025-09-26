import { Pool, PoolClient } from 'pg';
import { getPostgresPool } from '../../db/postgres.js';
import logger from '../../config/logger.js';

export interface RbacPermission {
  id: string;
  name: string;
  description?: string | null;
  category?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface RbacRole {
  id: string;
  name: string;
  description?: string | null;
  isSystem: boolean;
  createdAt: Date;
  updatedAt: Date;
  permissions: RbacPermission[];
}

interface CachedRbac {
  roles: Map<string, RbacRole>;
  permissions: Map<string, RbacPermission>;
  version: number;
  updatedAt: string;
}

interface UserAccess {
  roles: string[];
  permissions: string[];
}

const cacheTtlMs = 30_000;

const defaultRolePermissions: Record<string, string[]> = {
  ADMIN: ['*', 'rbac.manage'],
  ANALYST: [
    'query.investigations',
    'query.investigation',
    'query.entities',
    'query.relationships',
    'mutation.createInvestigation',
    'mutation.updateInvestigation',
    'mutation.createEntity',
    'mutation.updateEntity',
    'mutation.deleteEntity',
    'mutation.createRelationship',
    'mutation.updateRelationship',
    'mutation.deleteRelationship',
    'query.graphNeighborhood',
    'query.copilotRuns',
    'mutation.startCopilotRun',
  ],
  OPERATOR: [
    'query.investigations',
    'query.entities',
    'mutation.startRecipe',
    'mutation.triggerN8n',
  ],
  VIEWER: [
    'query.investigations',
    'query.investigation',
    'query.entities',
    'query.relationships',
    'query.health',
  ],
};

const serviceLogger = logger.child({ name: 'RbacService' });

export class RbacService {
  private pool: Pool;
  private cache: CachedRbac | null = null;
  private cacheExpiresAt = 0;
  private bootstrapPromise: Promise<void> | null = null;

  constructor() {
    this.pool = getPostgresPool();
  }

  async listRoles(): Promise<RbacRole[]> {
    const cache = await this.loadCache();
    return Array.from(cache.roles.values()).map((role) => ({ ...role }));
  }

  async listPermissions(): Promise<RbacPermission[]> {
    const cache = await this.loadCache();
    return Array.from(cache.permissions.values()).map((perm) => ({ ...perm }));
  }

  async getRoleById(id: string): Promise<RbacRole | undefined> {
    const cache = await this.loadCache();
    return cache.roles.get(id);
  }

  async getRoleByName(name: string, client?: PoolClient): Promise<RbacRole | undefined> {
    const normalized = name.trim().toUpperCase();
    const runner = client ?? this.pool;
    const result = await runner.query(
      `SELECT id, name, description, is_system AS "isSystem", created_at AS "createdAt", updated_at AS "updatedAt"
       FROM rbac_roles
       WHERE UPPER(name) = $1`,
      [normalized],
    );
    if (result.rows.length === 0) {
      return undefined;
    }
    const role = result.rows[0];
    const cache = await this.loadCache();
    const cached = cache.roles.get(role.id);
    if (cached) {
      return cached;
    }
    return {
      ...role,
      permissions: await this.getRolePermissions(role.id, client),
    };
  }

  async getPermissionByName(name: string): Promise<RbacPermission | undefined> {
    const cache = await this.loadCache();
    const normalized = name.trim().toLowerCase();
    for (const perm of cache.permissions.values()) {
      if (perm.name.toLowerCase() === normalized) {
        return perm;
      }
    }
    return undefined;
  }

  async createPermission(
    input: { name: string; description?: string | null; category?: string | null },
  ): Promise<RbacPermission> {
    const name = input.name.trim().toLowerCase();
    const { rows } = await this.pool.query(
      `INSERT INTO rbac_permissions (name, description, category)
       VALUES ($1, $2, $3)
       ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description, category = EXCLUDED.category, updated_at = NOW()
       RETURNING id, name, description, category, created_at AS "createdAt", updated_at AS "updatedAt"`,
      [name, input.description ?? null, input.category ?? null],
    );
    await this.bumpPolicyVersion('permission upserted');
    await this.invalidate();
    return rows[0];
  }

  async updatePermission(
    id: string,
    input: { description?: string | null; category?: string | null },
  ): Promise<RbacPermission> {
    const { rows } = await this.pool.query(
      `UPDATE rbac_permissions
       SET description = COALESCE($2, description),
           category = COALESCE($3, category),
           updated_at = NOW()
       WHERE id = $1
       RETURNING id, name, description, category, created_at AS "createdAt", updated_at AS "updatedAt"`,
      [id, input.description ?? null, input.category ?? null],
    );
    if (rows.length === 0) {
      throw new Error('Permission not found');
    }
    await this.bumpPolicyVersion('permission updated');
    await this.invalidate();
    return rows[0];
  }

  async deletePermission(id: string): Promise<boolean> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('DELETE FROM rbac_role_permissions WHERE permission_id = $1', [id]);
      const result = await client.query('DELETE FROM rbac_permissions WHERE id = $1', [id]);
      await this.bumpPolicyVersion('permission deleted', client);
      await client.query('COMMIT');
      await this.invalidate();
      return result.rowCount > 0;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async createRole(
    input: {
      name: string;
      description?: string | null;
      isSystem?: boolean;
      permissionIds?: string[];
    },
  ): Promise<RbacRole> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const name = input.name.trim().toUpperCase();
      const { rows } = await client.query(
        `INSERT INTO rbac_roles (name, description, is_system)
         VALUES ($1, $2, $3)
         ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description, is_system = EXCLUDED.is_system, updated_at = NOW()
         RETURNING id, name, description, is_system AS "isSystem", created_at AS "createdAt", updated_at AS "updatedAt"`,
        [name, input.description ?? null, input.isSystem ?? false],
      );
      const role = rows[0];
      if (input.permissionIds?.length) {
        const uniquePerms = Array.from(new Set(input.permissionIds));
        for (const permissionId of uniquePerms) {
          await client.query(
            `INSERT INTO rbac_role_permissions (role_id, permission_id)
             VALUES ($1, $2)
             ON CONFLICT (role_id, permission_id) DO NOTHING`,
            [role.id, permissionId],
          );
        }
      }
      await this.bumpPolicyVersion('role created', client);
      await client.query('COMMIT');
      await this.invalidate();
      return {
        ...role,
        permissions: await this.getRolePermissions(role.id),
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async updateRole(
    input: {
      id: string;
      name?: string;
      description?: string | null;
      isSystem?: boolean;
      permissionIds?: string[];
    },
  ): Promise<RbacRole> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const updates: string[] = [];
      const params: any[] = [input.id];
      if (input.name) {
        params.push(input.name.trim().toUpperCase());
        updates.push(`name = $${params.length}`);
      }
      if (input.description !== undefined) {
        params.push(input.description ?? null);
        updates.push(`description = $${params.length}`);
      }
      if (input.isSystem !== undefined) {
        params.push(input.isSystem);
        updates.push(`is_system = $${params.length}`);
      }
      if (updates.length) {
        const setClause = updates.join(', ');
        await client.query(
          `UPDATE rbac_roles
           SET ${setClause}, updated_at = NOW()
           WHERE id = $1`,
          params,
        );
      }

      if (input.permissionIds) {
        const uniquePerms = Array.from(new Set(input.permissionIds));
        await client.query('DELETE FROM rbac_role_permissions WHERE role_id = $1', [input.id]);
        for (const permissionId of uniquePerms) {
          await client.query(
            `INSERT INTO rbac_role_permissions (role_id, permission_id)
             VALUES ($1, $2)
             ON CONFLICT (role_id, permission_id) DO NOTHING`,
            [input.id, permissionId],
          );
        }
      }

      const { rows } = await client.query(
        `SELECT id, name, description, is_system AS "isSystem", created_at AS "createdAt", updated_at AS "updatedAt"
         FROM rbac_roles
         WHERE id = $1`,
        [input.id],
      );
      if (rows.length === 0) {
        throw new Error('Role not found');
      }
      await this.bumpPolicyVersion('role updated', client);
      await client.query('COMMIT');
      await this.invalidate();
      return {
        ...rows[0],
        permissions: await this.getRolePermissions(input.id),
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async deleteRole(id: string): Promise<boolean> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const { rows } = await client.query('SELECT is_system FROM rbac_roles WHERE id = $1', [id]);
      if (rows.length === 0) {
        await client.query('ROLLBACK');
        return false;
      }
      if (rows[0].is_system) {
        throw new Error('System roles cannot be deleted');
      }
      await client.query('DELETE FROM rbac_assignments WHERE role_id = $1', [id]);
      await client.query('DELETE FROM rbac_role_permissions WHERE role_id = $1', [id]);
      const result = await client.query('DELETE FROM rbac_roles WHERE id = $1', [id]);
      await this.bumpPolicyVersion('role deleted', client);
      await client.query('COMMIT');
      await this.invalidate();
      return result.rowCount > 0;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async assignRoleToUser(userId: string, roleId: string, assignedBy?: string, client?: PoolClient): Promise<void> {
    const runner = client ?? this.pool;
    await runner.query(
      `INSERT INTO rbac_assignments (user_id, role_id, assigned_by)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, role_id) DO NOTHING`,
      [userId, roleId, assignedBy ?? null],
    );
    if (!client) {
      await this.invalidate();
    }
  }

  async getRoleAssignment(userId: string, roleId: string): Promise<{ userId: string; roleId: string; assignedAt: Date } | null> {
    const { rows } = await this.pool.query(
      `SELECT user_id, role_id, assigned_at
       FROM rbac_assignments
       WHERE user_id = $1 AND role_id = $2`,
      [userId, roleId],
    );
    if (!rows.length) {
      return null;
    }
    const row = rows[0];
    return { userId: row.user_id, roleId: row.role_id, assignedAt: row.assigned_at };
  }

  async assignRoleToUserByName(userId: string, roleName: string, assignedBy?: string, client?: PoolClient): Promise<void> {
    const role = await this.getRoleByName(roleName, client);
    if (!role) {
      serviceLogger.warn({ roleName }, 'Requested role not found for assignment');
      return;
    }
    await this.assignRoleToUser(userId, role.id, assignedBy, client);
  }

  async removeRoleFromUser(userId: string, roleId: string): Promise<boolean> {
    const result = await this.pool.query(
      'DELETE FROM rbac_assignments WHERE user_id = $1 AND role_id = $2',
      [userId, roleId],
    );
    await this.invalidate();
    return result.rowCount > 0;
  }

  async getUserRoles(userId: string, fallbackRole?: string, client?: PoolClient): Promise<string[]> {
    const runner = client ?? this.pool;
    const { rows } = await runner.query(
      `SELECT r.name
       FROM rbac_assignments a
       JOIN rbac_roles r ON r.id = a.role_id
       WHERE a.user_id = $1
       ORDER BY r.name`,
      [userId],
    );
    if (rows.length > 0) {
      return rows.map((row) => String(row.name).toUpperCase());
    }
    if (fallbackRole) {
      return [fallbackRole.trim().toUpperCase()];
    }
    return [];
  }

  async getUserAccess(userId: string, fallbackRole?: string, client?: PoolClient): Promise<UserAccess> {
    const roles = await this.getUserRoles(userId, fallbackRole, client);
    const permissions = await this.getPermissionsForRoles(roles);
    return { roles, permissions };
  }

  async getPermissionsForRoles(roleNames: string[]): Promise<string[]> {
    if (!roleNames || roleNames.length === 0) {
      return [];
    }
    const cache = await this.loadCache();
    const normalized = roleNames.map((role) => role.trim().toUpperCase());
    const permissions = new Set<string>();
    for (const roleName of normalized) {
      const role = Array.from(cache.roles.values()).find((r) => r.name === roleName);
      if (!role) {
        continue;
      }
      const names = role.permissions.map((perm) => perm.name.toLowerCase());
      for (const perm of names) {
        if (perm === '*') {
          return ['*'];
        }
        permissions.add(perm);
      }
    }
    return Array.from(permissions.values());
  }

  async publishVersion(note?: string): Promise<{ version: number; note?: string | null; createdAt: string }> {
    const version = await this.bumpPolicyVersion(note ?? 'manual publish');
    await this.invalidate();
    return version;
  }

  async getLatestVersion(): Promise<{ version: number; updatedAt: string }> {
    const cache = await this.loadCache();
    return { version: cache.version, updatedAt: cache.updatedAt };
  }

  async invalidate(): Promise<void> {
    this.cache = null;
    this.cacheExpiresAt = 0;
  }

  private async getRolePermissions(roleId: string, client?: PoolClient): Promise<RbacPermission[]> {
    const runner = client ?? this.pool;
    const { rows } = await runner.query(
      `SELECT p.id, p.name, p.description, p.category, p.created_at AS "createdAt", p.updated_at AS "updatedAt"
       FROM rbac_role_permissions rp
       JOIN rbac_permissions p ON p.id = rp.permission_id
       WHERE rp.role_id = $1
       ORDER BY p.name`,
      [roleId],
    );
    return rows;
  }

  private async loadCache(force = false): Promise<CachedRbac> {
    if (!force && this.cache && Date.now() < this.cacheExpiresAt) {
      return this.cache;
    }
    await this.ensureBootstrap();
    const client = await this.pool.connect();
    try {
      const { rows } = await client.query(
        `SELECT r.id AS "roleId", r.name AS "roleName", r.description, r.is_system AS "isSystem",
                r.created_at AS "roleCreatedAt", r.updated_at AS "roleUpdatedAt",
                p.id AS "permissionId", p.name AS "permissionName", p.description AS "permissionDescription",
                p.category AS "permissionCategory", p.created_at AS "permissionCreatedAt", p.updated_at AS "permissionUpdatedAt"
         FROM rbac_roles r
         LEFT JOIN rbac_role_permissions rp ON rp.role_id = r.id
         LEFT JOIN rbac_permissions p ON p.id = rp.permission_id
         ORDER BY r.name, p.name`
      );

      const roleMap = new Map<string, RbacRole>();
      const permissionMap = new Map<string, RbacPermission>();

      for (const row of rows) {
        let role = roleMap.get(row.roleId);
        if (!role) {
          role = {
            id: row.roleId,
            name: row.roleName,
            description: row.description,
            isSystem: row.isSystem,
            createdAt: row.roleCreatedAt,
            updatedAt: row.roleUpdatedAt,
            permissions: [],
          };
          roleMap.set(row.roleId, role);
        }
        if (row.permissionId) {
          const permission: RbacPermission = {
            id: row.permissionId,
            name: row.permissionName,
            description: row.permissionDescription,
            category: row.permissionCategory,
            createdAt: row.permissionCreatedAt,
            updatedAt: row.permissionUpdatedAt,
          };
          role.permissions.push(permission);
          permissionMap.set(row.permissionId, permission);
        }
      }

      // Ensure permissions map also includes permissions not linked to roles
      const { rows: permRows } = await client.query(
        `SELECT id, name, description, category, created_at AS "createdAt", updated_at AS "updatedAt"
         FROM rbac_permissions`
      );
      for (const perm of permRows) {
        if (!permissionMap.has(perm.id)) {
          permissionMap.set(perm.id, perm);
        }
      }

      const { rows: versionRows } = await client.query(
        `SELECT COALESCE(MAX(version), 1) AS version, MAX(created_at) AS "updatedAt"
         FROM rbac_policy_versions`
      );
      const version = Number(versionRows[0]?.version ?? 1);
      const updatedAt = (versionRows[0]?.updatedAt ?? new Date()).toISOString();

      this.cache = {
        roles: roleMap,
        permissions: permissionMap,
        version,
        updatedAt,
      };
      this.cacheExpiresAt = Date.now() + cacheTtlMs;
      return this.cache;
    } finally {
      client.release();
    }
  }

  private async ensureBootstrap(): Promise<void> {
    if (!this.bootstrapPromise) {
      this.bootstrapPromise = this.bootstrapDefaults();
    }
    return this.bootstrapPromise;
  }

  private async bootstrapDefaults(): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      for (const [roleName, permissions] of Object.entries(defaultRolePermissions)) {
        await client.query(
          `INSERT INTO rbac_roles (name, description, is_system)
           VALUES ($1, $2, TRUE)
           ON CONFLICT (name) DO NOTHING`,
          [roleName, `${roleName.toLowerCase()} role`, true],
        );
        for (const permission of permissions) {
          await client.query(
            `INSERT INTO rbac_permissions (name)
             VALUES ($1)
             ON CONFLICT (name) DO NOTHING`,
            [permission.toLowerCase()],
          );
        }
        const { rows } = await client.query('SELECT id FROM rbac_roles WHERE UPPER(name) = $1', [roleName]);
        if (!rows.length) {
          continue;
        }
        const roleId = rows[0].id;
        for (const permission of permissions) {
          const permResult = await client.query('SELECT id FROM rbac_permissions WHERE LOWER(name) = $1', [permission.toLowerCase()]);
          if (!permResult.rows.length) {
            continue;
          }
          await client.query(
            `INSERT INTO rbac_role_permissions (role_id, permission_id)
             VALUES ($1, $2)
             ON CONFLICT (role_id, permission_id) DO NOTHING`,
            [roleId, permResult.rows[0].id],
          );
        }
      }
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      serviceLogger.warn({ error }, 'Failed to bootstrap default RBAC data');
    } finally {
      client.release();
    }
  }

  private async bumpPolicyVersion(note: string, client?: PoolClient): Promise<{ version: number; note?: string; createdAt: string }> {
    const runner = client ?? (await this.pool.connect());
    let release = false;
    if (!client) {
      release = true;
    }
    try {
      const { rows } = await runner.query('SELECT COALESCE(MAX(version), 1) AS version FROM rbac_policy_versions');
      const nextVersion = Number(rows[0]?.version ?? 1) + 1;
      const insert = await runner.query(
        `INSERT INTO rbac_policy_versions (version, note)
         VALUES ($1, $2)
         RETURNING version, note, created_at AS "createdAt"`,
        [nextVersion, note ?? null],
      );
      const payload = insert.rows[0];
      return {
        version: payload.version,
        note: payload.note ?? undefined,
        createdAt: payload.createdAt,
      };
    } finally {
      if (release && runner) {
        (runner as PoolClient).release();
      }
    }
  }
}

let instance: RbacService | null = null;

export function getRbacService(): RbacService {
  if (!instance) {
    instance = new RbacService();
  }
  return instance;
}
