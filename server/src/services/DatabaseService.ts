import { getPostgresPool } from '../config/database';

export class DatabaseService {
  async query<T = any>(text: string, params?: any[]): Promise<{ rows: T[]; rowCount: number }> {
    const pool = getPostgresPool();
    const result = await pool.query(text, params);
    return {
      rows: result.rows,
      rowCount: result.rowCount
    };
  }
}
