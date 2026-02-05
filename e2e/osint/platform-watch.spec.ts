import { test, expect } from '@playwright/test';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { runPlatformWatch } from '../../src/connectors/platform-watch/pipeline';
import { writeArtifacts } from '../../src/connectors/platform-watch/writeArtifacts';
import { PLATFORM_SOURCES } from '../../src/connectors/platform-watch/sources';
import { SourceDocument, SourceSpec } from '../../src/connectors/platform-watch/types';

const FIXTURES_DIR = path.join(process.cwd(), 'tests', 'platform-watch', 'fixtures');

async function fixtureFetcher(source: SourceSpec): Promise<SourceDocument> {
  const htmlPath = path.join(FIXTURES_DIR, `${source.id}.html`);
  const raw = await fs.readFile(htmlPath, 'utf8');
  return {
    source,
    fetched_at: '1970-01-01T00:00:00.000Z',
    content_type: 'text/html',
    raw,
  };
}

test('platform-watch pipeline writes artifacts', async () => {
  const date = '2026-02-05';
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'platform-watch-e2e-'));

  const { report, metrics, stamp, kg } = await runPlatformWatch({
    date,
    sources: PLATFORM_SOURCES,
    claims: [],
    fetcher: fixtureFetcher,
  });

  await writeArtifacts(tmpDir, date, { report, metrics, stamp, kg });

  const base = path.join(tmpDir, date);
  const reportJson = await fs.readFile(path.join(base, 'report.json'), 'utf8');
  const reportMd = await fs.readFile(path.join(base, 'report.md'), 'utf8');
  const stampJson = await fs.readFile(path.join(base, 'stamp.json'), 'utf8');

  expect(reportJson).toContain('platform-watch.report.v1');
  expect(reportMd).toContain('Platform Watch Report');
  expect(stampJson).toContain('platform-watch.stamp.v1');
});
