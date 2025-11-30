import { Pool } from 'pg';

export const createPool = (connectionString: string): Pool => {
  return new Pool({ connectionString });
};

export const initSchema = async (pool: Pool): Promise<void> => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS taxonomy_levels (
      id SERIAL PRIMARY KEY,
      code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      max_duration_days INTEGER DEFAULT 365
    );

    CREATE TABLE IF NOT EXISTS documents (
      id UUID PRIMARY KEY,
      title TEXT NOT NULL,
      classification_code TEXT NOT NULL REFERENCES taxonomy_levels(code),
      residency TEXT NOT NULL,
      license TEXT NOT NULL,
      derived_from BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS downgrade_requests (
      id UUID PRIMARY KEY,
      document_id UUID NOT NULL REFERENCES documents(id),
      requested_code TEXT NOT NULL REFERENCES taxonomy_levels(code),
      justification TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      approver_one TEXT,
      approver_two TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS audit_receipts (
      id UUID PRIMARY KEY,
      document_id UUID REFERENCES documents(id),
      action TEXT NOT NULL,
      actor TEXT NOT NULL,
      details JSONB DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
};
