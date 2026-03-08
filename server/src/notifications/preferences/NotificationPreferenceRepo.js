"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationPreferenceRepo = void 0;
const pg_js_1 = require("../../db/pg.js");
const pino_1 = __importDefault(require("pino"));
const logger = pino_1.default({ name: 'NotificationPreferenceRepo' });
class NotificationPreferenceRepo {
    async getPreferences(userId) {
        try {
            const res = await pg_js_1.pool.query('SELECT * FROM notification_preferences WHERE user_id = $1', [userId]);
            if (res.rows.length === 0) {
                return null;
            }
            const row = res.rows[0];
            return {
                userId: row.user_id,
                channels: row.channels,
                // categories: row.categories, // Future use
            };
        }
        catch (error) {
            logger.error({ userId, error: error.message }, 'Failed to get notification preferences');
            throw error;
        }
    }
    async setPreferences(userId, preferences) {
        try {
            await pg_js_1.pool.query(`INSERT INTO notification_preferences (user_id, channels, updated_at)
         VALUES ($1, $2, NOW())
         ON CONFLICT (user_id)
         DO UPDATE SET channels = $2, updated_at = NOW()`, [userId, JSON.stringify(preferences.channels)]);
        }
        catch (error) {
            logger.error({ userId, error: error.message }, 'Failed to set notification preferences');
            throw error;
        }
    }
}
exports.NotificationPreferenceRepo = NotificationPreferenceRepo;
