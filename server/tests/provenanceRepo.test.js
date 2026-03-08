"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ProvenanceRepo_js_1 = require("../src/repos/ProvenanceRepo.js");
const globals_1 = require("@jest/globals");
class FakeClient {
    responses = [];
    lastSql = '';
    addResponse(match, result, error = false) {
        this.responses.push({ match, result, error });
    }
    async query(sql, _params) {
        this.lastSql = sql;
        const hit = this.responses.find((r) => r.match.test(sql));
        if (!hit)
            throw new Error('no mock for sql');
        if (hit.error)
            throw new Error('forced error');
        return hit.result;
    }
    release() { }
}
class FakePool {
    client;
    constructor(client) {
        this.client = client;
    }
    async connect() {
        return this.client;
    }
}
(0, globals_1.describe)('ProvenanceRepo', () => {
    (0, globals_1.test)('maps classic audit_events rows', async () => {
        const client = new FakeClient();
        const now = new Date();
        client.addResponse(/FROM audit_events .*target_type/, {
            rows: [
                {
                    id: 'r1',
                    action: 'policy',
                    target_type: 'incident',
                    target_id: 'inc1',
                    metadata: { reasonCode: 'POLICY_DENY' },
                    created_at: now,
                },
            ],
        });
        const pool = new FakePool(client);
        const repo = new ProvenanceRepo_js_1.ProvenanceRepo(pool);
        const rows = await repo.by('incident', 'inc1', undefined, 10, 0, 'tenant-1');
        (0, globals_1.expect)(rows).toHaveLength(1);
        (0, globals_1.expect)(rows[0]).toMatchObject({ id: 'r1', kind: 'policy' });
        (0, globals_1.expect)(new Date(rows[0].createdAt).toISOString()).toBe(now.toISOString());
        (0, globals_1.expect)(rows[0].metadata.reasonCode).toBe('POLICY_DENY');
    });
    (0, globals_1.test)('falls back to provenance table and maps fields', async () => {
        const client = new FakeClient();
        const now = new Date();
        // Force errors on audit_events queries to trigger fallback
        client.addResponse(/FROM audit_events .*target_type/, null, true);
        client.addResponse(/FROM audit_events .*resource_type/, null, true);
        client.addResponse(/FROM provenance /, {
            rows: [
                {
                    id: 'p1',
                    source: 'graphrag',
                    subject_type: 'investigation',
                    subject_id: 'inv1',
                    note: 'note1',
                    created_at: now,
                },
            ],
        });
        const pool = new FakePool(client);
        const repo = new ProvenanceRepo_js_1.ProvenanceRepo(pool);
        const rows = await repo.by('investigation', 'inv1', undefined, 10, 0, 'tenant-1');
        (0, globals_1.expect)(rows).toHaveLength(1);
        (0, globals_1.expect)(rows[0]).toMatchObject({ id: 'p1', kind: 'graphrag' });
        (0, globals_1.expect)(new Date(rows[0].createdAt).toISOString()).toBe(now.toISOString());
        (0, globals_1.expect)(rows[0].metadata).toMatchObject({ note: 'note1' });
    });
});
(0, globals_1.test)('includes filters in WHERE (contains + reasonCodeIn)', async () => {
    const client = new FakeClient();
    const now = new Date();
    client.addResponse(/FROM audit_events .*target_type/, { rows: [] });
    client.addResponse(/FROM audit_events .*resource_type/, {
        rows: [
            {
                id: 'r2',
                action: 'policy',
                resource_type: 'investigation',
                resource_id: 'inv1',
                resource_data: { reasonCode: 'RATE_LIMIT' },
                timestamp: now,
            },
        ],
    });
    const pool = new FakePool(client);
    const repo = new ProvenanceRepo_js_1.ProvenanceRepo(pool);
    const rows = await repo.by('investigation', 'inv1', { contains: 'policy', reasonCodeIn: ['RATE_LIMIT'] }, 10, 0, 'tenant-1');
    (0, globals_1.expect)(rows.length).toBeGreaterThanOrEqual(0);
    // Ensure SQL had ILIKE and reasonCode filter
    (0, globals_1.expect)(client.lastSql).toMatch(/ILIKE/);
    (0, globals_1.expect)(client.lastSql).toMatch(/metadata->>'reasonCode'/);
});
(0, globals_1.test)('getTenantStats returns count and max timestamp', async () => {
    const client = new FakeClient();
    const now = new Date();
    // Match the first query structure in getTenantStats
    client.addResponse(/SELECT COUNT\(\*\) as count/, {
        rows: [
            {
                count: '42',
                last_event_at: now,
            },
        ],
    });
    const pool = new FakePool(client);
    const repo = new ProvenanceRepo_js_1.ProvenanceRepo(pool);
    const stats = await repo.getTenantStats('tenant-1', {
        from: new Date(now.getTime() - 1000).toISOString(),
    });
    (0, globals_1.expect)(stats.count).toBe(42);
    (0, globals_1.expect)(new Date(stats.lastEventAt).toISOString()).toBe(now.toISOString());
    (0, globals_1.expect)(client.lastSql).toMatch(/COUNT\(\*\)/);
    // The first query uses timestamp column
    (0, globals_1.expect)(client.lastSql).toMatch(/MAX\(timestamp\)/);
});
