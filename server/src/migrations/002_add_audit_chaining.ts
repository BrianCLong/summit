export async function up(db: any) {
  await db.query(`
    ALTER TABLE audit_logs
    ADD COLUMN previous_hash TEXT;
  `);
}

export async function down(db: any) {
  await db.query(`
    ALTER TABLE audit_logs
    DROP COLUMN previous_hash;
  `);
}
