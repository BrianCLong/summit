import { osintQueue } from './etl/worker';
import { OsintSourcesRepo } from './db/sourcesRepo';

export async function startOsintScheduler() {
  const repo = new OsintSourcesRepo();
  const sources = await repo.list({});
  for (const s of sources) {
    const pattern = (s as any).cron || '*/15 * * * *';
    await osintQueue.add('fetch', { source: { id: s.id, kind: s.kind, url: s.url, licenseRule: { allowIngest: true } } }, { repeat: { pattern } });
  }
}

