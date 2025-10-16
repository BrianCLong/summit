import test from 'node:test';
import assert from 'node:assert/strict';

import { InMemoryLedger, buildEvidencePayload } from '../src/index.js';

test('ledger records entries with deterministic signature', () => {
  const ledger = new InMemoryLedger();
  const payload = buildEvidencePayload({
    tenant: 'acme',
    caseId: 'case1',
    environment: 'staging',
    operation: 'plan',
    request: { objective: 'test' },
    policy: { version: '1' },
    decision: { model: 'mixtral' },
    model: { id: 'mixtral-8x22b-instruct' },
    cost: { usd: 0, tokensIn: 10, tokensOut: 20 },
    output: { summary: 'ok' },
  });
  const recorded = ledger.record(payload);
  assert.ok(recorded.id);
  assert.ok(recorded.signature.startsWith('stub-signature:'));
  const fetched = ledger.get(recorded.id);
  assert.deepEqual(fetched, recorded);
  assert.equal(ledger.list(1)[0].id, recorded.id);
});
