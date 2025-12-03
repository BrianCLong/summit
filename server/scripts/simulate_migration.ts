
import fs from 'fs';
import path from 'path';
import { Client } from 'pg';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Fix __dirname for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env vars
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const MIGRATIONS_DIR = path.resolve(__dirname, '../db/migrations/postgres');

/**
 * Parses SQL file content to remove BEGIN/COMMIT/ROLLBACK statements
 * to allow running within a parent transaction.
 */
function readSqlFile(filepath: string): string {
  const content = fs.readFileSync(filepath, 'utf8');
  // Remove BEGIN, COMMIT, ROLLBACK at the start/end of lines (case insensitive)
  return content
    .replace(/^\s*BEGIN\s*;\s*$/gim, '')
    .replace(/^\s*COMMIT\s*;\s*$/gim, '')
    .replace(/^\s*ROLLBACK\s*;\s*$/gim, '');
}

async function runMigration(client: Client, sql: string, name: string) {
  console.log(`Running ${name}...`);
  try {
    await client.query(sql);
    console.log(`✅ ${name} Success`);
  } catch (e: any) {
    if (e.message.includes('already exists')) {
       console.warn(`⚠️  ${name} Warning: Object already exists. DB might be partially migrated.`);
    }
    // We re-throw because in a simulator, we expect cleanliness unless we are handling it.
    // For now, failure to create means the state is not as expected.
    throw e;
  }
}

async function main() {
  const args = process.argv.slice(2);
  const targetMigration = args[0];

  // 1. Identify Migrations
  const files = fs.readdirSync(MIGRATIONS_DIR)
    .filter(f => f.endsWith('.sql') && !f.endsWith('.down.sql'))
    .sort();

  if (targetMigration) {
    if (!files.includes(targetMigration)) {
      console.error(`Migration ${targetMigration} not found.`);
      process.exit(1);
    }
    console.log(`Targeting single migration: ${targetMigration}`);
  }

  // 2. Connect to Database
  const connStr = process.env.POSTGRES_URL || process.env.DATABASE_URL;
  if (!connStr) {
    console.error('POSTGRES_URL or DATABASE_URL is not set.');
    process.exit(1);
  }

  const client = new Client({ connectionString: connStr });
  await client.connect();

  console.log('Connected to database.');
  console.log('Starting simulation in GLOBAL TRANSACTION mode...');
  console.log('⚠️  Note: This simulation rolls back ALL changes at the end.');

  // Global Transaction
  await client.query('BEGIN');

  try {
    // 3. Simulation Loop
    for (const file of files) {
      // If filtering, skip others?
      // Logic Fix: If we filter, we might miss dependencies.
      // But if user asks for specific migration, they might imply "test this one, assume DB is ready".
      // If we run ALL, we assume DB is empty/ready for first.

      // If targetMigration is set, we skip until we hit it?
      // Or do we assume previous ones are applied?
      // Standard practice: Simulator runs against current DB state.
      // If current DB state matches "Before target", we are good.
      // If target is N, and we are at N-1.

      // If we loop through ALL, we are trying to apply ALL from scratch (or from wherever DB is).
      // Since `db_migrate.cjs` doesn't track state in DB, we can't easily know where we are.

      // Decision: Iterate all files.
      // If targetMigration is specified, ONLY test that one (assuming environment is ready).
      if (targetMigration && file !== targetMigration) {
         continue;
      }

      const downFile = file.replace('.sql', '.down.sql');
      const hasDown = fs.existsSync(path.join(MIGRATIONS_DIR, downFile));

      if (!hasDown) {
        if (targetMigration) {
             console.warn(`⚠️  No down migration for ${file}. Cannot simulate backward migration.`);
        }
        // If we are running the full suite, we MUST apply the Forward migration to keep state consistent for next files.
        // Even if we don't test backward.
        if (!targetMigration) {
           console.log(`⏩ Applying ${file} (Forward Only - No Down Script)`);
           const upSql = readSqlFile(path.join(MIGRATIONS_DIR, file));
           await runMigration(client, upSql, file);
        }
        continue;
      }

      console.log(`\n---------------------------------------------------`);
      console.log(`Testing Migration Safety: ${file}`);
      console.log(`---------------------------------------------------`);

      // Create Savepoint for this specific migration test
      // This allows us to rollback JUST this migration to test the DOWN script,
      // but then we need to re-apply UP to continue the chain.
      const savepointName = `sp_${file.replace(/[^a-zA-Z0-9]/g, '_')}`;

      // 1. Mark state before migration
      // Actually, we don't need a savepoint if we rely on DOWN to work.
      // But if DOWN fails, we want to fail the test.
      // If DOWN succeeds, we are back to state "Before Migration".

      // Strategy:
      // A. UP
      // B. DOWN (Should return to Before)
      // C. UP (To advance to Next)

      // If DOWN is broken, we might be in a bad state.
      // So using Savepoint is safer to recover if DOWN fails?
      // But if DOWN fails, the test fails, so we abort anyway.

      // Let's use simple UP -> DOWN -> UP sequence.

      try {
        // A. Run UP
        console.log(`⬆️  Applying Forward Migration...`);
        const upSql = readSqlFile(path.join(MIGRATIONS_DIR, file));
        await runMigration(client, upSql, file);

        // B. Run DOWN
        console.log(`⬇️  Applying Backward Migration...`);
        const downSql = readSqlFile(path.join(MIGRATIONS_DIR, downFile));
        await runMigration(client, downSql, downFile);

        // C. Re-Apply UP (to continue chain)
        console.log(`🔄 Re-applying Forward Migration (restoring state for next steps)...`);
        await runMigration(client, upSql, file);

        console.log(`✨ Simulation Passed for ${file}`);

      } catch (err: any) {
        console.error(`💥 Simulation Failed for ${file}: ${err.message}`);
        throw err;
      }
    }

    console.log('\n🎉 All simulations finished successfully.');

  } catch (e: any) {
    console.error('\n❌ Simulation Process Failed:', e.message);
    process.exit(1);
  } finally {
    // Always rollback the global transaction so we don't pollute the dev DB
    // This makes the simulation safe to run on local dev DBs.
    await client.query('ROLLBACK');
    console.log(`🔄 Global Transaction Rolled Back (Clean State Preserved)`);
    await client.end();
  }
}

main();
