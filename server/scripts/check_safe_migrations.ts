#!/usr/bin/env node --loader ts-node/esm
import { MigrationManager } from '../src/db/migrations/versioning.js';
import path from 'path';
import { fileURLToPath } from 'url';

// ESM compatibility for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function checkSafeMigrations() {
    console.log('🛡️  Checking migration safety...');

    const manager = new MigrationManager();
    const migrations = manager.readMigrationFiles();

    let errors = 0;

    for (const migration of migrations) {
        try {
            // Using the static method directly
            MigrationManager.validateOnlineSafety(migration.upSql);
            // console.log(`✅  ${migration.name} is safe.`);
        } catch (error: any) {
            console.error(`❌  ${migration.name} failed safety check:`);
            console.error(`    ${error.message}`);
            errors++;
        }
    }

    if (errors > 0) {
        console.error(`\nFound ${errors} unsafe migration(s).`);
        console.error('Use ALLOW_BREAKING_MIGRATIONS=true to bypass if you are sure.');
        process.exit(1);
    }

    console.log('✅  All migrations are online-safe.');
}

checkSafeMigrations();
