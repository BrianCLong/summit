import { db } from '../db'; // Assuming a db connection utility exists

export class WarRoomService {
  async createWarRoom(name: string, createdBy: number) {
    const { rows } = await db.query(
      'INSERT INTO war_rooms (name, created_by) VALUES ($1, $2) RETURNING *',
      [name, createdBy]
    );
    return rows[0];
  }

  async addParticipant(warRoomId: number, userId: number, role: string) {
    const { rows } = await db.query(
      'INSERT INTO war_room_participants (war_room_id, user_id, role) VALUES ($1, $2, $3) RETURNING *',
      [warRoomId, userId, role]
    );
    return rows[0];
  }

  async removeParticipant(warRoomId: number, userId: number) {
    await db.query(
      'DELETE FROM war_room_participants WHERE war_room_id = $1 AND user_id = $2',
      [warRoomId, userId]
    );
  }

  async getWarRoom(id: number) {
    const { rows } = await db.query('SELECT * FROM war_rooms WHERE id = $1', [id]);
    return rows[0];
  }

  async getWarRooms() {
    const { rows } = await db.query('SELECT * FROM war_rooms');
    return rows;
  }

  async getParticipants(warRoomId: number) {
    const { rows } = await db.query(
      'SELECT * FROM war_room_participants WHERE war_room_id = $1',
      [warRoomId]
    );
    return rows;
  }
}

export const warRoomService = new WarRoomService();
