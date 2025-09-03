export async function up(db: any) {
  await db.query(`
    ALTER TABLE pipelines
    ADD COLUMN tenant_id TEXT NOT NULL DEFAULT 'global';
    ALTER TABLE pipelines
    ALTER COLUMN tenant_id DROP DEFAULT;

    ALTER TABLE runs
    ADD COLUMN tenant_id TEXT NOT NULL DEFAULT 'global';
    ALTER TABLE runs
    ALTER COLUMN tenant_id DROP DEFAULT;

    ALTER TABLE executors
    ADD COLUMN tenant_id TEXT NOT NULL DEFAULT 'global';
    ALTER TABLE executors
    ALTER COLUMN tenant_id DROP DEFAULT;
  `);
}

export async function down(db: any) {
  await db.query(`
    ALTER TABLE pipelines
    DROP COLUMN tenant_id;

    ALTER TABLE runs
    DROP COLUMN tenant_id;

    ALTER TABLE executors
    DROP COLUMN tenant_id;
  `);
}
