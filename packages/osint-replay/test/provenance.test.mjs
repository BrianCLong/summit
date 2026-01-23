import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import {
  runEnrichmentFixtureConnector,
  runSocialFixtureConnector,
} from '../src/index.js';

const socialFixture = fileURLToPath(
  new URL('../../../test/fixtures/osint-replay/social-posts.json', import.meta.url),
);
const enrichmentFixture = fileURLToPath(
  new URL('../../../test/fixtures/osint-replay/enrichment.json', import.meta.url),
);

test('connector provenance includes required metadata', async () => {
  const connectorRun = await runSocialFixtureConnector({
    fixturePath: socialFixture,
    source: 'fixtures/social',
    query: 'bridge',
    licensingTags: ['demo', 'osint'],
    retrievalTime: '2026-01-22T10:05:00Z',
  });

  const { provenance } = connectorRun.deterministic;
  assert.ok(provenance.source);
  assert.ok(provenance.query);
  assert.ok(provenance.auth_mode);
  assert.ok(Array.isArray(provenance.licensing_tags));
  assert.ok(provenance.raw_payload_hash);
  assert.ok(connectorRun.nondeterministic.retrieval_time);
});

test('enrichment connector preserves deterministic provenance data', async () => {
  const connectorRun = await runEnrichmentFixtureConnector({
    fixturePath: enrichmentFixture,
    source: 'fixtures/enrichment',
    query: 'example.com',
    licensingTags: ['demo'],
    retrievalTime: '2026-01-22T10:06:00Z',
  });

  assert.equal(connectorRun.deterministic.records[0].platform, 'enrichment');
  assert.ok(connectorRun.deterministic.provenance.raw_payload_hash);
});
