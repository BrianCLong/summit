// @ts-nocheck
import { Pool } from 'pg';

const rw = new Pool({ connectionString: process.env.PG_RW_URL || process.env.PG_URL });
const ro = new Pool({ connectionString: process.env.PG_RO_URL || process.env.PG_URL });

export const db = {
  write: (query: string, params: unknown[]) => rw.query(query, params),
  read: (query: string, params: unknown[]) => ro.query(query, params)
};
