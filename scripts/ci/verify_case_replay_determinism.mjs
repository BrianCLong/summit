import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import {
  buildReplayBundle,
  buildReplayEvents,
  runSocialFixtureConnector,
  stableSort,
  stableStringify,
} from '../../packages/osint-replay/src/index.js';

const fixturePath = fileURLToPath(
  new URL('../../test/fixtures/osint-replay/social-posts.json', import.meta.url),
);

const fail = (message) => {
  console.error(`determinism-gate: ${message}`);
  process.exit(1);
};

const verifyStableSort = () => {
  const sample = ['Zulu', 'Ångström', 'Alpha'];
  const sorted = stableSort(sample);
  const expected = ['Alpha', 'Zulu', 'Ångström'];
  if (stableStringify(sorted) !== stableStringify(expected)) {
    fail('stableSort output is not codepoint-stable');
  }
};

const verifyJsonOrdering = (jsonl) => {
  const lines = jsonl.trim().split(/\r?\n/);
  for (const line of lines) {
    const parsed = JSON.parse(line);
    const normalized = stableStringify(parsed);
    if (line !== normalized) {
      fail('JSONL event keys are not deterministically ordered');
    }
    if (line.includes('retrieval_time') || line.includes('generated_at')) {
      fail('non-deterministic timestamps leaked into deterministic artifacts');
    }
  }
};

const verifyStability = async () => {
  const connectorRun = await runSocialFixtureConnector({
    fixturePath,
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

  const bundleFirst = buildReplayBundle({ events: eventsFirst });
  const bundleSecond = buildReplayBundle({ events: eventsSecond });

  if (bundleFirst.jsonl !== bundleSecond.jsonl) {
    fail('case replay JSONL output changed between runs');
  }

  verifyJsonOrdering(bundleFirst.jsonl);
};

const verifyFixtureIntegrity = async () => {
  const raw = await readFile(fixturePath, 'utf8');
  if (!raw.includes('captured_at')) {
    fail('fixture missing captured_at fields');
  }
};

const run = async () => {
  verifyStableSort();
  await verifyFixtureIntegrity();
  await verifyStability();
};

run();
