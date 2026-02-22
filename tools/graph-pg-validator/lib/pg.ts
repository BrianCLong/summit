import { Pool } from "pg";

let pool: Pool | null = null;

export function getPgPool(): Pool {
  if (!pool) {
    pool = new Pool({
      connectionString:
        process.env.PG_CONNECTION_STRING ||
        "postgresql://postgres:postgres@localhost:5432/postgres",
    });
  }
  return pool;
}

export async function closePg(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
