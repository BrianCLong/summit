/**
 * Data Factory Service - Database Migration Runner
 *
 * Runs SQL migrations in order and tracks which have been applied.
 */

import { readdir, readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import pino from 'pino';
import { createPool, closePool, query, transaction } from './connection.js';
import type pg from 'pg';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const logger = pino({
  name: 'data-factory-migrate',
  level: process.env.LOG_LEVEL || 'info',
});

const MIGRATIONS_DIR = join(__dirname, '../../migrations');

interface Migration {
  id: number;
  name: string;
  applied_at: Date;
}

async function ensureMigrationsTable(): Promise<void> {
  await query(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) UNIQUE NOT NULL,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

async function getAppliedMigrations(): Promise<Set<string>> {
  const result = await query<Migration>('SELECT name FROM _migrations ORDER BY id');
  return new Set(result.rows.map((row) => row.name));
}

async function getMigrationFiles(): Promise<string[]> {
  const files = await readdir(MIGRATIONS_DIR);
  return files
    .filter((f) => f.endsWith('.sql'))
    .sort((a, b) => {
      const numA = parseInt(a.split('_')[0], 10);
      const numB = parseInt(b.split('_')[0], 10);
      return numA - numB;
    });
}

async function applyMigration(
  client: pg.PoolClient,
  filename: string
): Promise<void> {
  const filepath = join(MIGRATIONS_DIR, filename);
  const sql = await readFile(filepath, 'utf-8');

  logger.info({ migration: filename }, 'Applying migration');

  await client.query(sql);
  await client.query('INSERT INTO _migrations (name) VALUES ($1)', [filename]);

  logger.info({ migration: filename }, 'Migration applied successfully');
}

async function runMigrations(): Promise<void> {
  createPool();

  try {
    await ensureMigrationsTable();

    const applied = await getAppliedMigrations();
    const files = await getMigrationFiles();
    const pending = files.filter((f) => !applied.has(f));

    if (pending.length === 0) {
      logger.info('No pending migrations');
      return;
    }

    logger.info({ count: pending.length }, 'Pending migrations found');

    for (const file of pending) {
      await transaction(async (client) => {
        await applyMigration(client, file);
      });
    }

    logger.info('All migrations applied successfully');
  } catch (error) {
    logger.error({ error }, 'Migration failed');
    throw error;
  } finally {
    await closePool();
  }
}

async function rollbackMigration(migrationName: string): Promise<void> {
  createPool();

  try {
    const applied = await getAppliedMigrations();

    if (!applied.has(migrationName)) {
      logger.warn({ migration: migrationName }, 'Migration not found in applied list');
      return;
    }

    await transaction(async (client) => {
      // Look for a rollback file
      const rollbackFile = migrationName.replace('.sql', '_rollback.sql');
      const rollbackPath = join(MIGRATIONS_DIR, rollbackFile);

      try {
        const sql = await readFile(rollbackPath, 'utf-8');
        logger.info({ migration: migrationName }, 'Rolling back migration');
        await client.query(sql);
        await client.query('DELETE FROM _migrations WHERE name = $1', [migrationName]);
        logger.info({ migration: migrationName }, 'Rollback completed');
      } catch {
        logger.error({ migration: migrationName }, 'No rollback file found');
        throw new Error(`No rollback file found for ${migrationName}`);
      }
    });
  } finally {
    await closePool();
  }
}

async function getMigrationStatus(): Promise<{
  applied: string[];
  pending: string[];
}> {
  createPool();

  try {
    await ensureMigrationsTable();

    const applied = await getAppliedMigrations();
    const files = await getMigrationFiles();

    return {
      applied: files.filter((f) => applied.has(f)),
      pending: files.filter((f) => !applied.has(f)),
    };
  } finally {
    await closePool();
  }
}

// CLI interface
const command = process.argv[2];

if (command === 'up' || !command) {
  runMigrations()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
} else if (command === 'status') {
  getMigrationStatus()
    .then((status) => {
      console.log('Applied migrations:', status.applied);
      console.log('Pending migrations:', status.pending);
      process.exit(0);
    })
    .catch(() => process.exit(1));
} else if (command === 'rollback') {
  const migrationName = process.argv[3];
  if (!migrationName) {
    console.error('Usage: migrate rollback <migration_name>');
    process.exit(1);
  }
  rollbackMigration(migrationName)
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
} else {
  console.error('Unknown command. Use: up, status, or rollback');
  process.exit(1);
}

export { runMigrations, rollbackMigration, getMigrationStatus };
