"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationRepo = void 0;
const pg_js_1 = require("../../db/pg.js");
const types_js_1 = require("../types.js");
const pino_1 = __importDefault(require("pino"));
const logger = pino_1.default({ name: 'NotificationRepo' });
class NotificationRepo {
    async create(payload) {
        try {
            const res = await pg_js_1.pool.query(`INSERT INTO notifications (user_id, type, priority, subject, message, data, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`, [
                payload.userId,
                payload.type,
                payload.priority || types_js_1.NotificationPriority.MEDIUM,
                payload.subject,
                payload.message,
                JSON.stringify(payload.data || {}),
                types_js_1.NotificationStatus.SENT, // Assuming we create it when sent/ready
            ]);
            return this.mapRow(res.rows[0]);
        }
        catch (error) {
            logger.error({ userId: payload.userId, error: error.message }, 'Failed to create notification');
            throw error;
        }
    }
    async markAsRead(id, userId) {
        await pg_js_1.pool.query('UPDATE notifications SET is_read = TRUE, updated_at = NOW() WHERE id = $1 AND user_id = $2', [id, userId]);
    }
    async markAllAsRead(userId) {
        await pg_js_1.pool.query('UPDATE notifications SET is_read = TRUE, updated_at = NOW() WHERE user_id = $1', [userId]);
    }
    async getUnread(userId, limit = 20, offset = 0) {
        const res = await pg_js_1.pool.query('SELECT * FROM notifications WHERE user_id = $1 AND is_read = FALSE ORDER BY created_at DESC LIMIT $2 OFFSET $3', [userId, limit, offset]);
        return res.rows.map(this.mapRow);
    }
    mapRow(row) {
        return {
            id: row.id,
            userId: row.user_id,
            type: row.type,
            priority: row.priority,
            subject: row.subject,
            message: row.message,
            data: row.data,
            status: row.status,
            isRead: row.is_read,
            createdAt: row.created_at,
        };
    }
}
exports.NotificationRepo = NotificationRepo;
