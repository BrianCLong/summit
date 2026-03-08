"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const crypto_1 = __importDefault(require("crypto"));
const fs_1 = __importDefault(require("fs"));
const os_1 = __importDefault(require("os"));
const path_1 = __importDefault(require("path"));
const events_1 = require("events");
const versioning_js_1 = require("../../src/db/migrations/versioning.js");
(0, globals_1.describe)('MigrationManager', () => {
    let tempDir;
    let migrationsDir;
    let seedsDir;
    const originalPostgresUrl = process.env.POSTGRES_URL;
    (0, globals_1.beforeEach)(() => {
        process.env.POSTGRES_URL = 'postgres://example';
        tempDir = fs_1.default.mkdtempSync(path_1.default.join(os_1.default.tmpdir(), 'migrations-'));
        migrationsDir = path_1.default.join(tempDir, 'migrations');
        seedsDir = path_1.default.join(tempDir, 'seeds');
        fs_1.default.mkdirSync(migrationsDir, { recursive: true });
        fs_1.default.mkdirSync(seedsDir, { recursive: true });
    });
    (0, globals_1.afterEach)(() => {
        fs_1.default.rmSync(tempDir, { recursive: true, force: true });
        globals_1.jest.restoreAllMocks();
        process.env.POSTGRES_URL = originalPostgresUrl;
    });
    function createMockPool(appliedMigrations = [], appliedSeeds = []) {
        const queries = [];
        const client = {
            query: globals_1.jest.fn(async (sql) => {
                queries.push(sql);
                if (sql.includes('FROM migration_history')) {
                    return { rows: appliedMigrations };
                }
                if (sql.includes('FROM seed_history')) {
                    return { rows: appliedSeeds };
                }
                return { rows: [] };
            }),
            release: globals_1.jest.fn(),
        };
        const pool = {
            connect: globals_1.jest.fn(async () => client),
        };
        return { pool, client, queries };
    }
    function writeMigration(name, upSql, downSql) {
        fs_1.default.writeFileSync(path_1.default.join(migrationsDir, `${name}.up.sql`), upSql);
        fs_1.default.writeFileSync(path_1.default.join(migrationsDir, `${name}.down.sql`), downSql);
    }
    (0, globals_1.it)('applies pending migrations and seeds with tracking', async () => {
        writeMigration('202412010001_example', 'CREATE TABLE demo(id INT);', 'DROP TABLE IF EXISTS demo;');
        fs_1.default.writeFileSync(path_1.default.join(seedsDir, '202412010001_seed.sql'), 'INSERT INTO demo(id) VALUES (1);');
        const { pool, client, queries } = createMockPool();
        const manager = new versioning_js_1.MigrationManager({
            migrationsDir,
            seedsDir,
            pool,
            allowBreakingChanges: true,
        });
        await manager.migrate();
        await manager.seed();
        (0, globals_1.expect)(client.query).toHaveBeenCalled();
        (0, globals_1.expect)(queries).toEqual(globals_1.expect.arrayContaining(['BEGIN']));
        (0, globals_1.expect)(queries.join('\n')).toContain('INSERT INTO migration_history');
        (0, globals_1.expect)(queries.join('\n')).toContain('INSERT INTO seed_history');
    });
    (0, globals_1.it)('rolls back the latest migration when requested', async () => {
        const upSql = 'CREATE TABLE demo(id INT);';
        const downSql = 'DROP TABLE IF EXISTS demo;';
        writeMigration('202412010001_example', upSql, downSql);
        const checksum = crypto_1.default.createHash('sha256').update(upSql).update(downSql).digest('hex');
        const { pool, queries } = createMockPool([{ name: '202412010001_example', checksum }]);
        const manager = new versioning_js_1.MigrationManager({
            migrationsDir,
            seedsDir,
            pool,
            allowBreakingChanges: true,
        });
        await manager.rollback({ steps: 1 });
        (0, globals_1.expect)(queries).toEqual(globals_1.expect.arrayContaining(['BEGIN']));
        (0, globals_1.expect)(queries.join('\n')).toContain('rolled_back_at');
    });
    (0, globals_1.it)('guards against destructive migrations by default', () => {
        (0, globals_1.expect)(() => versioning_js_1.MigrationManager.validateOnlineSafety('DROP TABLE users;')).toThrow(/migration safety check failed/i);
    });
    (0, globals_1.it)('runs pg_dump when backing up', async () => {
        process.env.POSTGRES_URL = 'postgres://example';
        const emitter = new events_1.EventEmitter();
        const spawn = globals_1.jest.fn(() => {
            setImmediate(() => emitter.emit('exit', 0));
            return emitter;
        });
        const { pool } = createMockPool();
        const manager = new versioning_js_1.MigrationManager({
            migrationsDir,
            seedsDir,
            pool,
            spawn: spawn,
        });
        await manager.backup(path_1.default.join(tempDir, 'backup.sql'));
        (0, globals_1.expect)(spawn).toHaveBeenCalledWith('pg_dump', globals_1.expect.arrayContaining(['--file', globals_1.expect.stringContaining('backup.sql')]), globals_1.expect.anything());
    });
});
