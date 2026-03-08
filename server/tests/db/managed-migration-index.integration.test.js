"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const fs_1 = __importDefault(require("fs"));
const os_1 = __importDefault(require("os"));
const path_1 = __importDefault(require("path"));
const pg_1 = require("pg");
const indexing_js_1 = require("../../src/db/migrations/indexing.js");
const versioning_js_1 = require("../../src/db/migrations/versioning.js");
// testcontainers typings expect NodeNext resolution; fall back to require to keep Jest CommonJS happy
// eslint-disable-next-line @typescript-eslint/no-var-requires
let GenericContainer;
let containerImportError = null;
try {
    ({ GenericContainer } = require('testcontainers'));
}
catch (error) {
    containerImportError = error;
    GenericContainer = null;
}
const maybe = GenericContainer ? globals_1.describe : globals_1.describe.skip;
maybe('MigrationManager concurrent index support', () => {
    globals_1.jest.setTimeout(120000);
    let container;
    let startError = containerImportError;
    let tempDir;
    let migrationsDir;
    let seedsDir;
    let pool;
    let indexName;
    let originalPostgresUrl;
    let originalFlag;
    (0, globals_1.beforeAll)(async () => {
        if (!GenericContainer) {
            return;
        }
        originalPostgresUrl = process.env.POSTGRES_URL;
        originalFlag = process.env.INDEX_CONCURRENT;
        try {
            container = await new GenericContainer('postgres:15-alpine')
                .withEnv('POSTGRES_PASSWORD', 'postgres')
                .withEnv('POSTGRES_USER', 'postgres')
                .withEnv('POSTGRES_DB', 'postgres')
                .withExposedPorts(5432)
                .start();
        }
        catch (error) {
            startError = error;
            return;
        }
        const connectionString = `postgres://postgres:postgres@${container.getHost()}:${container.getMappedPort(5432)}/postgres`;
        process.env.POSTGRES_URL = connectionString;
        process.env.INDEX_CONCURRENT = '1';
        pool = new pg_1.Pool({ connectionString });
        tempDir = fs_1.default.mkdtempSync(path_1.default.join(os_1.default.tmpdir(), 'managed-migrations-'));
        migrationsDir = path_1.default.join(tempDir, 'migrations');
        seedsDir = path_1.default.join(tempDir, 'seeds');
        fs_1.default.mkdirSync(migrationsDir, { recursive: true });
        fs_1.default.mkdirSync(seedsDir, { recursive: true });
        const indexSql = (0, indexing_js_1.buildCreateIndexSql)({
            tableName: 'demo_items',
            columns: ['tenant_id', 'created_at'],
            predicate: "active = true AND tenant_id = 'tenant-1'",
            concurrently: true,
        });
        const dropSql = (0, indexing_js_1.buildDropIndexSql)({
            indexName: indexSql.name,
            concurrently: true,
        });
        indexName = indexSql.name;
        const upSql = `
CREATE TABLE IF NOT EXISTS demo_items (
  id SERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  active BOOLEAN DEFAULT true
);
${indexSql.sql};
`;
        const downSql = `
${dropSql.sql};
DROP TABLE IF EXISTS demo_items;
`;
        fs_1.default.writeFileSync(path_1.default.join(migrationsDir, '202610010101_concurrent_index.up.sql'), upSql);
        fs_1.default.writeFileSync(path_1.default.join(migrationsDir, '202610010101_concurrent_index.down.sql'), downSql);
    });
    (0, globals_1.afterAll)(async () => {
        process.env.POSTGRES_URL = originalPostgresUrl;
        process.env.INDEX_CONCURRENT = originalFlag;
        if (pool)
            await pool.end();
        if (container)
            await container.stop();
        if (tempDir)
            fs_1.default.rmSync(tempDir, { recursive: true, force: true });
    });
    (0, globals_1.it)('applies migrations and records concurrent index builds', async () => {
        if (startError) {
            console.warn('Skipping concurrent index integration test:', startError.message);
            return;
        }
        const manager = new versioning_js_1.MigrationManager({
            migrationsDir,
            seedsDir,
            pool,
        });
        await manager.migrate();
        const indexes = await pool.query(`SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'demo_items'`);
        const createdIndex = indexes.rows.find((row) => row.indexname === indexName);
        (0, globals_1.expect)(createdIndex).toBeDefined();
        (0, globals_1.expect)(createdIndex?.indexdef).toContain('WHERE (active = true');
        const history = await pool.query(`SELECT status, attempts, concurrently FROM index_build_history WHERE index_name = $1`, [indexName]);
        (0, globals_1.expect)(history.rows[0]).toMatchObject({
            status: 'succeeded',
            concurrently: true,
        });
        (0, globals_1.expect)(history.rows[0].attempts).toBeGreaterThanOrEqual(1);
    });
});
