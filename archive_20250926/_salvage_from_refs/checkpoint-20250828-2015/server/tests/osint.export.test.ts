import { Pool } from 'pg';
import { OsintExporter } from '../src/osint/export/exporter';

const url = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;
const itif = (url ? it : it.skip);

describe('Osint export allow/deny', () => {
  itif('allows export when all docs allowExport=true', async () => {
    const pool = new Pool({ connectionString: url });
    await pool.query(`CREATE TABLE IF NOT EXISTS osint_documents (hash TEXT PRIMARY KEY, title TEXT, summary TEXT, url TEXT, language TEXT, published_at TIMESTAMPTZ, license JSONB, policy JSONB)`);
    const hash = 'h-allow-' + Date.now();
    await pool.query(`INSERT INTO osint_documents(hash,title,license,policy) VALUES($1,$2,$3,$4) ON CONFLICT (hash) DO UPDATE SET title=excluded.title, license=excluded.license, policy=excluded.policy`, [hash, 'ok', { allowExport: true }, {}]);
    const exp = new OsintExporter(pool);
    const out = await exp.export([hash], 'JSON');
    expect(out.id).toMatch(/\.json$/);
    await pool.end();
  });

  itif('denies export when any doc allowExport=false', async () => {
    const pool = new Pool({ connectionString: url });
    await pool.query(`CREATE TABLE IF NOT EXISTS osint_documents (hash TEXT PRIMARY KEY, title TEXT, summary TEXT, url TEXT, language TEXT, published_at TIMESTAMPTZ, license JSONB, policy JSONB)`);
    const hash = 'h-deny-' + Date.now();
    await pool.query(`INSERT INTO osint_documents(hash,title,license,policy) VALUES($1,$2,$3,$4) ON CONFLICT (hash) DO UPDATE SET title=excluded.title, license=excluded.license, policy=excluded.policy`, [hash, 'no', { allowExport: false }, {}]);
    const exp = new OsintExporter(pool);
    await expect(exp.export([hash], 'JSON')).rejects.toHaveProperty('code', 'LICENSE_DENIED');
    await pool.end();
  });
});

