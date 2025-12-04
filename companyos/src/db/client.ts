import { Pool } from 'pg';

const connectionString =
  process.env.COMPANYOS_DB_URL ??
  'postgres://companyos:companyos@companyos-db:5432/companyos';

export const pool = new Pool({
  connectionString,
  max: 10,
});
