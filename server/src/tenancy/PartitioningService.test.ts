
import { test } from 'node:test';
import assert from 'node:assert';
import { PartitioningService } from './PartitioningService.js';

test('PartitioningService', async (t) => {
    const service = new PartitioningService();

    await t.test('generates deterministic DDL for range partition', () => {
        const ddl = service.generateDDL([{
            tableName: 'audit_logs',
            column: 'created_at',
            type: 'range',
            interval: '1 month'
        }]);

        assert.strictEqual(ddl.length, 2);
        assert.ok(ddl[0].includes('CREATE OR REPLACE FUNCTION create_partitions_audit_logs'));
        assert.ok(ddl[0].includes('FOR i IN 0..5 LOOP')); // Checks determinism in template
    });

    await t.test('validates policy', () => {
        assert.throws(() => {
            service.generateDDL([{
                tableName: 'audit_logs',
                column: 'created_at',
                type: 'range'
                // missing interval
            }]);
        }, /Range partition requires interval/);
    });
});
