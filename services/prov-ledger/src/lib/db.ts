import { Pool } from 'pg';
import { newDb } from 'pg-mem';

export interface Database {
  pool: Pool;
  ready: Promise<void>;
}

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS claims (
  id TEXT PRIMARY KEY,
  source_uri TEXT NOT NULL,
  hash TEXT NOT NULL,
  type TEXT NOT NULL,
  confidence REAL NOT NULL,
  license_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS evidence (
  id TEXT PRIMARY KEY,
  claim_id TEXT NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
  artifact_digest TEXT NOT NULL,
  transform_chain JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS provenance_chains (
  id TEXT PRIMARY KEY,
  claim_id TEXT NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
  transforms JSONB NOT NULL,
  sources JSONB NOT NULL,
  lineage JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ledger_entries (
  id TEXT PRIMARY KEY,
  claim_id TEXT,
  type TEXT NOT NULL,
  data JSONB NOT NULL,
  previous_hash TEXT,
  hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  seq SERIAL
);

CREATE INDEX IF NOT EXISTS idx_ledger_seq ON ledger_entries(seq);
`;

export function createDatabase(): Database {
  const useMemory = process.env.NODE_ENV === 'test';

  if (useMemory) {
    const db = newDb({ autoCreateForeignKeyIndices: true });
    const adapter = db.adapters.createPg();
    const pool = new adapter.Pool();
    const ready = pool.query(SCHEMA_SQL).then(() => undefined);
    return { pool: pool as unknown as Pool, ready };
  }

  const pool = new Pool({
    connectionString:
      process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/provenance',
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  });

  const ready = pool.query(SCHEMA_SQL).then(() => undefined);
  return { pool, ready };
}

