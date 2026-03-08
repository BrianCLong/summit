"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const pg_1 = require("pg");
const testcontainers_1 = require("testcontainers");
const EventSourcingService_js_1 = require("../../services/EventSourcingService.js");
globals_1.jest.setTimeout(120000);
(0, globals_1.describe)('event_store partitioning', () => {
    let container;
    let pool;
    let runtimeAvailable = true;
    const tenantA = 'tenant-a';
    const tenantB = 'tenant-b';
    (0, globals_1.beforeAll)(async () => {
        try {
            container = await new testcontainers_1.GenericContainer('postgres:15-alpine')
                .withEnvironment({
                POSTGRES_DB: 'testdb',
                POSTGRES_USER: 'postgres',
                POSTGRES_PASSWORD: 'testpassword',
            })
                .withExposedPorts(5432)
                .start();
        }
        catch (error) {
            runtimeAvailable = false;
            console.warn('Skipping partitioning integration tests: container runtime unavailable', error.message);
            return;
        }
        process.env.DB_PARTITIONS_V1 = '1';
        process.env.DB_PARTITION_MONTHS_AHEAD = '1';
        process.env.DB_PARTITION_RETENTION_MONTHS = '12';
        pool = new pg_1.Pool({
            host: container.getHost(),
            port: container.getMappedPort(5432),
            user: 'postgres',
            password: 'testpassword',
            database: 'testdb',
        });
        await pool.query('CREATE EXTENSION IF NOT EXISTS pgcrypto');
        const baseSql = fs_1.default.readFileSync(path_1.default.join(__dirname, '../../../db/migrations/postgres/2025-11-20_enhanced_audit_event_sourcing.sql'), 'utf8');
        await pool.query(baseSql);
        const partitionSql = fs_1.default.readFileSync(path_1.default.join(__dirname, '../../../db/managed-migrations/202604090001_event_store_partitioning.up.sql'), 'utf8');
        await pool.query(partitionSql);
    });
    (0, globals_1.afterAll)(async () => {
        if (pool) {
            await pool.end();
        }
        if (container) {
            await container.stop();
        }
    });
    (0, globals_1.it)('dual writes to legacy + partitioned tables and auto-creates tenant buckets', async () => {
        if (!runtimeAvailable) {
            (0, globals_1.expect)(runtimeAvailable).toBe(false);
            return;
        }
        const service = new EventSourcingService_js_1.EventSourcingService(pool);
        const stored = await service.appendEvent({
            aggregateId: 'agg-1',
            aggregateType: 'case',
            eventData: { foo: 'bar' },
            eventType: 'created',
            tenantId: tenantA,
            userId: 'user-1',
        });
        const legacyCount = await pool.query('SELECT COUNT(*) FROM event_store WHERE event_id = $1', [stored.eventId]);
        const partitionCount = await pool.query('SELECT COUNT(*) FROM event_store_partitioned WHERE tenant_id = $1', [tenantA]);
        const partitions = await pool.query(`SELECT relname FROM pg_partition_tree('event_store_partitioned') WHERE level = 2 AND isleaf`);
        (0, globals_1.expect)(legacyCount.rows[0].count).toBe('1');
        (0, globals_1.expect)(partitionCount.rows[0].count).toBe('1');
        (0, globals_1.expect)(partitions.rows.some((r) => r.relname.startsWith('event_store_tenant_'))).toBe(true);
    });
    (0, globals_1.it)('routes tenant-scoped queries to matching partitions', async () => {
        if (!runtimeAvailable) {
            (0, globals_1.expect)(runtimeAvailable).toBe(false);
            return;
        }
        const service = new EventSourcingService_js_1.EventSourcingService(pool);
        await service.appendEvent({
            aggregateId: 'agg-2',
            aggregateType: 'case',
            eventData: { foo: 'baz' },
            eventType: 'updated',
            tenantId: tenantB,
            userId: 'user-2',
        });
        const explain = await pool.query(`EXPLAIN (FORMAT TEXT)
       SELECT * FROM event_store_partitioned
       WHERE tenant_id = $1 AND event_timestamp >= NOW() - INTERVAL '1 day'`, [tenantB]);
        const planText = explain.rows
            .map((r) => r['QUERY PLAN'])
            .join('\n');
        (0, globals_1.expect)(planText).toMatch(/event_store_tenant_/);
    });
    (0, globals_1.it)('exposes partition metrics and bounds', async () => {
        if (!runtimeAvailable) {
            (0, globals_1.expect)(runtimeAvailable).toBe(false);
            return;
        }
        const metrics = await pool.query(`SELECT partition_name, total_pretty, bounds
       FROM event_store_partition_metrics
       ORDER BY total_bytes DESC`);
        (0, globals_1.expect)(metrics.rowCount).toBeGreaterThan(0);
        (0, globals_1.expect)(metrics.rows[0]).toHaveProperty('bounds');
    });
});
