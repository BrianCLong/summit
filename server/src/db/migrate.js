#!/usr/bin/env node

import { Client } from 'pg';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATABASE_URL =
  process.env.DATABASE_URL ||
  'postgresql://maestro:maestro-dev-secret@localhost:5432/maestro';

class MigrationRunner {
  constructor(dbUrl) {
    this.client = new Client({ connectionString: dbUrl });
    this.migrationsDir = path.join(__dirname, 'migrations/postgres');
  }

  async connect() {
    await this.client.connect();
    console.log('Connected to database');
  }

  async disconnect() {
    await this.client.end();
    console.log('Disconnected from database');
  }

  async ensureMigrationsTable() {
    await this.client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version VARCHAR(255) PRIMARY KEY,
        executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
  }

  async getExecutedMigrations() {
    const result = await this.client.query(
      'SELECT version FROM schema_migrations ORDER BY version',
    );
    return result.rows.map((row) => row.version);
  }

  async getMigrationFiles() {
    try {
      const files = await fs.readdir(this.migrationsDir);
      return files.filter((file) => file.endsWith('.sql')).sort();
    } catch (error) {
      if (error.code === 'ENOENT') {
        console.log('Migrations directory not found, creating...');
        await fs.mkdir(this.migrationsDir, { recursive: true });
        return [];
      }
      throw error;
    }
  }

  async executeMigration(filename) {
    const filePath = path.join(this.migrationsDir, filename);
    const sql = await fs.readFile(filePath, 'utf8');

    console.log(`Executing migration: ${filename}`);

    // Start transaction
    await this.client.query('BEGIN');

    try {
      // Execute migration SQL
      await this.client.query(sql);

      // Record migration
      await this.client.query(
        'INSERT INTO schema_migrations (version) VALUES ($1)',
        [filename],
      );

      // Commit transaction
      await this.client.query('COMMIT');
      console.log(`✓ Migration ${filename} completed successfully`);
    } catch (error) {
      // Rollback transaction
      await this.client.query('ROLLBACK');
      console.error(`✗ Migration ${filename} failed:`, error.message);
      throw error;
    }
  }

  async runMigrations() {
    await this.connect();

    try {
      await this.ensureMigrationsTable();

      const executedMigrations = await this.getExecutedMigrations();
      const migrationFiles = await this.getMigrationFiles();

      const pendingMigrations = migrationFiles.filter(
        (file) => !executedMigrations.includes(file),
      );

      if (pendingMigrations.length === 0) {
        console.log('No pending migrations');
        return;
      }

      console.log(`Found ${pendingMigrations.length} pending migrations`);

      for (const migration of pendingMigrations) {
        await this.executeMigration(migration);
      }

      console.log('All migrations completed successfully');
    } finally {
      await this.disconnect();
    }
  }

  async rollback(steps = 1) {
    await this.connect();

    try {
      const executedMigrations = await this.getExecutedMigrations();
      const toRollback = executedMigrations.slice(-steps);

      console.log(`Rolling back ${toRollback.length} migrations`);

      for (const migration of toRollback.reverse()) {
        console.log(`Rolling back: ${migration}`);

        // Check if rollback SQL exists
        const rollbackFile = migration.replace('.sql', '.rollback.sql');
        const rollbackPath = path.join(this.migrationsDir, rollbackFile);

        try {
          const rollbackSql = await fs.readFile(rollbackPath, 'utf8');

          await this.client.query('BEGIN');
          await this.client.query(rollbackSql);
          await this.client.query(
            'DELETE FROM schema_migrations WHERE version = $1',
            [migration],
          );
          await this.client.query('COMMIT');

          console.log(`✓ Rolled back ${migration}`);
        } catch (error) {
          await this.client.query('ROLLBACK');
          console.error(`✗ Rollback failed for ${migration}:`, error.message);
          throw error;
        }
      }
    } finally {
      await this.disconnect();
    }
  }
}

// CLI interface
async function main() {
  const command = process.argv[2];
  const runner = new MigrationRunner(DATABASE_URL);

  try {
    switch (command) {
      case 'up':
        await runner.runMigrations();
        break;
      case 'rollback':
        const steps = parseInt(process.argv[3]) || 1;
        await runner.rollback(steps);
        break;
      case 'status':
        await runner.connect();
        await runner.ensureMigrationsTable();
        const executed = await runner.getExecutedMigrations();
        const all = await runner.getMigrationFiles();
        const pending = all.filter((f) => !executed.includes(f));

        console.log('Migration Status:');
        console.log(`Executed: ${executed.length}`);
        console.log(`Pending: ${pending.length}`);

        if (pending.length > 0) {
          console.log('Pending migrations:', pending);
        }

        await runner.disconnect();
        break;
      default:
        console.log('Usage: node migrate.js [up|rollback|status] [steps]');
        process.exit(1);
    }
  } catch (error) {
    console.error('Migration failed:', error.message);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { MigrationRunner };
