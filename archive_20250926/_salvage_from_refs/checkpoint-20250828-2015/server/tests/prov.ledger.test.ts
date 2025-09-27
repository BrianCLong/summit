import { ProvLedgerRepo } from "../src/osint/db/ledger";
import { Pool } from "pg";

const url = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;
const itif = (url ? it : it.skip);

describe('ProvLedgerRepo', () => {
  itif('append creates a hash chain', async () => {
    const pool = new Pool({ connectionString: url });
    const repo = new ProvLedgerRepo(pool);
    const doc = 'hash-'+Date.now();
    const a = await repo.append(doc, 'ingest.fetch', { url: 'http://x' }, 'tester');
    const b = await repo.append(doc, 'persist.pg', {}, 'tester');
    expect(a.this_hash).toBeTruthy();
    expect(b.prev_hash).toBe(a.this_hash);
    await pool.end();
  });
});

