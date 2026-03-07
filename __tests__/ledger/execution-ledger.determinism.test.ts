import test from 'node:test';
import assert from 'node:assert';
import { LedgerStore } from '../../server/src/ledger/store.js';
import { LedgerAdapter } from '../../server/src/agents/runtime/ledger-adapter.js';

test('Execution Ledger Determinism', async (t) => {
    await t.test('evidence ID increments predictably', () => {
        const store = new LedgerStore('artifacts/ledger/determinism-test.ndjson');
        store.clear();
        const adapter = new LedgerAdapter(store);

        const e1 = adapter.recordEvent('w-det', 'workflow.started', {});
        const e2 = adapter.recordEvent('w-det', 'step.started', {}, 's-1');
        const e3 = adapter.recordEvent('w-det', 'step.succeeded', {}, 's-1');

        assert.strictEqual(e1.evidence_id, 'LEDGER:w-det:1');
        assert.strictEqual(e2.evidence_id, 'LEDGER:w-det:2');
        assert.strictEqual(e3.evidence_id, 'LEDGER:w-det:3');

        store.clear();
    });
});
