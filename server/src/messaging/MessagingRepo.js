"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessagingRepo = void 0;
const pg_js_1 = require("../db/pg.js");
const pino_1 = __importDefault(require("pino"));
const logger = pino_1.default({ name: 'MessagingRepo' });
class MessagingRepo {
    async create(payload) {
        try {
            const res = await pg_js_1.pool.query(`INSERT INTO messages (sender_id, recipient_id, content)
         VALUES ($1, $2, $3)
         RETURNING *`, [payload.senderId, payload.recipientId, payload.content]);
            return this.mapRow(res.rows[0]);
        }
        catch (error) {
            logger.error({ senderId: payload.senderId, error: error instanceof Error ? error.message : 'Unknown error' }, 'Failed to create message');
            throw error;
        }
    }
    async getHistory(userId, otherUserId, limit = 50) {
        const res = await pg_js_1.pool.query(`SELECT * FROM messages
       WHERE (sender_id = $1 AND recipient_id = $2)
          OR (sender_id = $2 AND recipient_id = $1)
       ORDER BY created_at ASC
       LIMIT $3`, [userId, otherUserId, limit]);
        return res.rows.map((row) => this.mapRow(row));
    }
    mapRow(row) {
        return {
            id: row.id,
            senderId: row.sender_id,
            recipientId: row.recipient_id,
            content: row.content,
            createdAt: row.created_at,
            readAt: row.read_at ?? undefined,
        };
    }
}
exports.MessagingRepo = MessagingRepo;
