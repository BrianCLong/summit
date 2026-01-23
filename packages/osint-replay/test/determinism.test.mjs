import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import {
  buildReplayEvents,
  runSocialFixtureConnector,
  stableStringify,
  toJsonLines,
} from '../src/index.js';

const socialFixture = fileURLToPath(
  new URL('../../../test/fixtures/osint-replay/social-posts.json', import.meta.url),
);

test('stableStringify orders keys deterministically', () => {
  const payload = { b: 2, a: 1 };
  assert.equal(stableStringify(payload), '{"a":1,"b":2}');
});

test('case replay output is byte-stable across runs', async () => {
  const connectorRun = await runSocialFixtureConnector({
    fixturePath: socialFixture,
    source: 'fixtures/social',
    query: 'bridge',
    licensingTags: ['demo'],
    retrievalTime: '2026-01-22T10:05:00Z',
  });

  const eventsFirst = buildReplayEvents({
    records: connectorRun.deterministic.records,
    provenance: connectorRun.deterministic.provenance,
  });
  const eventsSecond = buildReplayEvents({
    records: connectorRun.deterministic.records,
    provenance: connectorRun.deterministic.provenance,
  });

  const jsonlFirst = toJsonLines(eventsFirst);
  const jsonlSecond = toJsonLines(eventsSecond);

  assert.equal(jsonlFirst, jsonlSecond);
});
