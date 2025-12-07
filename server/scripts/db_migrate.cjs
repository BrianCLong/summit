#!/usr/bin/env node

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

// Helper to run the ESM migration runner
async function runMigrations() {
  try {
    // Dynamic import to load the ESM module
    // We assume the MigrationRunner is exported from server/src/db/migrate.js
    const { MigrationRunner } = await import('../src/db/migrate.js');

    const command = process.argv[2] || 'up';
    const steps = process.argv[3] ? parseInt(process.argv[3]) : 1;

    const runner = new MigrationRunner();

    switch (command) {
      case 'up':
        await runner.runMigrations();
        break;
      case 'rollback':
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
        await runner.disconnect();
        break;
      default:
        console.log('Usage: npm run db:migrate [up|rollback|status] [steps]');
    }

    // Neo4j migration logic is currently separate or needs to be integrated
    // For now, we focus on Postgres as per the task "Postgres and Migration Discipline"
    // If we need Neo4j, we should add it to the MigrationRunner or keep a separate call here.
    // Given the task scope, having a solid Postgres runner is the priority.

  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

runMigrations();
