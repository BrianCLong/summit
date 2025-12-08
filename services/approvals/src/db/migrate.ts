import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { db } from './database.js';
import { logger } from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MIGRATIONS_DIR = path.join(__dirname, '../../migrations');

interface Migration {
  version: string;
  filename: string;
  sql: string;
}

async function getAppliedMigrations(): Promise<Set<string>> {
  try {
    const result = await db.query<{ version: string }>(
      'SELECT version FROM schema_migrations',
    );
    return new Set(result.rows.map((r) => r.version));
  } catch {
    // Table doesn't exist yet
    return new Set();
  }
}

async function loadMigrations(): Promise<Migration[]> {
  const files = fs.readdirSync(MIGRATIONS_DIR).sort();
  const migrations: Migration[] = [];

  for (const filename of files) {
    if (!filename.endsWith('.sql')) continue;

    const version = filename.replace('.sql', '');
    const filepath = path.join(MIGRATIONS_DIR, filename);
    const sql = fs.readFileSync(filepath, 'utf-8');

    migrations.push({ version, filename, sql });
  }

  return migrations;
}

async function runMigrations(): Promise<void> {
  await db.connect();

  const applied = await getAppliedMigrations();
  const migrations = await loadMigrations();

  let count = 0;
  for (const migration of migrations) {
    if (applied.has(migration.version)) {
      logger.debug({ version: migration.version }, 'Migration already applied');
      continue;
    }

    logger.info({ version: migration.version }, 'Applying migration');

    try {
      await db.query(migration.sql);
      count++;
      logger.info({ version: migration.version }, 'Migration applied');
    } catch (error) {
      logger.error(
        { version: migration.version, error },
        'Migration failed',
      );
      throw error;
    }
  }

  if (count === 0) {
    logger.info('No new migrations to apply');
  } else {
    logger.info({ count }, 'Migrations completed');
  }
}

async function rollbackMigration(): Promise<void> {
  await db.connect();

  const result = await db.query<{ version: string }>(
    'SELECT version FROM schema_migrations ORDER BY applied_at DESC LIMIT 1',
  );

  if (result.rows.length === 0) {
    logger.info('No migrations to rollback');
    return;
  }

  const version = result.rows[0].version;
  logger.warn({ version }, 'Rollback not implemented - manual intervention required');
}

async function main(): Promise<void> {
  const command = process.argv[2] || 'up';

  try {
    if (command === 'rollback') {
      await rollbackMigration();
    } else {
      await runMigrations();
    }
  } finally {
    await db.disconnect();
  }
}

main().catch((error) => {
  logger.error({ error }, 'Migration failed');
  process.exit(1);
});
