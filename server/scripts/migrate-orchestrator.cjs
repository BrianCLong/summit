const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const MIGRATIONS_DIR = path.join(__dirname, '..', 'db', 'managed-migrations');
const POSTGRES_URL = process.env.DATABASE_URL || 'postgresql://intelgraph:devpassword@localhost:5432/intelgraph_dev';

async function main() {
    const pool = new Pool({ connectionString: POSTGRES_URL });

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

        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            await client.query(sql);
            await client.query('INSERT INTO schema_migrations (version) VALUES ($1)', [version]);
            await client.query('COMMIT');
            console.log(`Successfully applied ${file}`);
        } catch (err) {
            await client.query('ROLLBACK');
            console.error(`Failed to apply ${file}:`, err);
            process.exit(1);
        } finally {
            client.release();
        }
    }

    console.log('Orchestrator migrations complete.');
    await pool.end();
    process.exit(0);
}

main().catch(err => {
    console.error('Migration failed:', err);
    process.exit(1);
});
