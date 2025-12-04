import { getPostgresPool } from '../config/database';
import { logger } from '../config/logger.js';

export interface Workspace {
  id: string;
  tenantId: string;
  userId: string;
  name: string;
  config: any;
  createdAt: Date;
  updatedAt: Date;
}

export class WorkspaceService {
  async createWorkspace(
    tenantId: string,
    userId: string,
    name: string,
    config: any
  ): Promise<Workspace> {
    const pool = getPostgresPool();
    const res = await pool.query(
      `INSERT INTO workspaces (tenant_id, user_id, name, config)
       VALUES ($1, $2, $3, $4)
       RETURNING id, tenant_id as "tenantId", user_id as "userId", name, config, created_at as "createdAt", updated_at as "updatedAt"`,
      [tenantId, userId, name, config]
    );
    return res.rows[0];
  }

  async getWorkspaces(tenantId: string, userId: string): Promise<Workspace[]> {
    const pool = getPostgresPool();
    const res = await pool.query(
      `SELECT id, tenant_id as "tenantId", user_id as "userId", name, config, created_at as "createdAt", updated_at as "updatedAt"
       FROM workspaces
       WHERE tenant_id = $1 AND user_id = $2
       ORDER BY updated_at DESC`,
      [tenantId, userId]
    );
    return res.rows;
  }

  async updateWorkspace(
    tenantId: string,
    userId: string,
    workspaceId: string,
    updates: Partial<Pick<Workspace, 'name' | 'config'>>
  ): Promise<Workspace | null> {
    const pool = getPostgresPool();
    const current = await this.getWorkspace(tenantId, userId, workspaceId);
    if (!current) return null;

    const name = updates.name || current.name;
    const config = updates.config || current.config;

    const res = await pool.query(
      `UPDATE workspaces
       SET name = $1, config = $2, updated_at = NOW()
       WHERE id = $3 AND tenant_id = $4 AND user_id = $5
       RETURNING id, tenant_id as "tenantId", user_id as "userId", name, config, created_at as "createdAt", updated_at as "updatedAt"`,
      [name, config, workspaceId, tenantId, userId]
    );
    return res.rows[0];
  }

  async getWorkspace(tenantId: string, userId: string, workspaceId: string): Promise<Workspace | null> {
    const pool = getPostgresPool();
    const res = await pool.query(
      `SELECT id, tenant_id as "tenantId", user_id as "userId", name, config, created_at as "createdAt", updated_at as "updatedAt"
       FROM workspaces
       WHERE id = $1 AND tenant_id = $2 AND user_id = $3`,
      [workspaceId, tenantId, userId]
    );
    return res.rows[0] || null;
  }

  async deleteWorkspace(tenantId: string, userId: string, workspaceId: string): Promise<boolean> {
    const pool = getPostgresPool();
    const res = await pool.query(
      `DELETE FROM workspaces
       WHERE id = $1 AND tenant_id = $2 AND user_id = $3`,
      [workspaceId, tenantId, userId]
    );
    return (res.rowCount ?? 0) > 0;
  }
}

export const workspaceService = new WorkspaceService();
