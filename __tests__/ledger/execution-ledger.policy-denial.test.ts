import test from 'node:test';
import assert from 'node:assert';
import { LedgerStore } from '../../server/src/ledger/store.js';
import { LedgerAdapter } from '../../server/src/agents/runtime/ledger-adapter.js';
import { LedgerPolicyAdapter } from '../../server/src/policy/ledger-policy-adapter.js';
import { PolicyViewProjection } from '../../server/src/ledger/projections/policy-view.js';

test('Execution Ledger Policy Denial', async (t) => {
    await t.test('records policy denial in ledger', () => {
        const store = new LedgerStore('artifacts/ledger/policy-test.ndjson');
        store.clear();
        const adapter = new LedgerAdapter(store);
        const policyAdapter = new LedgerPolicyAdapter(adapter, 'w-policy');

        policyAdapter.recordDecision('read_sensitive_data', false, { tenant: 'test-tenant' });

        const events = store.getEvents();
        assert.strictEqual(events.length, 1);
        assert.strictEqual(events[0].type, 'policy.denied');
        assert.strictEqual(events[0].payload.action, 'read_sensitive_data');

        const proj = new PolicyViewProjection();
        const view = proj.build(events);

        assert.strictEqual(view.length, 1);
        assert.strictEqual(view[0].decision, 'denied');

        store.clear();
    });
});
