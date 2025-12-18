#!/usr/bin/env node

/**
 * Migration Script for Production Persistence
 * Applies PostgreSQL schema and Neo4j constraints
 * Adds pre-flight validation with backward-compatibility checks,
 * dry-run support, and automated rollback plan generation.
 */

const { Pool } = require('pg');
const neo4j = require('neo4j-driver');
const fs = require('fs');
const path = require('path');

// Environment configuration
const POSTGRES_URL =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  'postgresql://intelgraph:devpassword@localhost:5432/intelgraph_dev';
const NEO4J_URI = process.env.NEO4J_URI || 'bolt://localhost:7687';
const NEO4J_USER = process.env.NEO4J_USER || 'neo4j';
const NEO4J_PASSWORD = process.env.NEO4J_PASSWORD || 'devpassword';
const ALLOW_BREAKING = process.env.ALLOW_BREAKING_SCHEMA === 'true';

const MIGRATIONS_DIR = path.join(__dirname, '..', 'migrations');
const ROLLBACK_DIR = path.join(MIGRATIONS_DIR, 'rollback');
const LOG_PATH = path.join(__dirname, '..', 'logs', 'migration-preflight.log');

function ensureLogFile() {
  fs.mkdirSync(path.dirname(LOG_PATH), { recursive: true });
  if (!fs.existsSync(LOG_PATH)) {
    fs.writeFileSync(LOG_PATH, '');
  }
}

function log(message) {
  ensureLogFile();
  const timestamp = new Date().toISOString();
  const line = `[${timestamp}] ${message}`;
  console.log(line);
  fs.appendFileSync(LOG_PATH, `${line}\n`);
}

function loadMigrationFiles() {
  const migrationFiles = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((file) => file.endsWith('.sql') && !file.endsWith('.rehydrated.sql'))
    .map((file) => ({
      file,
      version: file.split('_')[0],
      path: path.join(MIGRATIONS_DIR, file),
    }))
    .sort((a, b) => a.file.localeCompare(b.file));

  const duplicateVersions = migrationFiles.reduce((acc, migration) => {
    acc[migration.version] = (acc[migration.version] || 0) + 1;
    return acc;
  }, {});

  const duplicates = Object.entries(duplicateVersions)
    .filter(([, count]) => count > 1)
    .map(([version]) => version);

  if (duplicates.length > 0) {
    throw new Error(
      `Detected duplicate migration versions: ${duplicates.join(', ')}`,
    );
  }

  return migrationFiles.map((migration) => ({
    ...migration,
    sql: fs.readFileSync(migration.path, 'utf8'),
  }));
}

function detectSchemaConflicts(appliedVersions, migrations) {
  const migrationVersions = new Set(migrations.map((migration) => migration.version));

  const missingFiles = [...appliedVersions].filter(
    (version) => !migrationVersions.has(version),
  );

  if (missingFiles.length > 0) {
    throw new Error(
      `Schema conflict: applied migrations missing locally (${missingFiles.join(', ')})`,
    );
  }
}

function validateBackwardCompatibility(sql, version) {
  const breakingPatterns = [
    /DROP\s+TABLE/i,
    /DROP\s+COLUMN/i,
    /ALTER\s+TABLE[^;]+RENAME/i,
    /ALTER\s+TABLE[^;]+TYPE/i,
    /SET\s+NOT\s+NULL/i,
  ];

  const matches = breakingPatterns
    .map((pattern) => sql.match(pattern))
    .filter(Boolean)
    .map((match) => match[0]);

  if (matches.length && !ALLOW_BREAKING) {
    throw new Error(
      `Backward-compatibility check failed for ${version}: ${matches.join(', ')}`,
    );
  }

  if (matches.length) {
    log(
      `⚠️  ${version} flagged for potential breaking change (${matches.join(', ')}), ALLOW_BREAKING_SCHEMA enabled.`,
    );
  }
}

function buildRollbackStatements(sql) {
  const statements = sql
    .split(';')
    .map((stmt) => stmt.trim())
    .filter(Boolean);

  const rollback = [];

  statements.forEach((statement) => {
    const createTableMatch = statement.match(/CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS\s+(\w+)/i)
      || statement.match(/CREATE\s+TABLE\s+(\w+)/i);
    const addColumnMatch = statement.match(
      /ALTER\s+TABLE\s+(\w+)\s+ADD\s+COLUMN\s+(IF\s+NOT\s+EXISTS\s+)?(\w+)/i,
    );
    const createIndexMatch = statement.match(/CREATE\s+(UNIQUE\s+)?INDEX\s+(\w+)/i);

    if (createTableMatch) {
      rollback.push(`DROP TABLE IF EXISTS ${createTableMatch[1]} CASCADE;`);
    }

    if (addColumnMatch) {
      rollback.push(
        `ALTER TABLE ${addColumnMatch[1]} DROP COLUMN IF EXISTS ${addColumnMatch[3]} CASCADE;`,
      );
    }

    if (createIndexMatch) {
      rollback.push(`DROP INDEX IF EXISTS ${createIndexMatch[2]} CASCADE;`);
    }
  });

  if (rollback.length === 0) {
    rollback.push('-- No rollback hints generated for this migration.');
  }

  return rollback;
}

function writeRollbackScript(version, file, rollbackStatements) {
  fs.mkdirSync(ROLLBACK_DIR, { recursive: true });
  const rollbackPath = path.join(
    ROLLBACK_DIR,
    `${version}_${file.replace('.sql', '')}_rollback.sql`,
  );

  const header = [
    '-- Automated rollback plan (best-effort, verify before production use).',
    `-- Generated from ${file} on ${new Date().toISOString()}.`,
    'BEGIN;',
  ];

  const body = rollbackStatements.join('\n');
  const footer = ['ROLLBACK;', ''];

  fs.writeFileSync(rollbackPath, `${header.join('\n')}
${body}
${footer.join('\n')}`);

  log(`📝 Rollback script prepared at ${rollbackPath}`);
}

async function ensureSchemaMigrationsTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version VARCHAR(255) PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

async function getAppliedVersions(client) {
  const { rows } = await client.query('SELECT version FROM schema_migrations');
  return new Set(rows.map((row) => row.version));
}

async function applyMigration(client, migration, { dryRun }) {
  const { version, file, sql } = migration;
  log(`${dryRun ? '🔍 Dry-run' : '🚀 Applying'} migration ${file}`);

  await client.query('BEGIN');

  try {
    await client.query(sql);

    if (dryRun) {
      await client.query('ROLLBACK');
      log(`✅ Dry-run succeeded for ${version}; changes rolled back.`);
    } else {
      await client.query('INSERT INTO schema_migrations (version) VALUES ($1)', [
        version,
      ]);
      await client.query('COMMIT');
      log(`✅ Migration ${version} applied and recorded.`);
    }
  } catch (error) {
    await client.query('ROLLBACK');
    throw new Error(`Migration ${version} failed: ${error.message}`);
  }
}

async function runPostgresMigrations({ dryRun = false } = {}) {
  log('🔄 Running PostgreSQL migrations with pre-flight validation...');

  const pool = new Pool({ connectionString: POSTGRES_URL });
  const client = await pool.connect();

  try {
    const migrations = loadMigrationFiles();

    await ensureSchemaMigrationsTable(client);
    const appliedVersions = await getAppliedVersions(client);

    detectSchemaConflicts(appliedVersions, migrations);

    const pendingMigrations = migrations.filter(
      (migration) => !appliedVersions.has(migration.version),
    );

    if (pendingMigrations.length === 0) {
      log('✅ No pending PostgreSQL migrations found.');
      return;
    }

    log(`📦 Pending migrations: ${pendingMigrations.map((m) => m.file).join(', ')}`);

    for (const migration of pendingMigrations) {
      validateBackwardCompatibility(migration.sql, migration.version);
      const rollbackStatements = buildRollbackStatements(migration.sql);
      writeRollbackScript(migration.version, migration.file, rollbackStatements);
      await applyMigration(client, migration, { dryRun });
    }
  } finally {
    client.release();
    await pool.end();
  }
}

async function runNeo4jConstraints() {
  log('🔄 Running Neo4j constraints...');

  const driver = neo4j.driver(
    NEO4J_URI,
    neo4j.auth.basic(NEO4J_USER, NEO4J_PASSWORD),
  );

  const session = driver.session();

  try {
    // Read constraints file
    const constraintsPath = path.join(
      __dirname,
      '..',
      'migrations',
      'neo4j_constraints.cypher',
    );
    const constraints = fs.readFileSync(constraintsPath, 'utf8');

    // Split by lines and filter out comments/empty lines
    const statements = constraints
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('//'))
      .join('\n')
      .split(';')
      .map((stmt) => stmt.trim())
      .filter((stmt) => stmt);

    // Execute each constraint/index
    for (const statement of statements) {
      try {
        await session.run(statement);
        log(`✅ Neo4j: ${statement.split('\n')[0]}`);
      } catch (error) {
        if (error.message.includes('already exists')) {
          log(`⚠️  Neo4j: ${statement.split('\n')[0]} (already exists)`);
        } else {
          log(`❌ Neo4j statement failed: ${statement}`);
          log(`Error: ${error.message}`);
          throw error;
        }
      }
    }

    log('✅ Neo4j constraints and indexes applied successfully');
  } finally {
    await session.close();
    await driver.close();
  }
}

async function testConnections() {
  log('🧪 Testing database connections...');

  // Test PostgreSQL
  try {
    const pool = new Pool({ connectionString: POSTGRES_URL });
    const client = await pool.connect();
    const result = await client.query(
      'SELECT NOW() as current_time, version()',
    );
    log('✅ PostgreSQL connection established');
    log(
      `⏱️  Time: ${result.rows[0].current_time}, Version: ${result.rows[0].version.split(' ')[0]} ${result.rows[0].version.split(' ')[1]}`,
    );
    client.release();
    await pool.end();
  } catch (error) {
    log(`❌ PostgreSQL connection failed: ${error.message}`);
    throw error;
  }

  // Test Neo4j
  try {
    const driver = neo4j.driver(
      NEO4J_URI,
      neo4j.auth.basic(NEO4J_USER, NEO4J_PASSWORD),
    );

    await driver.verifyConnectivity();

    const session = driver.session();
    const result = await session.run(
      'CALL dbms.components() YIELD name, versions, edition',
    );
    log('✅ Neo4j connection established');
    log(
      `🔢 Component: ${result.records[0].get('name')} v${result.records[0].get('versions')[0]} (${result.records[0].get('edition')})`,
    );

    await session.close();
    await driver.close();
  } catch (error) {
    log(`❌ Neo4j connection failed: ${error.message}`);
    throw error;
  }
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const skipNeo4j = process.argv.includes('--skip-neo4j');
  const rollbackOnly = process.argv.includes('--rollback-only');

  log('🚀 Starting IntelGraph persistence migration with pre-flight guardrails...');

  try {
    await testConnections();

    if (rollbackOnly) {
      const migrations = loadMigrationFiles();
      migrations.forEach((migration) => {
        validateBackwardCompatibility(migration.sql, migration.version);
        const rollbackStatements = buildRollbackStatements(migration.sql);
        writeRollbackScript(migration.version, migration.file, rollbackStatements);
      });
      log('🛡️  Rollback scripts generated without applying migrations.');
    } else {
      await runPostgresMigrations({ dryRun });
    }

    if (!skipNeo4j) {
      await runNeo4jConstraints();
    } else {
      log('⏭️  Skipping Neo4j constraints as requested.');
    }

    log('🎉 Migration workflow completed.');
  } catch (error) {
    log(`\n💥 Migration failed: ${error.message}`);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = {
  runPostgresMigrations,
  runNeo4jConstraints,
  testConnections,
  loadMigrationFiles,
  detectSchemaConflicts,
  validateBackwardCompatibility,
  buildRollbackStatements,
};
