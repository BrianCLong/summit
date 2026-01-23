import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import {
  buildReplayEvents,
  filterReplayEvents,
  parseJsonLines,
  runSocialFixtureConnector,
  toJsonLines,
} from '../src/index.js';

const socialFixture = fileURLToPath(
  new URL('../../../test/fixtures/osint-replay/social-posts.json', import.meta.url),
);

test('filterReplayEvents filters by time, platform, entity, and language', async () => {
  const connectorRun = await runSocialFixtureConnector({
    fixturePath: socialFixture,
    source: 'fixtures/social',
    query: 'bridge',
    licensingTags: ['demo'],
    retrievalTime: '2026-01-22T10:05:00Z',
  });

  const events = buildReplayEvents({
    records: connectorRun.deterministic.records,
    provenance: connectorRun.deterministic.provenance,
  });
  const jsonl = toJsonLines(events);
  const parsed = parseJsonLines(jsonl);

  const filtered = filterReplayEvents(parsed, {
    from: '2026-01-22T10:01:00Z',
    to: '2026-01-22T10:02:00Z',
    platform: 'x',
    entity: 'bay bridge',
    language: 'en',
  });

  assert.equal(filtered.length, 1);
  assert.equal(filtered[0].platform, 'x');
  assert.equal(filtered[0].language, 'en');
});
