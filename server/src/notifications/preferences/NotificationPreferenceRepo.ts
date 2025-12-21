
// @ts-nocheck
import { pool } from '../../db/pg.js';
import { UserPreferences, NotificationPreference } from '../types.js';
import pino from 'pino';

// @ts-ignore
const logger = pino({ name: 'NotificationPreferenceRepo' });

export class NotificationPreferenceRepo {
  async getPreferences(userId: string): Promise<UserPreferences | null> {
    try {
      const res = await pool.query(
        'SELECT * FROM notification_preferences WHERE user_id = $1',
        [userId]
      );

      if (res.rows.length === 0) {
        return null;
      }

      const row = res.rows[0];
      return {
        userId: row.user_id,
        channels: row.channels,
        // categories: row.categories, // Future use
      };
    } catch (error: any) {
      logger.error({ userId, error: error.message }, 'Failed to get notification preferences');
      throw error;
    }
  }

  async setPreferences(userId: string, preferences: UserPreferences): Promise<void> {
    try {
      await pool.query(
        `INSERT INTO notification_preferences (user_id, channels, updated_at)
         VALUES ($1, $2, NOW())
         ON CONFLICT (user_id)
         DO UPDATE SET channels = $2, updated_at = NOW()`,
        [userId, JSON.stringify(preferences.channels)]
      );
    } catch (error: any) {
      logger.error({ userId, error: error.message }, 'Failed to set notification preferences');
      throw error;
    }
  }

  // New V2 methods
  async getTypePreferences(tenantId: string, userId: string): Promise<NotificationPreference[]> {
    try {
      const res = await pool.query(
        'SELECT * FROM notification_type_preferences WHERE tenant_id = $1 AND user_id = $2',
        [tenantId, userId]
      );
      return res.rows.map(this.mapRowV2);
    } catch (error: any) {
      logger.error({ tenantId, userId, error: error.message }, 'Failed to get notification type preferences');
      throw error;
    }
  }

  async setTypePreference(tenantId: string, userId: string, type: string, enabled: boolean): Promise<void> {
    try {
      await pool.query(
        `INSERT INTO notification_type_preferences (tenant_id, user_id, type, enabled, updated_at)
         VALUES ($1, $2, $3, $4, NOW())
         ON CONFLICT (user_id, tenant_id, type)
         DO UPDATE SET enabled = $4, updated_at = NOW()`,
        [tenantId, userId, type, enabled]
      );
    } catch (error: any) {
      logger.error({ tenantId, userId, type, error: error.message }, 'Failed to set notification type preference');
      throw error;
    }
  }

  private mapRowV2(row: any): NotificationPreference {
    return {
      userId: row.user_id,
      tenantId: row.tenant_id,
      type: row.type,
      enabled: row.enabled,
    };
  }
}
