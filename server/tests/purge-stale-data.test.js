"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const purgeStaleData_js_1 = require("../src/jobs/purgeStaleData.js");
class RecordingClient {
    selectRows;
    calls = [];
    constructor(selectRows) {
        this.selectRows = selectRows;
    }
    async query(config) {
        const normalized = typeof config === 'string' ? { text: config } : config;
        this.calls.push(normalized);
        if (normalized.text?.toUpperCase().startsWith('SELECT')) {
            return { rows: this.selectRows, rowCount: this.selectRows.length };
        }
        if (normalized.text?.toUpperCase().startsWith('UPDATE')) {
            const values = normalized.values ?? [];
            const ids = values[values.length - 1];
            return { rows: [], rowCount: Array.isArray(ids) ? ids.length : 0 };
        }
        const ids = normalized.values?.[0] ?? [];
        return { rows: [], rowCount: ids.length };
    }
}
(0, globals_1.describe)('buildCandidateQuery', () => {
    (0, globals_1.it)('applies expiry, retention, and batch limits defensively', () => {
        const target = {
            name: 'audit-logs',
            table: 'audit_logs',
            idColumn: 'id',
            timestampColumn: 'timestamp',
            expiresColumn: 'retention_expires_at',
            retentionDays: 90,
            action: 'delete',
        };
        const now = new Date('2025-01-01T00:00:00Z');
        const query = (0, purgeStaleData_js_1.buildCandidateQuery)(target, now, 50);
        (0, globals_1.expect)(query.text).toContain('retention_expires_at');
        (0, globals_1.expect)(query.text).toContain('timestamp');
        (0, globals_1.expect)(query.values?.[0]).toEqual(now);
        (0, globals_1.expect)(query.values?.[1]).toEqual(new Date('2024-10-03T00:00:00.000Z'));
        (0, globals_1.expect)(query.values?.[2]).toBe(50);
    });
});
(0, globals_1.describe)('purgeTarget', () => {
    (0, globals_1.it)('returns a dry-run summary without mutating data', async () => {
        const client = new RecordingClient([{ id: 'a-1' }, { id: 'a-2' }]);
        const target = {
            name: 'copilot-events',
            table: 'copilot_events',
            idColumn: 'id',
            timestampColumn: 'created_at',
            expiresColumn: 'expires_at',
            retentionDays: 30,
            action: 'delete',
        };
        const result = await (0, purgeStaleData_js_1.purgeTarget)(client, target, {
            dryRun: true,
            now: new Date('2025-02-01T00:00:00Z'),
            maxBatchSize: 10,
        });
        (0, globals_1.expect)(result.dryRun).toBe(true);
        (0, globals_1.expect)(result.matched).toBe(2);
        (0, globals_1.expect)(client.calls).toHaveLength(1);
        (0, globals_1.expect)(client.calls[0].text).toContain('SELECT');
    });
    (0, globals_1.it)('anonymizes eligible runs when retention has elapsed', async () => {
        const client = new RecordingClient([{ id: 'run-1' }, { id: 'run-2' }]);
        const target = {
            name: 'copilot-runs-metadata',
            table: 'copilot_runs',
            idColumn: 'id',
            timestampColumn: 'finished_at',
            retentionDays: 180,
            predicate: "status IN ('succeeded', 'failed', 'paused')",
            action: 'anonymize',
            anonymize: {
                goal_text: '[anonymized after retention]',
                plan: {},
                metadata: {},
            },
        };
        const result = await (0, purgeStaleData_js_1.purgeTarget)(client, target, {
            dryRun: false,
            now: new Date('2025-06-01T00:00:00Z'),
            maxBatchSize: 25,
        });
        (0, globals_1.expect)(result.anonymized).toBe(2);
        (0, globals_1.expect)(client.calls).toHaveLength(2);
        const updateCall = client.calls.find((call) => call.text?.startsWith('UPDATE'));
        (0, globals_1.expect)(updateCall?.values?.slice(0, 3)).toEqual([
            '[anonymized after retention]',
            {},
            {},
        ]);
        (0, globals_1.expect)(updateCall?.values?.[3]).toEqual(['run-1', 'run-2']);
    });
});
