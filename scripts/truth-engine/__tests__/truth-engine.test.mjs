import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

import { materializeTriGraph } from '../materialize-trigraph.mjs';
import { validateWriteSet } from '../validate-writeset.mjs';

const replayFixturePath = path.resolve('scripts/truth-engine/fixtures/replay-sequence.json');
const invalidFixturePath = path.resolve('scripts/truth-engine/fixtures/invalid-writeset.json');

test('replay_as_known is deterministic and monotonic', async () => {
  const writeSets = JSON.parse(await fs.readFile(replayFixturePath, 'utf8'));

  for (const writeset of writeSets) {
    const validation = await validateWriteSet(writeset);
    assert.equal(validation.valid, true, `writeset ${writeset.writeset_id} should validate`);
  }

  const t1 = materializeTriGraph(writeSets, { asKnownAt: '2026-03-01T00:05:00Z' });
  const t1Repeat = materializeTriGraph(writeSets, { asKnownAt: '2026-03-01T00:05:00Z' });
  const t2 = materializeTriGraph(writeSets, { asKnownAt: '2026-03-01T00:07:00Z' });

  assert.equal(t1.snapshotHash, t1Repeat.snapshotHash);
  assert.equal(t1.rg.length, 0, 'insufficient NG evidence should not mutate RG at t1');
  assert.ok(t2.rg.length >= t1.rg.length, 'later replay should preserve or grow RG');
});

test('promotion_quarantine blocks insufficient evidence and records audit', async () => {
  const writeSets = JSON.parse(await fs.readFile(replayFixturePath, 'utf8'));
  const materialized = materializeTriGraph(writeSets, { asKnownAt: '2026-03-01T00:05:00Z' });

  const quarantineEvent = materialized.audit.find(
    (event) => event.promotion_id === 'promotion-001'
  );

  assert.ok(quarantineEvent, 'promotion-001 audit event should be present');
  assert.equal(quarantineEvent.decision, 'QUARANTINE');
  assert.equal(quarantineEvent.reason, 'PROMOTION_INSUFFICIENT_EVIDENCE');
  assert.equal(materialized.rg.length, 0);
});

test('validator rejects writesets with dangling evidence references', async () => {
  const writeset = JSON.parse(await fs.readFile(invalidFixturePath, 'utf8'));
  const validation = await validateWriteSet(writeset);

  assert.equal(validation.valid, false);
  assert.ok(
    validation.errors.some((error) => error.message.includes('missing from provenance.artifacts')),
    'should report evidence integrity failure'
  );
});
