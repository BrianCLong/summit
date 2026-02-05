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

describe('platform-watch pipeline', () => {
  it('writes deterministic artifacts for a fixed date', async () => {
    const date = '2026-02-05';
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'platform-watch-'));

    const { report, metrics, stamp, kg } = await runPlatformWatch({
      date,
      sources: PLATFORM_SOURCES,
      claims: [
        {
          id: 'ITEM:CLAIM-01',
          text: 'Maltego: No newly announced features, integrations, licensing, or pricing changes.',
          platform: 'maltego',
          evidence_refs: [],
        },
      ],
      fetcher: fixtureFetcher,
    });

    await writeArtifacts(tmpDir, date, { report, metrics, stamp, kg });

    const base = path.join(tmpDir, date);
    await expect(fs.readFile(path.join(base, 'report.json'), 'utf8')).resolves.toContain(
      'platform-watch.report.v1',
    );
    await expect(fs.readFile(path.join(base, 'report.md'), 'utf8')).resolves.toContain(
      'Platform Watch Report',
    );
    await expect(fs.readFile(path.join(base, 'stamp.json'), 'utf8')).resolves.toContain(
      'platform-watch.stamp.v1',
    );
  });
});
