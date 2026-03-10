import test from 'node:test';
import assert from 'node:assert';
import { LedgerStore } from '../../server/src/ledger/store.js';
import { LedgerAdapter } from '../../server/src/agents/runtime/ledger-adapter.js';
import { StatusMapProjection } from '../../server/src/ledger/projections/status-map.js';
import { PolicyViewProjection } from '../../server/src/ledger/projections/policy-view.js';
import { LedgerMetricsGenerator } from '../../server/src/observability/ledger-metrics.js';

test('Execution Ledger Contracts', async (t) => {
    let store: LedgerStore;
    let adapter: LedgerAdapter;

    t.beforeEach(() => {
        store = new LedgerStore('artifacts/ledger/test-event-log.ndjson');
        store.clear();
        adapter = new LedgerAdapter(store);
        process.env.DETERMINISTIC_TIME = '2026-03-06T00:00:00Z';
    });

    t.afterEach(() => {
        store.clear();
    });

    await t.test('should generate valid events', () => {
        const evt = adapter.recordEvent('w-123', 'workflow.started', { msg: 'test' });
        assert.strictEqual(evt.workflow_id, 'w-123');
        assert.strictEqual(evt.type, 'workflow.started');
        assert.strictEqual(evt.seq, 1);
        assert.match(evt.evidence_id, /^LEDGER:w-123:1$/);
    });

    await t.test('should correctly project status map', () => {
        adapter.recordEvent('w-1', 'workflow.started', {});
        adapter.recordEvent('w-1', 'step.started', {}, 's-1');
        adapter.recordEvent('w-1', 'step.succeeded', {}, 's-1');

        const proj = new StatusMapProjection();
        const state = proj.build(store.getEvents());

        assert.strictEqual(state['w-1'].status, 'in_progress'); // We didn't do workflow.completed
        assert.ok(state['w-1'].completed_steps.includes('s-1'));
    });

    await t.test('should correctly build policy view', () => {
        adapter.recordEvent('w-2', 'policy.allowed', { action: 'read-db' });
        adapter.recordEvent('w-2', 'policy.denied', { action: 'write-db' });

        const proj = new PolicyViewProjection();
        const view = proj.build(store.getEvents());

        assert.strictEqual(view.length, 2);
        assert.strictEqual(view[0].decision, 'allowed');
        assert.strictEqual(view[1].decision, 'denied');
    });

    await t.test('should calculate accurate metrics', () => {
        adapter.recordEvent('w-3', 'step.started', {}, 's-1');
        adapter.recordEvent('w-3', 'step.succeeded', {}, 's-1');
        adapter.recordEvent('w-3', 'step.started', {}, 's-2');
        adapter.recordEvent('w-3', 'step.failed', {}, 's-2');

        const generator = new LedgerMetricsGenerator();
        const metrics = generator.generate(store.getEvents());

        assert.strictEqual(metrics['w-3'].total_steps, 2);
        assert.strictEqual(metrics['w-3'].failed_steps, 1);
        assert.strictEqual(metrics['w-3'].succeeded_steps, 1);
    });

    await t.test('should redact secrets from payload', () => {
        const evt = adapter.recordEvent('w-secret', 'tool.called', { secret_key: 'super-secret' });
        assert.strictEqual(evt.payload.secret_key, '[REDACTED]');
    });
});
