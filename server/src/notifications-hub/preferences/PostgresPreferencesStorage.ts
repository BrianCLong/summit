/**
 * PostgreSQL Storage for Notification Preferences
 *
 * Provides persistent storage for user and role notification preferences
 * using PostgreSQL with proper transaction handling and caching.
 */

import type { Pool, PoolClient } from 'pg';
import type { PreferencesStorage, RolePreferences } from './PreferencesManager.js';
import type { NotificationPreferences } from '../NotificationHub.js';

export interface PostgresPreferencesStorageConfig {
  pool: Pool;
  tableName?: string;
  roleTableName?: string;
  userRolesTableName?: string;
  cacheEnabled?: boolean;
  cacheTTLMs?: number;
}

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

export class PostgresPreferencesStorage implements PreferencesStorage {
  private pool: Pool;
  private tableName: string;
  private roleTableName: string;
  private userRolesTableName: string;
  private cache: Map<string, CacheEntry<any>> = new Map();
  private cacheEnabled: boolean;
  private cacheTTLMs: number;

  constructor(config: PostgresPreferencesStorageConfig) {
    this.pool = config.pool;
    this.tableName = config.tableName || 'notification_preferences';
    this.roleTableName = config.roleTableName || 'notification_role_preferences';
    this.userRolesTableName = config.userRolesTableName || 'user_roles';
    this.cacheEnabled = config.cacheEnabled ?? true;
    this.cacheTTLMs = config.cacheTTLMs ?? 60000; // 1 minute default
  }

  /**
   * Initialize database tables if they don't exist
   */
  async initialize(): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Create user preferences table
      await client.query(`
        CREATE TABLE IF NOT EXISTS ${this.tableName} (
          user_id VARCHAR(255) PRIMARY KEY,
          preferences JSONB NOT NULL DEFAULT '{}',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Create role preferences table
      await client.query(`
        CREATE TABLE IF NOT EXISTS ${this.roleTableName} (
          role_id VARCHAR(255) PRIMARY KEY,
          role_name VARCHAR(255) NOT NULL,
          preferences JSONB NOT NULL DEFAULT '{}',
          priority INTEGER NOT NULL DEFAULT 50,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Create indexes
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_${this.tableName}_updated_at
        ON ${this.tableName} (updated_at DESC)
      `);

      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_${this.roleTableName}_priority
        ON ${this.roleTableName} (priority DESC)
      `);

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get user preferences from database
   */
  async getUserPreferences(userId: string): Promise<NotificationPreferences | null> {
    // Check cache first
    if (this.cacheEnabled) {
      const cached = this.getFromCache<NotificationPreferences>(`user:${userId}`);
      if (cached !== undefined) {
        return cached;
      }
    }

    const result = await this.pool.query(
      `SELECT preferences FROM ${this.tableName} WHERE user_id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const prefs = this.deserializePreferences(result.rows[0].preferences, userId);

    // Update cache
    if (this.cacheEnabled) {
      this.setInCache(`user:${userId}`, prefs);
    }

    return prefs;
  }

  /**
   * Save user preferences to database
   */
  async setUserPreferences(
    userId: string,
    preferences: NotificationPreferences
  ): Promise<void> {
    const serialized = this.serializePreferences(preferences);

    await this.pool.query(
      `
      INSERT INTO ${this.tableName} (user_id, preferences, updated_at)
      VALUES ($1, $2, CURRENT_TIMESTAMP)
      ON CONFLICT (user_id)
      DO UPDATE SET preferences = $2, updated_at = CURRENT_TIMESTAMP
      `,
      [userId, serialized]
    );

    // Invalidate cache
    if (this.cacheEnabled) {
      this.cache.delete(`user:${userId}`);
    }
  }

  /**
   * Get role preferences from database
   */
  async getRolePreferences(roleId: string): Promise<RolePreferences | null> {
    // Check cache first
    if (this.cacheEnabled) {
      const cached = this.getFromCache<RolePreferences>(`role:${roleId}`);
      if (cached !== undefined) {
        return cached;
      }
    }

    const result = await this.pool.query(
      `SELECT role_id, role_name, preferences, priority FROM ${this.roleTableName} WHERE role_id = $1`,
      [roleId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    const rolePrefs: RolePreferences = {
      roleId: row.role_id,
      roleName: row.role_name,
      preferences: this.deserializePreferences(row.preferences, row.role_id),
      priority: row.priority,
    };

    // Update cache
    if (this.cacheEnabled) {
      this.setInCache(`role:${roleId}`, rolePrefs);
    }

    return rolePrefs;
  }

  /**
   * Save role preferences to database
   */
  async setRolePreferences(
    roleId: string,
    preferences: RolePreferences
  ): Promise<void> {
    const serialized = this.serializePreferences(preferences.preferences);

    await this.pool.query(
      `
      INSERT INTO ${this.roleTableName} (role_id, role_name, preferences, priority, updated_at)
      VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
      ON CONFLICT (role_id)
      DO UPDATE SET role_name = $2, preferences = $3, priority = $4, updated_at = CURRENT_TIMESTAMP
      `,
      [roleId, preferences.roleName, serialized, preferences.priority]
    );

    // Invalidate cache
    if (this.cacheEnabled) {
      this.cache.delete(`role:${roleId}`);
    }
  }

  /**
   * Get roles for a user
   */
  async getUserRoles(userId: string): Promise<string[]> {
    // Check cache first
    if (this.cacheEnabled) {
      const cached = this.getFromCache<string[]>(`user_roles:${userId}`);
      if (cached !== undefined) {
        return cached;
      }
    }

    const result = await this.pool.query(
      `SELECT role_id FROM ${this.userRolesTableName} WHERE user_id = $1`,
      [userId]
    );

    const roles = result.rows.map((row) => row.role_id);

    // Update cache
    if (this.cacheEnabled) {
      this.setInCache(`user_roles:${userId}`, roles);
    }

    return roles;
  }

  /**
   * Bulk get preferences for multiple users (for batch notifications)
   */
  async getBulkUserPreferences(
    userIds: string[]
  ): Promise<Map<string, NotificationPreferences>> {
    if (userIds.length === 0) {
      return new Map();
    }

    const result = await this.pool.query(
      `SELECT user_id, preferences FROM ${this.tableName} WHERE user_id = ANY($1)`,
      [userIds]
    );

    const prefsMap = new Map<string, NotificationPreferences>();

    for (const row of result.rows) {
      prefsMap.set(row.user_id, this.deserializePreferences(row.preferences, row.user_id));
    }

    return prefsMap;
  }

  /**
   * Delete user preferences
   */
  async deleteUserPreferences(userId: string): Promise<void> {
    await this.pool.query(
      `DELETE FROM ${this.tableName} WHERE user_id = $1`,
      [userId]
    );

    // Invalidate cache
    if (this.cacheEnabled) {
      this.cache.delete(`user:${userId}`);
    }
  }

  /**
   * Delete role preferences
   */
  async deleteRolePreferences(roleId: string): Promise<void> {
    await this.pool.query(
      `DELETE FROM ${this.roleTableName} WHERE role_id = $1`,
      [roleId]
    );

    // Invalidate cache
    if (this.cacheEnabled) {
      this.cache.delete(`role:${roleId}`);
    }
  }

  /**
   * List all role preferences
   */
  async listRolePreferences(): Promise<RolePreferences[]> {
    const result = await this.pool.query(
      `SELECT role_id, role_name, preferences, priority
       FROM ${this.roleTableName}
       ORDER BY priority DESC`
    );

    return result.rows.map((row) => ({
      roleId: row.role_id,
      roleName: row.role_name,
      preferences: this.deserializePreferences(row.preferences, row.role_id),
      priority: row.priority,
    }));
  }

  /**
   * Clear all caches
   */
  clearCache(): void {
    this.cache.clear();
  }

  // Private helper methods

  private serializePreferences(prefs: NotificationPreferences): string {
    return JSON.stringify(prefs);
  }

  private deserializePreferences(json: any, userId: string): NotificationPreferences {
    if (typeof json === 'string') {
      json = JSON.parse(json);
    }

    return {
      userId,
      channels: json.channels || {},
      quietHours: json.quietHours,
      severityThresholds: json.severityThresholds,
      eventTypeFilters: json.eventTypeFilters,
    };
  }

  private getFromCache<T>(key: string): T | undefined {
    const entry = this.cache.get(key);

    if (!entry) {
      return undefined;
    }

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return undefined;
    }

    return entry.value as T;
  }

  private setInCache<T>(key: string, value: T): void {
    this.cache.set(key, {
      value,
      expiresAt: Date.now() + this.cacheTTLMs,
    });
  }
}

/**
 * SQL migrations for the notification preferences tables
 */
export const notificationPreferencesMigrations = {
  up: `
    -- Create notification preferences table
    CREATE TABLE IF NOT EXISTS notification_preferences (
      user_id VARCHAR(255) PRIMARY KEY,
      preferences JSONB NOT NULL DEFAULT '{}',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    -- Create role preferences table
    CREATE TABLE IF NOT EXISTS notification_role_preferences (
      role_id VARCHAR(255) PRIMARY KEY,
      role_name VARCHAR(255) NOT NULL,
      preferences JSONB NOT NULL DEFAULT '{}',
      priority INTEGER NOT NULL DEFAULT 50,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    -- Create indexes
    CREATE INDEX IF NOT EXISTS idx_notification_preferences_updated_at
    ON notification_preferences (updated_at DESC);

    CREATE INDEX IF NOT EXISTS idx_notification_role_preferences_priority
    ON notification_role_preferences (priority DESC);

    -- Create function to update updated_at timestamp
    CREATE OR REPLACE FUNCTION update_notification_preferences_updated_at()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = CURRENT_TIMESTAMP;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    -- Create triggers
    DROP TRIGGER IF EXISTS trigger_notification_preferences_updated_at ON notification_preferences;
    CREATE TRIGGER trigger_notification_preferences_updated_at
    BEFORE UPDATE ON notification_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_notification_preferences_updated_at();

    DROP TRIGGER IF EXISTS trigger_notification_role_preferences_updated_at ON notification_role_preferences;
    CREATE TRIGGER trigger_notification_role_preferences_updated_at
    BEFORE UPDATE ON notification_role_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_notification_preferences_updated_at();
  `,

  down: `
    DROP TABLE IF EXISTS notification_preferences;
    DROP TABLE IF EXISTS notification_role_preferences;
    DROP FUNCTION IF EXISTS update_notification_preferences_updated_at();
  `,
};
