"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const node_crypto_1 = require("node:crypto");
const pg_1 = require("pg");
const connection_js_1 = require("../src/db/connection.js");
const harnessEnabled = process.env.RUN_ER_LOCK_HARNESS === 'true';
const connectionString = process.env.ER_HARNESS_DB_URL ?? process.env.DATABASE_URL;
const describeHarness = harnessEnabled && connectionString ? globals_1.describe : globals_1.describe.skip;
describeHarness('Identity cluster lock contention harness', () => {
    const iterations = Number(process.env.ER_HARNESS_ITERATIONS ?? 5);
    const workerRings = Math.max(1, Number(process.env.ER_HARNESS_WORKERS ?? 3));
    const envMode = (process.env.ER_HARNESS_MODE ?? '').toLowerCase();
    const mode = envMode === 'legacy' ? 'legacy' : 'ordered';
    let adminClient;
    let db;
    (0, globals_1.beforeAll)(async () => {
        adminClient = new pg_1.Client({ connectionString: connectionString });
        await adminClient.connect();
        await ensureSchema(adminClient);
        db = (0, connection_js_1.initializeDatabase)(parseDbConfig(connectionString));
        await db.initialize();
    });
    (0, globals_1.beforeEach)(async () => {
        await resetData(adminClient);
    });
    (0, globals_1.afterAll)(async () => {
        await db?.close();
        await adminClient?.end();
    });
    (0, globals_1.it)('exercises merge-style transactions under contention and captures lock graphs on failure', async () => {
        const deadlocks = [];
        for (let i = 0; i < iterations; i++) {
            const rings = await Promise.all(Array.from({ length: workerRings }, async () => {
                const ids = [(0, node_crypto_1.randomUUID)(), (0, node_crypto_1.randomUUID)(), (0, node_crypto_1.randomUUID)()];
                await seedClusterRing(adminClient, ids);
                return ids;
            }));
            const tasks = rings.flatMap(([a, b, c]) => [
                runMergeSimulation(a, b, mode),
                runMergeSimulation(b, c, mode),
                runMergeSimulation(c, a, mode),
            ]);
            const results = await Promise.allSettled(tasks);
            for (const result of results) {
                if (result.status === 'rejected') {
                    const errorMessage = result.reason instanceof Error ? result.reason.message : String(result.reason);
                    const snapshot = await captureLockSnapshot(adminClient);
                    deadlocks.push({ iteration: i, error: errorMessage, snapshot });
                }
            }
        }
        if (mode === 'legacy') {
            (0, globals_1.expect)(deadlocks.length).toBeGreaterThan(0);
        }
        else {
            (0, globals_1.expect)(deadlocks).toHaveLength(0);
        }
        if (deadlocks.length > 0) {
            // eslint-disable-next-line no-console
            console.warn('Lock contention harness captured events', deadlocks[0]);
        }
    });
});
function parseDbConfig(url) {
    const parsed = new URL(url);
    return {
        host: parsed.hostname,
        port: Number(parsed.port || 5432),
        database: parsed.pathname.replace('/', ''),
        user: parsed.username,
        password: decodeURIComponent(parsed.password),
        maxConnections: 10,
    };
}
async function ensureSchema(client) {
    await client.query(`
    CREATE TABLE IF NOT EXISTS er_identity_clusters (
      cluster_id UUID PRIMARY KEY,
      tenant_id VARCHAR(255) NOT NULL,
      entity_type VARCHAR(50) NOT NULL,
      node_ids JSONB NOT NULL DEFAULT '[]',
      primary_node_id UUID NOT NULL,
      canonical_attributes JSONB NOT NULL DEFAULT '[]',
      edges JSONB NOT NULL DEFAULT '[]',
      cohesion_score FLOAT8 NOT NULL DEFAULT 0.5,
      confidence FLOAT8 NOT NULL DEFAULT 0.5,
      merge_history JSONB NOT NULL DEFAULT '[]',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      version INTEGER NOT NULL DEFAULT 1,
      locked BOOLEAN NOT NULL DEFAULT FALSE,
      locked_by VARCHAR(255),
      locked_at TIMESTAMPTZ,
      locked_reason TEXT
    );

    CREATE TABLE IF NOT EXISTS er_identity_nodes (
      node_id UUID PRIMARY KEY,
      cluster_id UUID,
      tenant_id VARCHAR(255) NOT NULL,
      entity_type VARCHAR(50) NOT NULL,
      attributes JSONB NOT NULL DEFAULT '{}',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_er_identity_clusters_node_ids ON er_identity_clusters USING GIN(node_ids jsonb_path_ops);
    CREATE INDEX IF NOT EXISTS idx_er_identity_nodes_cluster_id ON er_identity_nodes(cluster_id);
  `);
}
async function resetData(client) {
    await client.query('TRUNCATE er_identity_nodes, er_identity_clusters RESTART IDENTITY');
}
async function seedClusterRing(client, ids) {
    const [a, b, c] = ids;
    const rows = [
        [a, ['a1', 'a2']],
        [b, ['b1', 'b2']],
        [c, ['c1', 'c2']],
    ];
    for (const [clusterId, nodeIds] of rows) {
        await client.query(`INSERT INTO er_identity_clusters (
        cluster_id, tenant_id, entity_type, node_ids, primary_node_id,
        canonical_attributes, edges, merge_history, cohesion_score, confidence
      ) VALUES ($1, $2, $3, $4, $5, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, 0.5, 0.5)
      ON CONFLICT (cluster_id) DO NOTHING`, [clusterId, 'tenant-harness', 'Person', JSON.stringify(nodeIds), nodeIds[0]]);
    }
}
async function runMergeSimulation(targetId, sourceId, mode) {
    const db = (0, connection_js_1.getDatabase)();
    await db.transaction(async (client) => {
        if (mode === 'legacy') {
            await client.query(`SELECT cluster_id FROM er_identity_clusters WHERE cluster_id = $1 FOR UPDATE`, [targetId]);
            await client.query('SELECT pg_sleep(0.02)');
            await client.query(`SELECT cluster_id FROM er_identity_clusters WHERE cluster_id = $1 FOR UPDATE`, [sourceId]);
        }
        else {
            const ordered = [targetId, sourceId].sort();
            await client.query(`SELECT cluster_id FROM er_identity_clusters
         WHERE cluster_id = ANY($1)
         ORDER BY cluster_id
         FOR UPDATE`, [ordered]);
        }
        await client.query(`UPDATE er_identity_clusters
       SET updated_at = NOW(), version = version + 1
       WHERE cluster_id = ANY($1)`, [[targetId, sourceId]]);
    });
}
async function captureLockSnapshot(client) {
    const { rows } = await client.query(`
    SELECT
      l.pid,
      l.relation::regclass::text AS relation,
      l.mode,
      l.granted,
      a.wait_event_type AS "waitEventType",
      a.wait_event AS "waitEvent",
      COALESCE(pg_blocking_pids(l.pid), '{}') AS "blockingPids",
      a.query
    FROM pg_locks l
    LEFT JOIN pg_stat_activity a ON l.pid = a.pid
    WHERE a.datname = current_database()
    ORDER BY l.pid;
  `);
    return rows;
}
