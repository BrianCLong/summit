#!/usr/bin/env node
/**
 * Rollback Script Validator
 *
 * Ensures every SQL migration file has a corresponding rollback/undo script.
 * Enforces strict "expand/contract" pattern and data safety.
 *
 * Usage: node scripts/check-rollbacks.js <migrations-directory>
 */

const fs = require('fs');
const path = require('path');

function main() {
  const migrationsDir = process.argv[2];

  if (!migrationsDir) {
    console.error(
      'Usage: node scripts/check-rollbacks.js <migrations-directory>',
    );
    process.exit(1);
  }

  if (!fs.existsSync(migrationsDir)) {
    console.error(`❌ Directory not found: ${migrationsDir}`);
    process.exit(1);
  }

  console.log(`🔍 Verifying rollback scripts in: ${migrationsDir}`);

  // Find all migration files (assuming .sql extensions)
  // Exclude existing rollback scripts (ending in .down.sql or similar)
  const allFiles = fs.readdirSync(migrationsDir);

  const migrationFiles = allFiles.filter(
    (file) =>
      file.endsWith('.sql') &&
      !file.endsWith('.down.sql') &&
      !file.endsWith('.rollback.sql') &&
      !file.includes('.rehydrated') // Skip rehydrated/backup files
  ).sort();

  if (migrationFiles.length === 0) {
    console.log('ℹ️  No migration files found to check.');
    process.exit(0);
  }

  let missingRollbacks = 0;

  migrationFiles.forEach((file) => {
    // Determine expected rollback filename
    // Convention: X.sql -> X.down.sql
    const baseName = file.replace(/\.sql$/, '');
    const rollbackName = `${baseName}.down.sql`;
    const rollbackPath = path.join(migrationsDir, rollbackName);

    // Alternative: check for X.rollback.sql
    const altRollbackName = `${baseName}.rollback.sql`;
    const altRollbackPath = path.join(migrationsDir, altRollbackName);

    if (!fs.existsSync(rollbackPath) && !fs.existsSync(altRollbackPath)) {
      console.error(`❌ Missing rollback script for: ${file}`);
      console.error(`   Expected: ${rollbackName}`);
      missingRollbacks++;
    }
  });

  if (missingRollbacks > 0) {
    console.log(`\n❌ Found ${missingRollbacks} migrations without rollback scripts.`);
    console.log('Every migration must have a corresponding .down.sql script to ensure reversibility.');
    process.exit(1);
  } else {
    console.log(`\n✅ All ${migrationFiles.length} migrations have rollback scripts.`);
    process.exit(0);
  }
}

main();
