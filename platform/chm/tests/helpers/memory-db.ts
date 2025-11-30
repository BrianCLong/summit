import { newDb } from 'pg-mem';
import { Pool } from 'pg';

export const createMemoryPool = (): { pool: Pool } => {
  const db = newDb({ autoCreateForeignKeyIndices: true });
  const pg = db.adapters.createPg();
  const pool = new pg.Pool();
  return { pool };
};
