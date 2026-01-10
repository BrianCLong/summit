// @ts-nocheck
import { getPostgresPool } from '../config/database.js';
import { type QueryResult } from 'pg';



interface WarRoom {
  id: number;
  name: string;
  created_by: number;
  created_at?: Date;
}

interface WarRoomParticipant {
  id: number;
  war_room_id: number;
  user_id: number;
  role: string;
  joined_at?: Date;
}

export class WarRoomService {
  private get db() {
    return getPostgresPool();
  }
  async createWarRoom(name: string, createdBy: number): Promise<WarRoom> {
    const { rows }: QueryResult<WarRoom> = await this.db.query(
      'INSERT INTO war_rooms (name, created_by) VALUES ($1, $2) RETURNING *',
      [name, createdBy]
    );
    return rows[0];
  }

  async addParticipant(warRoomId: number, userId: number, role: string): Promise<WarRoomParticipant> {
    const { rows }: QueryResult<WarRoomParticipant> = await this.db.query(
      'INSERT INTO war_room_participants (war_room_id, user_id, role) VALUES ($1, $2, $3) RETURNING *',
      [warRoomId, userId, role]
    );
    return rows[0];
  }

  async removeParticipant(warRoomId: number, userId: number): Promise<void> {
    await this.db.query(
      'DELETE FROM war_room_participants WHERE war_room_id = $1 AND user_id = $2',
      [warRoomId, userId]
    );
  }

  async getWarRoom(id: number): Promise<WarRoom | undefined> {
    const { rows }: QueryResult<WarRoom> = await this.db.query('SELECT * FROM war_rooms WHERE id = $1', [id]);
    return rows[0];
  }

  async getWarRooms(): Promise<WarRoom[]> {
    const { rows }: QueryResult<WarRoom> = await this.db.query('SELECT * FROM war_rooms');
    return rows;
  }

  async getParticipants(warRoomId: number): Promise<WarRoomParticipant[]> {
    const { rows }: QueryResult<WarRoomParticipant> = await this.db.query(
      'SELECT * FROM war_room_participants WHERE war_room_id = $1',
      [warRoomId]
    );
    return rows;
  }
}

export const warRoomService = new WarRoomService();
