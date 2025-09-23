import { OsintSourcesRepo } from "../src/osint/db/sourcesRepo";
import { Pool } from "pg";

const url = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;

const itif = (url ? it : it.skip);

describe('OsintSourcesRepo', () => {
  itif('create, list, get, update, remove', async () => {
    const pool = new Pool({ connectionString: url });
    const repo = new OsintSourcesRepo(pool);
    await repo.ensure();

    const created = await repo.create({ name: 'Demo RSS', kind: 'RSS', url: 'https://example.com/rss', licenseId: null as any, rateLimitPerMin: 60, tags: ['demo'] });
    expect(created.id).toBeTruthy();

    const fetched = await repo.get(created.id);
    expect(fetched?.name).toBe('Demo RSS');

    const list = await repo.list({ search: 'Demo' });
    expect(list.find(s => s.id === created.id)).toBeTruthy();

    const updated = await repo.update(created.id, { enabled: false });
    expect(updated?.enabled).toBe(false);

    const removed = await repo.remove(created.id);
    expect(removed).toBe(true);

    await pool.end();
  });
});

