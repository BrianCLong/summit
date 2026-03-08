"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.warRoomService = exports.WarRoomService = void 0;
// @ts-nocheck
const database_js_1 = require("../config/database.js");
class WarRoomService {
    get db() {
        return (0, database_js_1.getPostgresPool)();
    }
    async createWarRoom(name, createdBy) {
        const { rows } = await this.db.query('INSERT INTO war_rooms (name, created_by) VALUES ($1, $2) RETURNING *', [name, createdBy]);
        return rows[0];
    }
    async addParticipant(warRoomId, userId, role) {
        const { rows } = await this.db.query('INSERT INTO war_room_participants (war_room_id, user_id, role) VALUES ($1, $2, $3) RETURNING *', [warRoomId, userId, role]);
        return rows[0];
    }
    async removeParticipant(warRoomId, userId) {
        await this.db.query('DELETE FROM war_room_participants WHERE war_room_id = $1 AND user_id = $2', [warRoomId, userId]);
    }
    async getWarRoom(id) {
        const { rows } = await this.db.query('SELECT * FROM war_rooms WHERE id = $1', [id]);
        return rows[0];
    }
    async getWarRooms() {
        const { rows } = await this.db.query('SELECT * FROM war_rooms');
        return rows;
    }
    async getParticipants(warRoomId) {
        const { rows } = await this.db.query('SELECT * FROM war_room_participants WHERE war_room_id = $1', [warRoomId]);
        return rows;
    }
}
exports.WarRoomService = WarRoomService;
exports.warRoomService = new WarRoomService();
