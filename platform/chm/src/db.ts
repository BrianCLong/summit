import { Pool } from 'pg';

export function createPool(): Pool {
  const connectionString = process.env.CHM_DATABASE_URL;
  if (!connectionString) {
    throw new Error('CHM_DATABASE_URL is required for database connectivity');
  }
  return new Pool({ connectionString });
}
