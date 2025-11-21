import { pool } from '../../db/pg.js';
import { UserPreferences } from '../types.js';
import pino from 'pino';

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
}
