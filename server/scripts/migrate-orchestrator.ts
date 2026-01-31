import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getPostgresPool } from '../src/db/postgres.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = path.join(__dirname, '..', 'db', 'managed-migrations');

async function main() {
    const pool = getPostgresPool();

    // Ensure migrations table exists
    await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

    const { rows: applied } = await pool.query('SELECT version FROM schema_migrations');
    const appliedVersions = new Set(applied.map(r => r.version));

    const files = fs.readdirSync(MIGRATIONS_DIR)
        .filter(f => f.endsWith('.up.sql') && f.includes('orchestrator'))
        .sort();

    console.log(`Found ${files.length} orchestrator migrations.`);

    for (const file of files) {
        const version = file.split('_')[0];
        if (appliedVersions.has(version)) {
            console.log(`Skip ${file} (already applied)`);
            continue;
        }

        console.log(`Applying ${file}...`);
        const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');

        await pool.withTransaction(async (tx) => {
            await tx.query(sql);
            await tx.query('INSERT INTO schema_migrations (version) VALUES ($1)', [version]);
        });

        console.log(`Successfully applied ${file}`);
    }

    console.log('Orchestrator migrations complete.');
    process.exit(0);
}

main().catch(err => {
    console.error('Migration failed:', err);
    process.exit(1);
});
