"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const url_1 = require("url");
const database_js_1 = require("./database.js");
const logger_js_1 = require("../utils/logger.js");
const __filename = (0, url_1.fileURLToPath)(import.meta.url);
const __dirname = path_1.default.dirname(__filename);
const MIGRATIONS_DIR = path_1.default.join(__dirname, '../../migrations');
async function getAppliedMigrations() {
    try {
        const result = await database_js_1.db.query('SELECT version FROM schema_migrations');
        return new Set(result.rows.map((r) => r.version));
    }
    catch {
        // Table doesn't exist yet
        return new Set();
    }
}
async function loadMigrations() {
    const files = fs_1.default.readdirSync(MIGRATIONS_DIR).sort();
    const migrations = [];
    for (const filename of files) {
        if (!filename.endsWith('.sql'))
            continue;
        const version = filename.replace('.sql', '');
        const filepath = path_1.default.join(MIGRATIONS_DIR, filename);
        const sql = fs_1.default.readFileSync(filepath, 'utf-8');
        migrations.push({ version, filename, sql });
    }
    return migrations;
}
async function runMigrations() {
    await database_js_1.db.connect();
    const applied = await getAppliedMigrations();
    const migrations = await loadMigrations();
    let count = 0;
    for (const migration of migrations) {
        if (applied.has(migration.version)) {
            logger_js_1.logger.debug({ version: migration.version }, 'Migration already applied');
            continue;
        }
        logger_js_1.logger.info({ version: migration.version }, 'Applying migration');
        try {
            await database_js_1.db.query(migration.sql);
            count++;
            logger_js_1.logger.info({ version: migration.version }, 'Migration applied');
        }
        catch (error) {
            logger_js_1.logger.error({ version: migration.version, error }, 'Migration failed');
            throw error;
        }
    }
    if (count === 0) {
        logger_js_1.logger.info('No new migrations to apply');
    }
    else {
        logger_js_1.logger.info({ count }, 'Migrations completed');
    }
}
async function rollbackMigration() {
    await database_js_1.db.connect();
    const result = await database_js_1.db.query('SELECT version FROM schema_migrations ORDER BY applied_at DESC LIMIT 1');
    if (result.rows.length === 0) {
        logger_js_1.logger.info('No migrations to rollback');
        return;
    }
    const version = result.rows[0].version;
    logger_js_1.logger.warn({ version }, 'Rollback not implemented - manual intervention required');
}
async function main() {
    const command = process.argv[2] || 'up';
    try {
        if (command === 'rollback') {
            await rollbackMigration();
        }
        else {
            await runMigrations();
        }
    }
    finally {
        await database_js_1.db.disconnect();
    }
}
main().catch((error) => {
    logger_js_1.logger.error({ error }, 'Migration failed');
    process.exit(1);
});
