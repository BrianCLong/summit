"use strict";
/**
 * Data Factory Service - Database Migration Runner
 *
 * Runs SQL migrations in order and tracks which have been applied.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runMigrations = runMigrations;
exports.rollbackMigration = rollbackMigration;
exports.getMigrationStatus = getMigrationStatus;
const promises_1 = require("fs/promises");
const path_1 = require("path");
const url_1 = require("url");
const pino_1 = __importDefault(require("pino"));
const connection_js_1 = require("./connection.js");
const __filename = (0, url_1.fileURLToPath)(import.meta.url);
const __dirname = (0, path_1.dirname)(__filename);
const logger = (0, pino_1.default)({
    name: 'data-factory-migrate',
    level: process.env.LOG_LEVEL || 'info',
});
const MIGRATIONS_DIR = (0, path_1.join)(__dirname, '../../migrations');
async function ensureMigrationsTable() {
    await (0, connection_js_1.query)(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) UNIQUE NOT NULL,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}
async function getAppliedMigrations() {
    const result = await (0, connection_js_1.query)('SELECT name FROM _migrations ORDER BY id');
    return new Set(result.rows.map((row) => row.name));
}
async function getMigrationFiles() {
    const files = await (0, promises_1.readdir)(MIGRATIONS_DIR);
    return files
        .filter((f) => f.endsWith('.sql'))
        .sort((a, b) => {
        const numA = parseInt(a.split('_')[0], 10);
        const numB = parseInt(b.split('_')[0], 10);
        return numA - numB;
    });
}
async function applyMigration(client, filename) {
    const filepath = (0, path_1.join)(MIGRATIONS_DIR, filename);
    const sql = await (0, promises_1.readFile)(filepath, 'utf-8');
    logger.info({ migration: filename }, 'Applying migration');
    await client.query(sql);
    await client.query('INSERT INTO _migrations (name) VALUES ($1)', [filename]);
    logger.info({ migration: filename }, 'Migration applied successfully');
}
async function runMigrations() {
    (0, connection_js_1.createPool)();
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
            await (0, connection_js_1.transaction)(async (client) => {
                await applyMigration(client, file);
            });
        }
        logger.info('All migrations applied successfully');
    }
    catch (error) {
        logger.error({ error }, 'Migration failed');
        throw error;
    }
    finally {
        await (0, connection_js_1.closePool)();
    }
}
async function rollbackMigration(migrationName) {
    (0, connection_js_1.createPool)();
    try {
        const applied = await getAppliedMigrations();
        if (!applied.has(migrationName)) {
            logger.warn({ migration: migrationName }, 'Migration not found in applied list');
            return;
        }
        await (0, connection_js_1.transaction)(async (client) => {
            // Look for a rollback file
            const rollbackFile = migrationName.replace('.sql', '_rollback.sql');
            const rollbackPath = (0, path_1.join)(MIGRATIONS_DIR, rollbackFile);
            try {
                const sql = await (0, promises_1.readFile)(rollbackPath, 'utf-8');
                logger.info({ migration: migrationName }, 'Rolling back migration');
                await client.query(sql);
                await client.query('DELETE FROM _migrations WHERE name = $1', [migrationName]);
                logger.info({ migration: migrationName }, 'Rollback completed');
            }
            catch {
                logger.error({ migration: migrationName }, 'No rollback file found');
                throw new Error(`No rollback file found for ${migrationName}`);
            }
        });
    }
    finally {
        await (0, connection_js_1.closePool)();
    }
}
async function getMigrationStatus() {
    (0, connection_js_1.createPool)();
    try {
        await ensureMigrationsTable();
        const applied = await getAppliedMigrations();
        const files = await getMigrationFiles();
        return {
            applied: files.filter((f) => applied.has(f)),
            pending: files.filter((f) => !applied.has(f)),
        };
    }
    finally {
        await (0, connection_js_1.closePool)();
    }
}
// CLI interface
const command = process.argv[2];
if (command === 'up' || !command) {
    runMigrations()
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
}
else if (command === 'status') {
    getMigrationStatus()
        .then((status) => {
        console.log('Applied migrations:', status.applied);
        console.log('Pending migrations:', status.pending);
        process.exit(0);
    })
        .catch(() => process.exit(1));
}
else if (command === 'rollback') {
    const migrationName = process.argv[3];
    if (!migrationName) {
        console.error('Usage: migrate rollback <migration_name>');
        process.exit(1);
    }
    rollbackMigration(migrationName)
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
}
else {
    console.error('Unknown command. Use: up, status, or rollback');
    process.exit(1);
}
