import fs from 'fs/promises';
import path from 'path';
import { runPlatformWatch } from '../../src/connectors/platform-watch/pipeline';
import { stableStringify } from '../../src/connectors/platform-watch/stableJson';
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

describe('platform-watch determinism', () => {
  it('produces stable outputs for identical inputs', async () => {
    const date = '2026-02-05';
    const runA = await runPlatformWatch({
      date,
      sources: PLATFORM_SOURCES,
      claims: [],
      fetcher: fixtureFetcher,
    });

    const runB = await runPlatformWatch({
      date,
      sources: PLATFORM_SOURCES,
      claims: [],
      fetcher: fixtureFetcher,
    });

    expect(stableStringify(runA.report)).toBe(stableStringify(runB.report));
    expect(stableStringify(runA.metrics)).toBe(stableStringify(runB.metrics));
    expect(stableStringify(runA.stamp)).toBe(stableStringify(runB.stamp));
    expect(stableStringify(runA.kg)).toBe(stableStringify(runB.kg));
  });

  it('avoids timestamp fields in report artifacts', async () => {
    const date = '2026-02-05';
    const run = await runPlatformWatch({
      date,
      sources: PLATFORM_SOURCES,
      claims: [],
      fetcher: fixtureFetcher,
    });

    const serialized = stableStringify(run.report);
    expect(serialized).not.toMatch(/\\d{4}-\\d{2}-\\d{2}T\\d{2}:/);
  });
});
