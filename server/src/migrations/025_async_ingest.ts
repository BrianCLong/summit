export async function up(db: any) {
  await db.query(`
    CREATE TABLE IF NOT EXISTS ingest_async_jobs (
      id UUID PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      payload JSONB NOT NULL,
      payload_hash TEXT NOT NULL,
      idempotency_key TEXT,
      status TEXT NOT NULL DEFAULT 'PENDING',
      attempts INTEGER NOT NULL DEFAULT 0,
      next_attempt_at TIMESTAMPTZ DEFAULT NOW(),
      last_error TEXT,
      locked_at TIMESTAMPTZ,
      locked_by TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS ingest_async_outbox (
      id BIGSERIAL PRIMARY KEY,
      job_id UUID REFERENCES ingest_async_jobs(id) ON DELETE CASCADE,
      event_type TEXT NOT NULL,
      payload JSONB NOT NULL,
      attempts INTEGER NOT NULL DEFAULT 0,
      next_attempt_at TIMESTAMPTZ DEFAULT NOW(),
      processed_at TIMESTAMPTZ,
      last_error TEXT,
      locked_at TIMESTAMPTZ,
      locked_by TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  await db.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_ingest_async_jobs_payload_hash
      ON ingest_async_jobs(tenant_id, payload_hash);
  `);

  await db.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_ingest_async_jobs_idempotency
      ON ingest_async_jobs(tenant_id, idempotency_key)
      WHERE idempotency_key IS NOT NULL;
  `);

  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_ingest_async_outbox_pending
      ON ingest_async_outbox(next_attempt_at)
      WHERE processed_at IS NULL;
  `);
}

export async function down(db: any) {
  await db.query(`DROP TABLE IF EXISTS ingest_async_outbox;`);
  await db.query(`DROP TABLE IF EXISTS ingest_async_jobs;`);
}
