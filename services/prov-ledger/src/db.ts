// @ts-nocheck
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.PG_URL });

export async function query<T>(text: string, params: any[] = []) {
  return pool.query<T>(text, params);
}
