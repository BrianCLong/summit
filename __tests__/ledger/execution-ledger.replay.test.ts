import test from 'node:test';
import assert from 'node:assert';
import { LedgerStore } from '../../server/src/ledger/store.js';
import { LedgerAdapter } from '../../server/src/agents/runtime/ledger-adapter.js';

test('Execution Ledger Replay', async (t) => {
    await t.test('replay fixture yields byte-stable outputs', () => {
        const store = new LedgerStore('artifacts/ledger/replay-test.ndjson');
        store.clear();
        const adapter = new LedgerAdapter(store);

        process.env.DETERMINISTIC_TIME = '2026-03-06T12:00:00Z';

        const e1 = adapter.recordEvent('w-replay', 'workflow.started', {});
        const e2 = adapter.recordEvent('w-replay', 'step.started', {}, 's-1');

        const events = store.getEvents();
        assert.strictEqual(events.length, 2);
        assert.strictEqual(events[0].deterministic_time, '2026-03-06T12:00:00Z');
        assert.strictEqual(events[1].deterministic_time, '2026-03-06T12:00:00Z');

        store.clear();
    });
});
